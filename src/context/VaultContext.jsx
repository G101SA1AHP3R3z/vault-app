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

    const qLegacy = query(collection(db, "projects"), where("createdBy", "==", user.uid), orderBy("createdAt", "desc"));

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

      // session notes (optional)
      notesText: "",
      notesUpdatedAt: null,

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

  const updateSessionNotes = async (projectId, sessionId, notesText) => {
    if (!user?.uid || !projectId || !sessionId) return;
    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !canEdit(user.uid, proj)) throw new Error("You don’t have edit access to this project.");

    const text = (notesText || "").toString();

    const projectRef = doc(db, "projects", projectId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(projectRef);
      if (!snap.exists()) throw new Error("Project not found.");
      const data = snap.data();
      const sessions = safeArray(data.sessions).map((s) => ({ ...s }));
      const idx = sessions.findIndex((s) => s?.id === sessionId);
      if (idx < 0) throw new Error("Session not found.");

      sessions[idx].notesText = text;
      sessions[idx].notesUpdatedAt = serverTimestamp();

      tx.update(projectRef, { sessions });
    });

    // local patch (best-effort)
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        const sessions = safeArray(p.sessions).map((s) =>
          s?.id === sessionId ? { ...s, notesText: text, notesUpdatedAt: nowSeconds() } : s
        );
        return { ...p, sessions };
      })
    );
    if (activeProject?.id === projectId) {
      setActiveProject((p) => {
        if (!p) return p;
        const sessions = safeArray(p.sessions).map((s) =>
          s?.id === sessionId ? { ...s, notesText: text, notesUpdatedAt: nowSeconds() } : s
        );
        return { ...p, sessions };
      });
    }
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

            // session notes (optional)
            notesText: "",
            notesUpdatedAt: null,

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

          // session notes (optional)
          notesText: "",
          notesUpdatedAt: null,

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
      await deleteDoc(doc(db, "projects", projectId, "mediaNotes", mediaId));
    } catch {}
  };

  // -----------------------------
  // ✅ Option 2: media notes (general notes per media)
  // -----------------------------
  const upsertMediaNote = async (projectId, mediaId, text) => {
    if (!user?.uid || !projectId || !mediaId) return;

    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !canEdit(user.uid, proj)) throw new Error("You don’t have edit access to this project.");

    const noteRef = doc(db, "projects", projectId, "mediaNotes", mediaId);
    await setDoc(
      noteRef,
      {
        text: (text || "").toString(),
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      },
      { merge: true }
    );
  };

  // -----------------------------
  // Hotspots / Pins
  // -----------------------------
  const addHotspotToMedia = async (projectId, sessionId, mediaId, { x, y }) => {
    if (!user?.uid || !projectId || !sessionId || !mediaId) return;
    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !canEdit(user.uid, proj)) throw new Error("You don’t have edit access to this project.");

    const projectRef = doc(db, "projects", projectId);
    const newHotspot = { id: uid(), x, y, note: "" };

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
      hotspots.push(newHotspot);
      media[midx].hotspots = hotspots;
      sessions[sidx].media = media;
      tx.update(projectRef, { sessions });
    });

    return newHotspot;
  };

  const updateHotspotInMedia = async (projectId, sessionId, mediaId, hotspotId, patch) => {
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
      if (hidx < 0) throw new Error("Hotspot not found.");
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
  // Voice notes (session-level)
  // -----------------------------
  const uploadSessionVoiceNote = async (projectId, sessionId, file, durationSec = null) => {
    if (!user?.uid || !projectId || !sessionId || !file) return;
    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !canEdit(user.uid, proj)) throw new Error("You don’t have edit access to this project.");

    // Ensure content type is audio/*
    const ct = file?.type || "audio/webm";
    const safeName = (file.name || "voice.webm").replace(/[^\w.-]+/g, "_");
    const path = `projects/${projectId}/voice/${sessionId}_${Date.now()}_${safeName}`;
    const refObj = storageRef(storage, path);

    await uploadBytes(refObj, file, { contentType: ct });
    const url = await getDownloadURL(refObj);

    const projectRef = doc(db, "projects", projectId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(projectRef);
      if (!snap.exists()) throw new Error("Project not found.");
      const data = snap.data();
      const sessions = safeArray(data.sessions).map((s) => ({ ...s }));
      const idx = sessions.findIndex((s) => s?.id === sessionId);
      if (idx < 0) throw new Error("Session not found.");

      // best effort delete old file path reference later (not here)
      sessions[idx].voiceNoteUrl = url;
      sessions[idx].voiceNotePath = path;
      sessions[idx].voiceNoteCreatedAt = serverTimestamp();
      sessions[idx].voiceNoteDurationSec = typeof durationSec === "number" ? durationSec : null;

      // reset transcript status (server can fill later)
      sessions[idx].voiceTranscriptStatus = "pending";

      tx.update(projectRef, { sessions });
    });

    return { url, path };
  };

  const updateSessionVoiceTranscript = async (projectId, sessionId, { raw = "", edited = "", status = "ready" }) => {
    if (!user?.uid || !projectId || !sessionId) return;
    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !canEdit(user.uid, proj)) throw new Error("You don’t have edit access to this project.");

    const projectRef = doc(db, "projects", projectId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(projectRef);
      if (!snap.exists()) throw new Error("Project not found.");
      const data = snap.data();
      const sessions = safeArray(data.sessions).map((s) => ({ ...s }));
      const idx = sessions.findIndex((s) => s?.id === sessionId);
      if (idx < 0) throw new Error("Session not found.");

      sessions[idx].voiceTranscriptRaw = (raw || "").toString();
      sessions[idx].voiceTranscriptEdited = (edited || "").toString();
      sessions[idx].voiceTranscriptStatus = status || "ready";
      sessions[idx].voiceTranscriptUpdatedAt = serverTimestamp();

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
      const idx = sessions.findIndex((s) => s?.id === sessionId);
      if (idx < 0) throw new Error("Session not found.");

      oldPath = sessions[idx].voiceNotePath || "";

      sessions[idx].voiceNoteUrl = "";
      sessions[idx].voiceNotePath = "";
      sessions[idx].voiceNoteCreatedAt = null;
      sessions[idx].voiceNoteDurationSec = null;
      sessions[idx].voiceTranscriptRaw = "";
      sessions[idx].voiceTranscriptEdited = "";
      sessions[idx].voiceTranscriptUpdatedAt = null;
      sessions[idx].voiceTranscriptStatus = "none";

      tx.update(projectRef, { sessions });
    });

    if (oldPath) {
      try {
        await deleteObject(storageRef(storage, oldPath));
      } catch {}
    }
  };

  // -----------------------------
  // Filtered projects (search + tabs)
  // -----------------------------
  const filteredProjects = useMemo(() => {
    let list = safeArray(projects);

    if (tab === "graveyard") list = list.filter((p) => p.status === "graveyard");
    else list = list.filter((p) => p.status !== "graveyard");

    const q = (search || "").trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const title = (p.title || "").toLowerCase();
        const tags = safeArray(p.aiTags).join(" ").toLowerCase();
        return title.includes(q) || tags.includes(q);
      });
    }
    return list;
  }, [projects, tab, search]);

  // -----------------------------
  // Auth actions
  // -----------------------------
  const signOutUser = async () => {
    await signOut(auth);
    setUser(null);
    setView("dashboard");
    setTab("library");
    setActiveProject(null);
    setActiveMedia(null);
  };

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
    updateSessionNotes,
    deleteSession,

    // media
    addMediaFilesToProject,
    addMediaToProject,
    deleteMediaFromProject,

    // notes
    upsertMediaNote,

    // pins
    addHotspotToMedia,
    updateHotspotInMedia,
    deleteHotspotFromMedia,

    // voice
    uploadSessionVoiceNote,
    updateSessionVoiceTranscript,
    clearSessionVoiceNote,

    // auth
    signOutUser,
  };

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export const useVault = () => useContext(VaultContext);