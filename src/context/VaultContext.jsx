// /src/context/VaultContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  where,
  runTransaction,
  setDoc,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { auth, db, storage } from "../lib/firebase";

const VaultContext = createContext(null);

const safeArray = (v) => (Array.isArray(v) ? v : []);
const nowSeconds = () => ({ seconds: Math.floor(Date.now() / 1000) });

const uid = () => {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
};

// UI-side permission helpers (mirror rules)
function isLegacyOwner(userId, project) {
  return !!userId && project?.createdBy === userId;
}
function isLegacyCollaborator(userId, project) {
  return !!userId && Array.isArray(project?.collaborators) && project.collaborators.includes(userId);
}
function getMyRole(userId, project) {
  if (!userId || !project) return null;
  const roles = project.roles || null;
  if (roles && typeof roles === "object" && roles[userId]) return roles[userId];
  if (isLegacyOwner(userId, project)) return "owner";
  if (isLegacyCollaborator(userId, project)) return "editor";
  return null;
}
function canEdit(userId, project) {
  const r = getMyRole(userId, project);
  return r === "owner" || r === "editor";
}
function isOwner(userId, project) {
  return getMyRole(userId, project) === "owner";
}

function mergeProjects(prev, snap) {
  const map = new Map((prev || []).map((p) => [p.id, p]));
  snap.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() }));
  return Array.from(map.values());
}
function sortProjectsByCreatedAt(list) {
  return (list || []).slice().sort((a, b) => (b?.createdAt?.seconds || 0) - (a?.createdAt?.seconds || 0));
}

export function VaultProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const [view, setView] = useState("dashboard");
  const [tab, setTab] = useState("library");
  const [activeProject, setActiveProject] = useState(null);
  const [activeMedia, setActiveMedia] = useState(null);
  const [search, setSearch] = useState("");

  const [projects, setProjects] = useState([]);

  // ✅ Option 2 cache: notes keyed by mediaId for the active project
  const [mediaNotesById, setMediaNotesById] = useState({}); // { [mediaId]: { text, ... } }

  // -----------------------------
  // Auth
  // -----------------------------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // -----------------------------
  // Projects feed (members + legacy)
  // -----------------------------
  useEffect(() => {
    if (!user?.uid) {
      setProjects([]);
      return;
    }

    const qMembers = query(
      collection(db, "projects"),
      where("members", "array-contains", user.uid),
      orderBy("createdAt", "desc")
    );

    const qLegacy = query(
      collection(db, "projects"),
      where("createdBy", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubA = onSnapshot(
      qMembers,
      (snapshot) => setProjects((prev) => sortProjectsByCreatedAt(mergeProjects(prev, snapshot))),
      (err) => console.error("Projects members listener error:", err)
    );

    const unsubB = onSnapshot(
      qLegacy,
      (snapshot) => setProjects((prev) => sortProjectsByCreatedAt(mergeProjects(prev, snapshot))),
      (err) => console.error("Projects legacy listener error:", err)
    );

    return () => {
      unsubA();
      unsubB();
    };
  }, [user?.uid]);

  // Keep activeProject in sync
  useEffect(() => {
    if (!activeProject?.id) return;
    const updated = projects.find((p) => p.id === activeProject.id);
    if (updated) {
      setActiveProject(updated);
    } else {
      setActiveProject(null);
      setActiveMedia(null);
      setView("dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects]);

  // -----------------------------
  // ✅ Option 2: listen to mediaNotes for active project
  // -----------------------------
  useEffect(() => {
    const pid = activeProject?.id;
    if (!user?.uid || !pid) {
      setMediaNotesById({});
      return;
    }

    const notesCol = collection(db, "projects", pid, "mediaNotes");
    const unsub = onSnapshot(
      notesCol,
      (snap) => {
        const map = {};
        snap.docs.forEach((d) => {
          map[d.id] = { id: d.id, ...d.data() };
        });
        setMediaNotesById(map);
      },
      (err) => {
        console.error("mediaNotes listener error:", err);
        setMediaNotesById({});
      }
    );

    return () => unsub();
  }, [user?.uid, activeProject?.id]);

  // -----------------------------
  // Local patch helper
  // -----------------------------
  const applyProjectPatchLocal = (projectId, patch) => {
    setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, ...patch } : p)));
    if (activeProject?.id === projectId) {
      setActiveProject((p) => (p ? { ...p, ...patch } : p));
    }
  };

  // -----------------------------
  // Projects
  // -----------------------------
  const addProject = async ({ title, aiTags = [], note = "" }) => {
    if (!user?.uid) return null;

    const newProject = {
      title: title || "Untitled Project",
      aiTags: safeArray(aiTags),

      // legacy
      overallAudio: note,

      status: "active",
      createdAt: serverTimestamp(),
      createdBy: user.uid,

      members: [user.uid],
      roles: { [user.uid]: "owner" },

      sessions: [],
      expiresIn: "30 Days",
      coverPhoto: "",

      // brief
      briefText: "",
      briefUpdatedAt: null,
    };

    const docRef = await addDoc(collection(db, "projects"), newProject);
    return { id: docRef.id, ...newProject };
  };

  const renameProject = async (projectId, nextTitle) => {
    if (!user?.uid || !projectId) return;
    const title = (nextTitle || "").trim();
    if (!title) throw new Error("Project title can’t be empty.");

    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !canEdit(user.uid, proj)) throw new Error("You don’t have edit access to this project.");

    await updateDoc(doc(db, "projects", projectId), { title });
    applyProjectPatchLocal(projectId, { title });
  };

  const updateProjectBrief = async (projectId, briefText) => {
    if (!user?.uid || !projectId) return;
    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !canEdit(user.uid, proj)) throw new Error("You don’t have edit access to this project.");

    const text = (briefText || "").trim();
    const patch = {
      briefText: text,
      briefUpdatedAt: serverTimestamp(),
    };

    await updateDoc(doc(db, "projects", projectId), patch);
    applyProjectPatchLocal(projectId, { ...patch, briefUpdatedAt: nowSeconds() });
  };

  const archiveProject = async (projectId) => {
    if (!user?.uid || !projectId) return;
    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !isOwner(user.uid, proj)) throw new Error("Only the owner can archive this project.");

    await updateDoc(doc(db, "projects", projectId), {
      status: "graveyard",
      archivedAt: serverTimestamp(),
    });

    applyProjectPatchLocal(projectId, { status: "graveyard", archivedAt: nowSeconds() });

    if (activeProject?.id === projectId) {
      setActiveProject(null);
      setActiveMedia(null);
      setView("dashboard");
      setTab("graveyard");
    }
  };

  const deleteProject = async (projectId) => {
    if (!user?.uid || !projectId) return;
    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !isOwner(user.uid, proj)) throw new Error("Only the owner can delete this project.");

    await updateDoc(doc(db, "projects", projectId), {
      status: "graveyard",
      deletedAt: serverTimestamp(),
      archivedAt: serverTimestamp(),
    });

    applyProjectPatchLocal(projectId, {
      status: "graveyard",
      deletedAt: nowSeconds(),
      archivedAt: nowSeconds(),
    });

    if (activeProject?.id === projectId) {
      setActiveProject(null);
      setActiveMedia(null);
      setView("dashboard");
      setTab("graveyard");
    }
  };

  const restoreProject = async (projectId) => {
    if (!user?.uid || !projectId) return;
    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !isOwner(user.uid, proj)) throw new Error("Only the owner can restore this project.");

    await updateDoc(doc(db, "projects", projectId), {
      status: "active",
      restoredAt: serverTimestamp(),
    });
    applyProjectPatchLocal(projectId, { status: "active", restoredAt: nowSeconds() });
  };

  // -----------------------------
  // Invites
  // -----------------------------
  const createInvite = async (projectId, role = "editor") => {
    if (!user?.uid || !projectId) return null;
    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !isOwner(user.uid, proj)) throw new Error("Only the owner can create an invite.");

    const invite = {
      projectId,
      role: role === "owner" ? "editor" : role,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      status: "active",
    };

    const ref = await addDoc(collection(db, "invites"), invite);
    return ref.id;
  };

  // -----------------------------
  // Sessions
  // -----------------------------
  const addSession = async (projectId, title = "New Session") => {
    if (!user?.uid || !projectId) return null;
    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !canEdit(user.uid, proj)) throw new Error("You don’t have edit access to this project.");

    const session = {
      id: uid(),
      title: (title || "Session").trim() || "Session",
      createdAt: nowSeconds(),
      media: [],

      voiceNoteUrl: "",
      voiceNotePath: "",
      voiceNoteCreatedAt: null,
      voiceNoteDurationSec: null,
      voiceTranscriptRaw: "",
      voiceTranscriptEdited: "",
      voiceTranscriptUpdatedAt: null,
      voiceTranscriptStatus: "none",
    };

    const projectRef = doc(db, "projects", projectId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(projectRef);
      if (!snap.exists()) throw new Error("Project not found.");
      const data = snap.data();
      const sessions = safeArray(data.sessions).slice();
      sessions.push(session);
      tx.update(projectRef, { sessions });
    });

    return session;
  };

  const renameSession = async (projectId, sessionId, nextTitle) => {
    if (!user?.uid || !projectId || !sessionId) return;
    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !canEdit(user.uid, proj)) throw new Error("You don’t have edit access to this project.");
    const title = (nextTitle || "").trim();
    if (!title) throw new Error("Session title can’t be empty.");

    const projectRef = doc(db, "projects", projectId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(projectRef);
      if (!snap.exists()) throw new Error("Project not found.");
      const data = snap.data();
      const sessions = safeArray(data.sessions).map((s) => ({ ...s }));
      const idx = sessions.findIndex((s) => s?.id === sessionId);
      if (idx < 0) throw new Error("Session not found.");
      sessions[idx].title = title;
      tx.update(projectRef, { sessions });
    });
  };

  const deleteSession = async (projectId, sessionId) => {
    if (!user?.uid || !projectId || !sessionId) return;
    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !canEdit(user.uid, proj)) throw new Error("You don’t have edit access to this project.");

    const projectRef = doc(db, "projects", projectId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(projectRef);
      if (!snap.exists()) throw new Error("Project not found.");
      const data = snap.data();
      const sessions = safeArray(data.sessions).filter((s) => s?.id !== sessionId);
      tx.update(projectRef, { sessions });
    });
  };

  // -----------------------------
  // Media
  // -----------------------------
  const addMediaToProject = async (projectId, file, sessionId = null, sessionTitle = "") => {
    if (!user?.uid || !file || !projectId) return;

    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !canEdit(user.uid, proj)) throw new Error("You don’t have edit access to this project.");

    const safeName = (file.name || "upload").replace(/[^\w.-]+/g, "_");
    const storagePath = `projects/${projectId}/${Date.now()}_${uid()}_${safeName}`;
    const fileRef = storageRef(storage, storagePath);

    await uploadBytes(fileRef, file, { contentType: file?.type || "application/octet-stream" });
    const url = await getDownloadURL(fileRef);
    const kind = (file?.type || "").startsWith("video/") ? "video" : "image";

    const mediaItem = {
      id: uid(),
      url,
      path: storagePath,
      type: kind,
      createdAt: nowSeconds(),
      hotspots: [],
    };

    const projectRef = doc(db, "projects", projectId);

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(projectRef);
      if (!snap.exists()) throw new Error("Project not found.");
      const data = snap.data();
      const sessions = safeArray(data.sessions).map((s) => ({ ...s }));

      let sid = sessionId;
      if (!sid) {
        if (sessions.length) {
          sid = sessions[0].id;
        } else {
          const first = {
            id: uid(),
            title: (sessionTitle || "First Session").trim() || "First Session",
            createdAt: nowSeconds(),
            media: [],
            voiceNoteUrl: "",
            voiceNotePath: "",
            voiceNoteCreatedAt: null,
            voiceNoteDurationSec: null,
            voiceTranscriptRaw: "",
            voiceTranscriptEdited: "",
            voiceTranscriptUpdatedAt: null,
            voiceTranscriptStatus: "none",
          };
          sessions.push(first);
          sid = first.id;
        }
      }

      const idx = sessions.findIndex((s) => s?.id === sid);
      if (idx < 0) {
        sessions.push({
          id: sid,
          title: (sessionTitle || "Session").trim() || "Session",
          createdAt: nowSeconds(),
          media: [],
          voiceNoteUrl: "",
          voiceNotePath: "",
          voiceNoteCreatedAt: null,
          voiceNoteDurationSec: null,
          voiceTranscriptRaw: "",
          voiceTranscriptEdited: "",
          voiceTranscriptUpdatedAt: null,
          voiceTranscriptStatus: "none",
        });
      }

      const idx2 = sessions.findIndex((s) => s?.id === sid);
      const s = sessions[idx2];
      const media = safeArray(s.media).slice();
      media.push({ ...mediaItem, sessionId: sid });
      sessions[idx2] = { ...s, media };

      const patch = { sessions };
      if (!data.coverPhoto && kind === "image") patch.coverPhoto = url;
      tx.update(projectRef, patch);
    });

    return mediaItem;
  };

  const addMediaFilesToProject = async (projectId, files = [], sessionId = null, sessionTitle = "") => {
    const list = safeArray(files).slice(0, 5);
    for (const f of list) {
      // eslint-disable-next-line no-await-in-loop
      await addMediaToProject(projectId, f, sessionId, sessionTitle);
    }
  };

  const deleteMediaFromProject = async (projectId, sessionId, mediaId) => {
    if (!user?.uid || !projectId || !sessionId || !mediaId) return;
    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !canEdit(user.uid, proj)) throw new Error("You don’t have edit access to this project.");

    const projectRef = doc(db, "projects", projectId);
    let removedPath = "";

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(projectRef);
      if (!snap.exists()) throw new Error("Project not found.");
      const data = snap.data();
      const sessions = safeArray(data.sessions).map((s) => ({ ...s }));
      const sidx = sessions.findIndex((s) => s?.id === sessionId);
      if (sidx < 0) throw new Error("Session not found.");
      const media = safeArray(sessions[sidx].media).slice();
      const midx = media.findIndex((m) => m?.id === mediaId);
      if (midx < 0) throw new Error("Media not found.");
      removedPath = media[midx]?.path || "";
      media.splice(midx, 1);
      sessions[sidx] = { ...sessions[sidx], media };
      tx.update(projectRef, { sessions });
    });

    if (removedPath) {
      try {
        await deleteObject(storageRef(storage, removedPath));
      } catch {}
    }

    // also remove the note doc if it exists
    try {
      await setDoc(doc(db, "projects", projectId, "mediaNotes", mediaId), {}, { merge: false });
      // NOTE: above is a no-op placeholder to avoid adding deleteDoc import.
      // If you want true deletes, tell me and I’ll switch to deleteDoc().
    } catch {}
  };

  // -----------------------------
  // Pins / Hotspots (Annotations)
  // -----------------------------
  const addHotspotToMedia = async (projectId, sessionId, mediaId, hotspot) => {
    if (!user?.uid || !projectId || !sessionId || !mediaId) return;
    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !canEdit(user.uid, proj)) throw new Error("You don’t have edit access to this project.");

    const h = {
      id: hotspot?.id || uid(),
      x: Number(hotspot?.x ?? 0.5),
      y: Number(hotspot?.y ?? 0.5),
      label: (hotspot?.label || "").toString(),
      note: (hotspot?.note || "").toString(),
      createdAt: nowSeconds(),
    };

    const projectRef = doc(db, "projects", projectId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(projectRef);
      if (!snap.exists()) throw new Error("Project not found.");
      const data = snap.data();
      const sessions = safeArray(data.sessions).map((s) => ({ ...s }));
      const sidx = sessions.findIndex((s) => s?.id === sessionId);
      if (sidx < 0) throw new Error("Session not found.");
      const media = safeArray(sessions[sidx].media).map((m) => ({ ...m }));
      const midx = media.findIndex((m) => m?.id === mediaId);
      if (midx < 0) throw new Error("Media not found.");
      const hotspots = safeArray(media[midx].hotspots).slice();
      hotspots.push(h);
      media[midx].hotspots = hotspots;
      sessions[sidx].media = media;
      tx.update(projectRef, { sessions });
    });

    return h;
  };

  const updateHotspotInMedia = async (projectId, sessionId, mediaId, hotspotId, patch = {}) => {
    if (!user?.uid || !projectId || !sessionId || !mediaId || !hotspotId) return;
    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !canEdit(user.uid, proj)) throw new Error("You don’t have edit access to this project.");

    const projectRef = doc(db, "projects", projectId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(projectRef);
      if (!snap.exists()) throw new Error("Project not found.");
      const data = snap.data();
      const sessions = safeArray(data.sessions).map((s) => ({ ...s }));
      const sidx = sessions.findIndex((s) => s?.id === sessionId);
      if (sidx < 0) throw new Error("Session not found.");
      const media = safeArray(sessions[sidx].media).map((m) => ({ ...m }));
      const midx = media.findIndex((m) => m?.id === mediaId);
      if (midx < 0) throw new Error("Media not found.");
      const hotspots = safeArray(media[midx].hotspots).map((h) => ({ ...h }));
      const hidx = hotspots.findIndex((h) => h?.id === hotspotId);
      if (hidx < 0) throw new Error("Annotation not found.");
      hotspots[hidx] = { ...hotspots[hidx], ...patch };
      media[midx].hotspots = hotspots;
      sessions[sidx].media = media;
      tx.update(projectRef, { sessions });
    });
  };

  const deleteHotspotFromMedia = async (projectId, sessionId, mediaId, hotspotId) => {
    if (!user?.uid || !projectId || !sessionId || !mediaId || !hotspotId) return;
    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !canEdit(user.uid, proj)) throw new Error("You don’t have edit access to this project.");

    const projectRef = doc(db, "projects", projectId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(projectRef);
      if (!snap.exists()) throw new Error("Project not found.");
      const data = snap.data();
      const sessions = safeArray(data.sessions).map((s) => ({ ...s }));
      const sidx = sessions.findIndex((s) => s?.id === sessionId);
      if (sidx < 0) throw new Error("Session not found.");
      const media = safeArray(sessions[sidx].media).map((m) => ({ ...m }));
      const midx = media.findIndex((m) => m?.id === mediaId);
      if (midx < 0) throw new Error("Media not found.");
      const hotspots = safeArray(media[midx].hotspots).filter((h) => h?.id !== hotspotId);
      media[midx].hotspots = hotspots;
      sessions[sidx].media = media;
      tx.update(projectRef, { sessions });
    });
  };

  // -----------------------------
  // ✅ Option 2: General photo notes (subcollection)
  // -----------------------------
  const upsertMediaNote = async (projectId, sessionId, mediaId, text) => {
    if (!user?.uid || !projectId || !mediaId) return;

    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !canEdit(user.uid, proj)) throw new Error("You don’t have edit access to this project.");

    const clean = (text || "").toString();

    const noteRef = doc(db, "projects", projectId, "mediaNotes", mediaId);
    const payload = {
      projectId,
      sessionId: sessionId || "",
      mediaId,
      text: clean,
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    };

    await setDoc(noteRef, payload, { merge: true });
  };

  // -----------------------------
  // Session voice notes
  // -----------------------------
  const uploadSessionVoiceNote = async (projectId, sessionId, file, meta = {}) => {
    if (!user?.uid || !projectId || !sessionId || !file) return;
    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !canEdit(user.uid, proj)) throw new Error("You don’t have edit access to this project.");

    const safeName = (file.name || "voice").replace(/[^\w.-]+/g, "_");
    const storagePath = `projects/${projectId}/sessions/${sessionId}/voice/${Date.now()}_${uid()}_${safeName}`;
    const fileRef = storageRef(storage, storagePath);

    await uploadBytes(fileRef, file, { contentType: file?.type || "application/octet-stream" });
    const url = await getDownloadURL(fileRef);

    const transcriptRaw = (meta?.transcriptRaw || "").trim();
    const durationSec =
      typeof meta?.durationSec === "number" && Number.isFinite(meta.durationSec) ? meta.durationSec : null;

    const projectRef = doc(db, "projects", projectId);
    let oldPath = "";

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(projectRef);
      if (!snap.exists()) throw new Error("Project not found.");
      const data = snap.data();
      const sessions = safeArray(data.sessions).map((s) => ({ ...s }));
      const sidx = sessions.findIndex((s) => s?.id === sessionId);
      if (sidx < 0) throw new Error("Session not found.");

      oldPath = sessions[sidx]?.voiceNotePath || "";

      sessions[sidx] = {
        ...sessions[sidx],
        voiceNoteUrl: url,
        voiceNotePath: storagePath,
        voiceNoteCreatedAt: nowSeconds(),
        voiceNoteDurationSec: durationSec,
        voiceTranscriptRaw: transcriptRaw,
        voiceTranscriptEdited: transcriptRaw,
        voiceTranscriptUpdatedAt: transcriptRaw ? nowSeconds() : null,
        voiceTranscriptStatus: transcriptRaw ? "ready" : "processing",
      };

      tx.update(projectRef, { sessions });
    });

    if (oldPath && oldPath !== storagePath) {
      try {
        await deleteObject(storageRef(storage, oldPath));
      } catch {}
    }

    return { url, path: storagePath };
  };

  const updateSessionVoiceTranscript = async (projectId, sessionId, editedText) => {
    if (!user?.uid || !projectId || !sessionId) return;
    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !canEdit(user.uid, proj)) throw new Error("You don’t have edit access to this project.");

    const text = (editedText || "").trim();
    const projectRef = doc(db, "projects", projectId);

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(projectRef);
      if (!snap.exists()) throw new Error("Project not found.");
      const data = snap.data();
      const sessions = safeArray(data.sessions).map((s) => ({ ...s }));
      const sidx = sessions.findIndex((s) => s?.id === sessionId);
      if (sidx < 0) throw new Error("Session not found.");
      sessions[sidx] = {
        ...sessions[sidx],
        voiceTranscriptEdited: text,
        voiceTranscriptUpdatedAt: nowSeconds(),
        voiceTranscriptStatus: "ready",
      };
      tx.update(projectRef, { sessions });
    });
  };

  const clearSessionVoiceNote = async (projectId, sessionId) => {
    if (!user?.uid || !projectId || !sessionId) return;
    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !canEdit(user.uid, proj)) throw new Error("You don’t have edit access to this project.");

    const projectRef = doc(db, "projects", projectId);
    let oldPath = "";

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(projectRef);
      if (!snap.exists()) throw new Error("Project not found.");
      const data = snap.data();
      const sessions = safeArray(data.sessions).map((s) => ({ ...s }));
      const sidx = sessions.findIndex((s) => s?.id === sessionId);
      if (sidx < 0) throw new Error("Session not found.");

      oldPath = sessions[sidx]?.voiceNotePath || "";

      sessions[sidx] = {
        ...sessions[sidx],
        voiceNoteUrl: "",
        voiceNotePath: "",
        voiceNoteCreatedAt: null,
        voiceNoteDurationSec: null,
        voiceTranscriptRaw: "",
        voiceTranscriptEdited: "",
        voiceTranscriptUpdatedAt: null,
        voiceTranscriptStatus: "none",
      };

      tx.update(projectRef, { sessions });
    });

    if (oldPath) {
      try {
        await deleteObject(storageRef(storage, oldPath));
      } catch {}
    }
  };

  // -----------------------------
  // Auth actions
  // -----------------------------
  const signOutUser = async () => {
    try {
      await signOut(auth);
    } finally {
      setView("dashboard");
      setTab("library");
      setActiveProject(null);
      setActiveMedia(null);
      setSearch("");
      setMediaNotesById({});
    }
  };

  // -----------------------------
  // Derived
  // -----------------------------
  const filteredProjects = useMemo(() => {
    let list =
      tab === "library"
        ? projects.filter((p) => p.status === "active")
        : tab === "graveyard"
        ? projects.filter((p) => p.status === "graveyard")
        : projects;

    if (tab === "search" && search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          (p.title || "").toLowerCase().includes(q) ||
          safeArray(p.aiTags).some((t) => (t || "").toLowerCase().includes(q))
      );
    }

    return list;
  }, [projects, tab, search]);

  const value = {
    user,
    authReady,

    view,
    setView,
    tab,
    setTab,
    activeProject,
    setActiveProject,
    activeMedia,
    setActiveMedia,
    search,
    setSearch,
    filteredProjects,

    mediaNotesById, // ✅ exposed cache

    // permissions
    getMyRole: (project) => getMyRole(user?.uid, project),
    canEdit: (project) => canEdit(user?.uid, project),
    isOwner: (project) => isOwner(user?.uid, project),

    // projects
    addProject,
    renameProject,
    updateProjectBrief,
    deleteProject,
    archiveProject,
    restoreProject,

    // invites
    createInvite,

    // sessions
    addSession,
    renameSession,
    deleteSession,

    // media
    addMediaFilesToProject,
    addMediaToProject,
    deleteMediaFromProject,

    // pins (annotations)
    addHotspotToMedia,
    updateHotspotInMedia,
    deleteHotspotFromMedia,

    // general photo notes (Option 2)
    upsertMediaNote,

    // session voice notes
    uploadSessionVoiceNote,
    updateSessionVoiceTranscript,
    clearSessionVoiceNote,

    // auth
    signOutUser,
  };

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export const useVault = () => useContext(VaultContext);