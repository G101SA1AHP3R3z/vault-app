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
  setDoc,
  runTransaction,
  arrayUnion,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
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
      // keep legacy field name you were using:
      overallAudio: note,
      status: "active",
      createdAt: serverTimestamp(),
      createdBy: user.uid,

      members: [user.uid],
      roles: { [user.uid]: "owner" },

      sessions: [],
      expiresIn: "30 Days",
      coverPhoto: "",

      // NEW: overview audio + transcript
      overviewAudioUrl: "",
      overviewAudioPath: "",
      overviewAudioCreatedAt: null,
      overviewTranscriptRaw: "",
      overviewTranscriptEdited: "",
      overviewTranscriptUpdatedAt: null,
      overviewTranscriptStatus: "none", // none | ready | processing | error
    };

    const docRef = await addDoc(collection(db, "projects"), newProject);
    return { id: docRef.id, ...newProject };
  };

  const applyProjectPatchLocal = (projectId, patch) => {
    setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, ...patch } : p)));
    if (activeProject?.id === projectId) {
      setActiveProject((p) => (p ? { ...p, ...patch } : p));
    }
  };

  // -----------------------------
  // Project overview audio + transcript
  // -----------------------------
  const uploadProjectOverviewAudio = async (projectId, file, transcriptRaw = "") => {
    if (!user?.uid || !projectId || !file) return;

    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !canEdit(proj)) {
      throw new Error("You don’t have edit access to this project.");
    }

    const safeName = (file.name || "overview").replace(/[^\w.-]+/g, "_");
    const storagePath = `projects/${projectId}/overview/${Date.now()}_${uid()}_${safeName}`;
    const fileRef = storageRef(storage, storagePath);

    await uploadBytes(fileRef, file, {
      contentType: file?.type || "application/octet-stream",
    });

    const url = await getDownloadURL(fileRef);

    // If a previous overview exists, delete the old object best-effort.
    // (We store path in doc; safe to ignore errors if missing.)
    const projectRef = doc(db, "projects", projectId);
    const snap = await getDoc(projectRef);
    let oldPath = "";
    if (snap.exists()) {
      oldPath = snap.data()?.overviewAudioPath || "";
    }

    const patch = {
      overviewAudioUrl: url,
      overviewAudioPath: storagePath,
      overviewAudioCreatedAt: serverTimestamp(),
      overviewTranscriptRaw: (transcriptRaw || "").trim(),
      overviewTranscriptEdited: (transcriptRaw || "").trim(),
      overviewTranscriptUpdatedAt: transcriptRaw ? serverTimestamp() : null,
      overviewTranscriptStatus: transcriptRaw ? "ready" : "processing",
    };

    await updateDoc(projectRef, patch);

    // optimistic
    applyProjectPatchLocal(projectId, {
      ...patch,
      // give local-ish placeholders so UI updates instantly
      overviewAudioCreatedAt: { seconds: Math.floor(Date.now() / 1000) },
      overviewTranscriptUpdatedAt: transcriptRaw ? { seconds: Math.floor(Date.now() / 1000) } : null,
    });

    // delete old file best-effort (don’t block UX)
    if (oldPath && oldPath !== storagePath) {
      try {
        await deleteObject(storageRef(storage, oldPath));
      } catch {
        // ignore
      }
    }

    return { url, path: storagePath };
  };

  const updateProjectOverviewTranscript = async (projectId, editedText) => {
    if (!user?.uid || !projectId) return;

    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !canEdit(proj)) {
      throw new Error("You don’t have edit access to this project.");
    }

    const text = (editedText || "").trim();

    const patch = {
      overviewTranscriptEdited: text,
      overviewTranscriptUpdatedAt: serverTimestamp(),
      overviewTranscriptStatus: "ready",
    };

    await updateDoc(doc(db, "projects", projectId), patch);

    applyProjectPatchLocal(projectId, {
      ...patch,
      overviewTranscriptUpdatedAt: { seconds: Math.floor(Date.now() / 1000) },
    });
  };

  const clearProjectOverviewAudio = async (projectId) => {
    if (!user?.uid || !projectId) return;

    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !canEdit(proj)) {
      throw new Error("You don’t have edit access to this project.");
    }

    const projectRef = doc(db, "projects", projectId);
    const snap = await getDoc(projectRef);
    if (!snap.exists()) return;

    const oldPath = snap.data()?.overviewAudioPath || "";

    const patch = {
      overviewAudioUrl: "",
      overviewAudioPath: "",
      overviewAudioCreatedAt: null,
      overviewTranscriptRaw: "",
      overviewTranscriptEdited: "",
      overviewTranscriptUpdatedAt: null,
      overviewTranscriptStatus: "none",
    };

    await updateDoc(projectRef, patch);
    applyProjectPatchLocal(projectId, patch);

    if (oldPath) {
      try {
        await deleteObject(storageRef(storage, oldPath));
      } catch {
        // ignore
      }
    }
  };

  // -----------------------------
  // Existing functions (unchanged)
  // -----------------------------
  const deleteProject = async (projectId) => {
    if (!user?.uid || !projectId) return;

    const proj = projects.find((p) => p.id === projectId) || activeProject;
    if (proj && !isOwner(proj)) {
      throw new Error("Only the owner can delete this project.");
    }

    const projectRef = doc(db, "projects", projectId);
    await updateDoc(projectRef, {
      status: "graveyard",
      deletedAt: serverTimestamp(),
      archivedAt: serverTimestamp(),
    });

    applyProjectPatchLocal(projectId, {
      status: "graveyard",
      deletedAt: { seconds: Math.floor(Date.now() / 1000) },
      archivedAt: { seconds: Math.floor(Date.now() / 1000) },
    });

    if (activeProject?.id === projectId) {
      setActiveProject(null);
      setActiveMedia(null);
      setView("dashboard");
      setTab("graveyard");
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

  // NOTE: keep the rest of your existing media/session/hotspot functions as-is.
  // (I’m not pasting them again here to avoid breaking your file.)
  // If you need this file to be *exactly* your local one, paste this version
  // over your current VaultContext.jsx and then re-add your existing functions below renameProject.

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

    getMyRole,
    canEdit,
    isOwner,

    addProject,
    renameProject,
    deleteProject,
    archiveProject,
    restoreProject,

    // NEW: overview audio + transcript
    uploadProjectOverviewAudio,
    updateProjectOverviewTranscript,
    clearProjectOverviewAudio,

    signOutUser,
  };

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export const useVault = () => useContext(VaultContext);
