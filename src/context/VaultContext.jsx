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
  getDoc,
  deleteDoc,
  setDoc,
  runTransaction,
  arrayUnion,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "../lib/firebase";

const VaultContext = createContext(null);

const formatDateShort = (d = new Date()) =>
  d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });

const safeArray = (v) => (Array.isArray(v) ? v : []);

const uid = () => {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
};

// Merge + dedupe projects from multiple listeners
const mergeProjects = (prev, snap) => {
  const map = new Map((prev || []).map((p) => [p.id, p]));
  snap.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() }));
  return Array.from(map.values());
};

const sortProjectsByCreatedAt = (list) =>
  (list || [])
    .slice()
    .sort((a, b) => (b?.createdAt?.seconds || 0) - (a?.createdAt?.seconds || 0));

export function VaultProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const [view, setView] = useState("dashboard");
  const [tab, setTab] = useState("library");
  const [activeProject, setActiveProject] = useState(null);
  const [activeMedia, setActiveMedia] = useState(null);
  const [search, setSearch] = useState("");

  const [projects, setProjects] = useState([]);

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
  // Projects feed (NEW + legacy)
  // -----------------------------
  useEffect(() => {
    if (!user?.uid) {
      setProjects([]);
      return;
    }

    // NEW model projects: members array-contains uid
    const qMembers = query(
      collection(db, "projects"),
      where("members", "array-contains", user.uid),
      orderBy("createdAt", "desc")
    );

    // LEGACY projects: createdBy == uid
    const qLegacy = query(
      collection(db, "projects"),
      where("createdBy", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubA = onSnapshot(
      qMembers,
      (snapshot) => {
        setProjects((prev) => sortProjectsByCreatedAt(mergeProjects(prev, snapshot)));
      },
      (err) => console.error("Projects members listener error:", err)
    );

    const unsubB = onSnapshot(
      qLegacy,
      (snapshot) => {
        setProjects((prev) => sortProjectsByCreatedAt(mergeProjects(prev, snapshot)));
      },
      (err) => console.error("Projects legacy listener error:", err)
    );

    return () => {
      unsubA();
      unsubB();
    };
  }, [user?.uid]);

  // Keep activeProject in sync with snapshot updates
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
  // Permissions helpers (UI-side)
  // -----------------------------
  const isLegacyOwner = (project) => !!user?.uid && project?.createdBy === user.uid;
  const isLegacyCollaborator = (project) =>
    !!user?.uid && Array.isArray(project?.collaborators) && project.collaborators.includes(user.uid);

  const getMyRole = (project) => {
    const me = user?.uid;
    if (!me || !project) return null;

    const roles = project.roles || null;
    if (roles && typeof roles === "object" && roles[me]) return roles[me];

    if (isLegacyOwner(project)) return "owner";
    if (isLegacyCollaborator(project)) return "editor";
    return null;
  };

  const canEdit = (project) => {
    const r = getMyRole(project);
    return r === "owner" || r === "editor";
  };

  const isOwner = (project) => getMyRole(project) === "owner";

  // -----------------------------
  // Projects
  // -----------------------------
  const addProject = async ({ title, aiTags = [], note = "" }) => {
    if (!user?.uid) return null;

    const newProject = {
      title: title || "Untitled Project",
      aiTags: safeArray(aiTags),
      overallAudio: note,
      status: "active",
      createdAt: serverTimestamp(),
      createdBy: user.uid,

      members: [user.uid],
      roles: { [user.uid]: "owner" },

      sessions: [],
      expiresIn: "30 Days",
      coverPhoto: "",
    };

    const docRef = await addDoc(collection(db, "projects"), newProject);
    return { id: docRef.id, ...newProject };
  };

 const deleteProject = async (projectId) => {
  if (!user?.uid || !projectId) return;

  const proj = projects.find((p) => p.id === projectId) || activeProject;
  if (proj && !isOwner(proj)) {
    throw new Error("Only the owner can delete this project.");
  }

  const projectRef = doc(db, "projects", projectId);

  // Soft-delete → send to Graveyard instead of deleting the doc
  await updateDoc(projectRef, {
    status: "graveyard",
    deletedAt: serverTimestamp(),
    archivedAt: serverTimestamp(), // optional: keeps “archive/deleted” consistent
  });

  // ✅ optimistic local update
  applyProjectPatchLocal(projectId, {
    status: "graveyard",
    deletedAt: { seconds: Math.floor(Date.now() / 1000) },
    archivedAt: { seconds: Math.floor(Date.now() / 1000) },
  });

  // If you were inside it, exit back to dashboard
  if (activeProject?.id === projectId) {
    setActiveProject(null);
    setActiveMedia(null);
    setView("dashboard");
    setTab("graveyard"); // optional: jump user to graveyard so they SEE it
  }
};

const archiveProject = async (projectId) => {
  if (!user?.uid || !projectId) return;

  const proj = projects.find((p) => p.id === projectId) || activeProject;
  if (proj && !isOwner(proj)) {
    throw new Error("Only the owner can archive this project.");
  }

  const projectRef = doc(db, "projects", projectId);
  await updateDoc(projectRef, {
    status: "graveyard",
    archivedAt: serverTimestamp(),
  });

  applyProjectPatchLocal(projectId, {
    status: "graveyard",
    archivedAt: { seconds: Math.floor(Date.now() / 1000) },
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
  if (proj && !isOwner(proj)) {
    throw new Error("Only the owner can restore this project.");
  }

  const projectRef = doc(db, "projects", projectId);
  await updateDoc(projectRef, {
    status: "active",
    restoredAt: serverTimestamp(),
  });

  applyProjectPatchLocal(projectId, {
    status: "active",
    restoredAt: { seconds: Math.floor(Date.now() / 1000) },
  });
};


  const renameProject = async (projectId, nextTitle) => {
    if (!user?.uid || !projectId) return;

    const title = (nextTitle || "").trim();
    if (!title) throw new Error("Project title can’t be empty.");

    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !canEdit(proj)) {
      throw new Error("You don’t have edit access to this project.");
    }

    const ref = doc(db, "projects", projectId);
    await updateDoc(ref, { title });

    setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, title } : p)));
    if (activeProject?.id === projectId) setActiveProject((p) => (p ? { ...p, title } : p));
  };

  const renameSession = async (projectId, sessionId, nextTitle) => {
    if (!user?.uid || !projectId || !sessionId) return;

    const title = (nextTitle || "").trim();
    if (!title) throw new Error("Session title can’t be empty.");

    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !canEdit(proj)) {
      throw new Error("You don’t have edit access to this project.");
    }

    const projectRef = doc(db, "projects", projectId);
    const snap = await getDoc(projectRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const sessions = safeArray(data.sessions).map((s) => (s.id === sessionId ? { ...s, title } : s));

    await updateDoc(projectRef, { sessions });

    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          sessions: safeArray(p.sessions).map((s) => (s.id === sessionId ? { ...s, title } : s)),
        };
      })
    );

    if (activeProject?.id === projectId) {
      setActiveProject((p) =>
        p
          ? {
              ...p,
              sessions: safeArray(p.sessions).map((s) => (s.id === sessionId ? { ...s, title } : s)),
            }
          : p
      );
    }
  };

  // -----------------------------
  // Invites (anyone with link can join)
  // -----------------------------
  const createInvite = async (projectId, role = "editor") => {
    if (!user?.uid || !projectId) return null;

    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !isOwner(proj)) {
      throw new Error("Only the owner can create invite links.");
    }

    const inviteRef = doc(collection(db, "invites"));
    await setDoc(inviteRef, {
      projectId,
      role: role === "viewer" ? "viewer" : "editor",
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      isActive: true,
    });

    return inviteRef.id;
  };

  // IMPORTANT: For the rules we installed, join must write joinWithInvite: inviteId
  const redeemInvite = async (inviteId) => {
    if (!user?.uid || !inviteId) return null;

    const projectId = await runTransaction(db, async (tx) => {
      const inviteRef = doc(db, "invites", inviteId);
      const inviteSnap = await tx.get(inviteRef);
      if (!inviteSnap.exists()) throw new Error("Invite not found.");

      const invite = inviteSnap.data();
      if (!invite?.isActive) throw new Error("Invite is no longer active.");

      const projectRef = doc(db, "projects", invite.projectId);
      const projectSnap = await tx.get(projectRef);
      if (!projectSnap.exists()) throw new Error("Project not found.");

      const p = projectSnap.data();
      const role = invite.role === "viewer" ? "viewer" : "editor";

      const members = safeArray(p.members);
      const nextMembers = members.includes(user.uid) ? members : [...members, user.uid];

      const roles = p.roles || {};
      const existing = roles[user.uid];
      const nextRoles = existing ? roles : { ...roles, [user.uid]: role };

      tx.update(projectRef, {
        members: nextMembers,
        roles: nextRoles,
        joinWithInvite: inviteId,
      });

      return invite.projectId;
    });

    return projectId;
  };

  const setMemberRole = async (projectId, memberUid, role) => {
    if (!user?.uid || !projectId || !memberUid) return;

    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !isOwner(proj)) {
      throw new Error("Only the owner can change roles.");
    }

    const nextRole = role === "viewer" ? "viewer" : role === "owner" ? "owner" : "editor";

    const projectRef = doc(db, "projects", projectId);
    await updateDoc(projectRef, {
      [`roles.${memberUid}`]: nextRole,
      members: arrayUnion(memberUid),
    });
  };

  const removeMember = async (projectId, memberUid) => {
    if (!user?.uid || !projectId || !memberUid) return;

    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !isOwner(proj)) {
      throw new Error("Only the owner can remove collaborators.");
    }

    await runTransaction(db, async (tx) => {
      const projectRef = doc(db, "projects", projectId);
      const snap = await tx.get(projectRef);
      if (!snap.exists()) throw new Error("Project not found.");

      const p = snap.data();
      const members = safeArray(p.members).filter((u) => u !== memberUid);
      const roles = { ...(p.roles || {}) };
      delete roles[memberUid];

      tx.update(projectRef, { members, roles });
    });
  };

  const leaveProject = async (projectId) => {
    if (!user?.uid || !projectId) return;

    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && isOwner(proj)) {
      throw new Error("Owner cannot leave. Transfer ownership or delete the project.");
    }

    await runTransaction(db, async (tx) => {
      const projectRef = doc(db, "projects", projectId);
      const snap = await tx.get(projectRef);
      if (!snap.exists()) throw new Error("Project not found.");

      const p = snap.data();
      const members = safeArray(p.members).filter((u) => u !== user.uid);
      const roles = { ...(p.roles || {}) };
      delete roles[user.uid];

      tx.update(projectRef, { members, roles });
    });

    if (activeProject?.id === projectId) {
      setActiveProject(null);
      setActiveMedia(null);
      setView("dashboard");
    }
  };

  // -----------------------------
  // Media helpers
  // -----------------------------
  const uploadSingleToStorage = async (projectId, file) => {
    const safeName = (file.name || "upload").replace(/[^\w.-]+/g, "_");
    const storagePath = `projects/${projectId}/${Date.now()}_${uid()}_${safeName}`;
    const fileRef = storageRef(storage, storagePath);

    await uploadBytes(fileRef, file, {
      contentType: file?.type || "application/octet-stream",
    });

    const url = await getDownloadURL(fileRef);
    const isVideo = !!file.type?.startsWith("video");

    return {
      id: `m-${uid()}`,
      type: isVideo ? "video" : "photo",
      url,
      path: storagePath,
      createdAt: new Date().toISOString(),
      hotspots: [],
    };
  };

  const applyProjectPatchLocal = (projectId, patch) => {
    setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, ...patch } : p)));
    if (activeProject?.id === projectId) {
      setActiveProject((p) => (p ? { ...p, ...patch } : p));
    }
  };

  // -----------------------------
  // Media (single + multi)
  // -----------------------------
  const addMediaFilesToProject = async (projectId, files = [], sessionId = null, sessionTitle = "") => {
    if (!user?.uid || !projectId) return;
    const list = safeArray(files).filter(Boolean);
    if (list.length === 0) return;

    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !canEdit(proj)) {
      throw new Error("You don’t have edit access to this project.");
    }

    // upload in parallel (you cap at 5 in UI anyway)
    const uploadedMedia = await Promise.all(
      list.slice(0, 5).map((f) => uploadSingleToStorage(projectId, f))
    );

    const projectRef = doc(db, "projects", projectId);
    const snap = await getDoc(projectRef);
    if (!snap.exists()) return;

    const data = snap.data();
    let sessions = safeArray(data.sessions);

    if (sessionId) {
      sessions = sessions.map((s) => {
        if (s.id !== sessionId) return s;
        const prev = safeArray(s.media);
        return { ...s, media: [...prev, ...uploadedMedia] };
      });
    } else {
      const newSession = {
        id: `s-${uid()}`,
        title: sessionTitle || "New Session",
        date: formatDateShort(),
        media: uploadedMedia,
      };
      sessions = [newSession, ...sessions];
    }

    // cover photo: prefer first photo, otherwise first video (if empty)
    let coverPhoto = data.coverPhoto || "";
    const firstPhoto = uploadedMedia.find((m) => m.type !== "video");
    const firstAny = uploadedMedia[0] || null;
    if (firstPhoto?.url) coverPhoto = firstPhoto.url;
    else if (!coverPhoto && firstAny?.url) coverPhoto = firstAny.url;

    await updateDoc(projectRef, { sessions, coverPhoto });

    // ✅ optimistic local update so it doesn't "linger"
    applyProjectPatchLocal(projectId, { sessions, coverPhoto });
  };

  const addMediaToProject = async (projectId, file, sessionId = null, sessionTitle = "") => {
    if (!file) return;
    return addMediaFilesToProject(projectId, [file], sessionId, sessionTitle);
  };

  const deleteMediaFromProject = async (projectId, sessionId, mediaId) => {
    if (!user?.uid || !projectId || !sessionId || !mediaId) return;

    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !canEdit(proj)) {
      throw new Error("You don’t have edit access to this project.");
    }

    const projectRef = doc(db, "projects", projectId);
    const snap = await getDoc(projectRef);
    if (!snap.exists()) return;

    const data = snap.data();

    const sessions = safeArray(data.sessions).map((session) => {
      if (session.id !== sessionId) return session;
      const media = safeArray(session.media).filter((m) => m.id !== mediaId);
      return { ...session, media };
    });

    await updateDoc(projectRef, { sessions });

    // ✅ optimistic local update
    applyProjectPatchLocal(projectId, { sessions });

    if (activeMedia?.sessionId === sessionId && activeMedia?.id === mediaId) {
      setActiveMedia(null);
      setView("project");
    }
  };

  const bulkDeleteMediaFromSession = async (projectId, sessionId, mediaIds = []) => {
    if (!user?.uid || !projectId || !sessionId) return;

    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !canEdit(proj)) {
      throw new Error("You don’t have edit access to this project.");
    }

    const idSet = new Set(safeArray(mediaIds));
    if (idSet.size === 0) return;

    const projectRef = doc(db, "projects", projectId);
    const snap = await getDoc(projectRef);
    if (!snap.exists()) return;

    const data = snap.data();

    const sessions = safeArray(data.sessions).map((session) => {
      if (session.id !== sessionId) return session;
      const media = safeArray(session.media).filter((m) => !idSet.has(m.id));
      return { ...session, media };
    });

    await updateDoc(projectRef, { sessions });

    // ✅ optimistic local update
    applyProjectPatchLocal(projectId, { sessions });
  };

  // -----------------------------
  // Sessions
  // -----------------------------
  const deleteSession = async (projectId, sessionId) => {
    if (!user?.uid || !projectId || !sessionId) return;

    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !canEdit(proj)) {
      throw new Error("You don’t have edit access to this project.");
    }

    const projectRef = doc(db, "projects", projectId);
    const snap = await getDoc(projectRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const sessions = safeArray(data.sessions);
    const nextSessions = sessions.filter((s) => s.id !== sessionId);

    await updateDoc(projectRef, { sessions: nextSessions });

    // ✅ optimistic local update
    applyProjectPatchLocal(projectId, { sessions: nextSessions });

    if (activeMedia?.sessionId === sessionId) {
      setActiveMedia(null);
      setView("project");
    }
  };

  // -----------------------------
  // Pins / Hotspots
  // -----------------------------
  const addHotspotToMedia = async (projectId, sessionId, mediaId, hotspotData = {}) => {
    if (!user?.uid || !projectId || !sessionId || !mediaId) return;

    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !canEdit(proj)) {
      throw new Error("You don’t have edit access to this project.");
    }

    const projectRef = doc(db, "projects", projectId);
    const snap = await getDoc(projectRef);
    if (!snap.exists()) return;

    const data = snap.data();

    const sessions = safeArray(data.sessions).map((session) => {
      if (session.id !== sessionId) return session;

      const media = safeArray(session.media).map((m) => {
        if (m.id !== mediaId) return m;

        const hotspots = safeArray(m.hotspots);

        const forcedId = hotspotData?.id || `h-${uid()}`;
        const { id: _ignored, ...rest } = hotspotData || {};

        return { ...m, hotspots: [...hotspots, { id: forcedId, ...rest }] };
      });

      return { ...session, media };
    });

    await updateDoc(projectRef, { sessions });
    applyProjectPatchLocal(projectId, { sessions });
  };

  const updateHotspotInMedia = async (projectId, sessionId, mediaId, hotspotId, updates = {}) => {
    if (!user?.uid || !projectId || !sessionId || !mediaId || !hotspotId) return;

    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !canEdit(proj)) {
      throw new Error("You don’t have edit access to this project.");
    }

    const projectRef = doc(db, "projects", projectId);
    const snap = await getDoc(projectRef);
    if (!snap.exists()) return;

    const data = snap.data();

    const sessions = safeArray(data.sessions).map((session) => {
      if (session.id !== sessionId) return session;

      const media = safeArray(session.media).map((m) => {
        if (m.id !== mediaId) return m;

        const hotspots = safeArray(m.hotspots).map((h) =>
          h.id === hotspotId ? { ...h, ...updates } : h
        );

        return { ...m, hotspots };
      });

      return { ...session, media };
    });

    await updateDoc(projectRef, { sessions });
    applyProjectPatchLocal(projectId, { sessions });
  };

  const deleteHotspotFromMedia = async (projectId, sessionId, mediaId, hotspotId) => {
    if (!user?.uid || !projectId || !sessionId || !mediaId || !hotspotId) return;

    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !canEdit(proj)) {
      throw new Error("You don’t have edit access to this project.");
    }

    const projectRef = doc(db, "projects", projectId);
    const snap = await getDoc(projectRef);
    if (!snap.exists()) return;

    const data = snap.data();

    const sessions = safeArray(data.sessions).map((session) => {
      if (session.id !== sessionId) return session;

      const media = safeArray(session.media).map((m) => {
        if (m.id !== mediaId) return m;
        const hotspots = safeArray(m.hotspots).filter((h) => h.id !== hotspotId);
        return { ...m, hotspots };
      });

      return { ...session, media };
    });

    await updateDoc(projectRef, { sessions });
    applyProjectPatchLocal(projectId, { sessions });
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

    // permissions helpers
    getMyRole,
    canEdit,
    isOwner,

    // projects
    addProject,
    renameProject,
    deleteProject,
    archiveProject,
    restoreProject,
    leaveProject,

    // sharing
    createInvite,
    redeemInvite,
    setMemberRole,
    removeMember,

    // sessions/media
    deleteSession,
    renameSession,
    addMediaToProject,
    addMediaFilesToProject, // ✅ multi upload (up to 5 from UI)
    deleteMediaFromProject,
    bulkDeleteMediaFromSession,

    // hotspots
    addHotspotToMedia,
    updateHotspotInMedia,
    deleteHotspotFromMedia,

    signOutUser,
  };

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export const useVault = () => useContext(VaultContext);
