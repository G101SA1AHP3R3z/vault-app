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
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "../lib/firebase";

const VaultContext = createContext();

const formatDateShort = (d = new Date()) =>
  d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });

const safeArray = (v) => (Array.isArray(v) ? v : []);

export function VaultProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const [view, setView] = useState("dashboard");
  const [tab, setTab] = useState("library");
  const [activeProject, setActiveProject] = useState(null);
  const [activeMedia, setActiveMedia] = useState(null);
  const [search, setSearch] = useState("");

  const [projects, setProjects] = useState([]);

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Projects feed (scoped to user)
  useEffect(() => {
    if (!user) {
      setProjects([]);
      return;
    }

    // IMPORTANT: this assumes your project docs have createdBy === user.uid
    // If you want shared projects later, you’ll change this query.
    const qy = query(collection(db, "projects"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(qy, (snapshot) => {
      const list = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((p) => p.createdBy === user.uid);
      setProjects(list);
    });

    return () => unsub();
  }, [user]);

  // Keep activeProject in sync with snapshot updates
  useEffect(() => {
    if (!activeProject?.id) return;
    const updated = projects.find((p) => p.id === activeProject.id);
    if (updated) setActiveProject(updated);
  }, [projects, activeProject?.id]);

  const addProject = async ({ title, aiTags = [], note = "" }) => {
    if (!user) return null;

    const newProject = {
      title: title || "Untitled Project",
      aiTags,
      overallAudio: note,
      status: "active",
      createdAt: serverTimestamp(),
      createdBy: user.uid,
      sessions: [],
      expiresIn: "30 Days",
      coverPhoto: "",
    };

    const docRef = await addDoc(collection(db, "projects"), newProject);
    return { id: docRef.id, ...newProject };
  };

  const deleteProject = async (projectId) => {
    if (!user || !projectId) return;
    await deleteDoc(doc(db, "projects", projectId));

    if (activeProject?.id === projectId) {
      setActiveProject(null);
      setActiveMedia(null);
      setView("dashboard");
    }
  };

  const addMediaToProject = async (projectId, file, sessionId = null, sessionTitle = "") => {
    if (!user || !file || !projectId) return;

    const safeName = (file.name || "upload").replace(/[^\w.-]+/g, "_");
    const storagePath = `projects/${projectId}/${Date.now()}_${safeName}`;
    const fileRef = storageRef(storage, storagePath);

    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);

    const isVideo = file.type?.startsWith("video");
    const newMedia = {
      id: `m-${Date.now()}`,
      type: isVideo ? "video" : "photo",
      url,
      path: storagePath,
      createdAt: new Date().toISOString(),
      hotspots: [],
    };

    const projectRef = doc(db, "projects", projectId);
    const snap = await getDoc(projectRef);
    if (!snap.exists()) return;

    const data = snap.data();
    let sessions = Array.isArray(data.sessions) ? data.sessions : [];

    if (sessionId) {
      sessions = sessions.map((s) => {
        if (s.id !== sessionId) return s;
        const prev = Array.isArray(s.media) ? s.media : [];
        return { ...s, media: [...prev, newMedia] };
      });
    } else {
      const newSession = {
        id: `s-${Date.now()}`,
        title: sessionTitle || "New Session",
        date: formatDateShort(),
        media: [newMedia],
      };
      sessions = [newSession, ...sessions];
    }

    // Cover behavior:
    // - Prefer latest photo
    // - If there is no cover yet, allow video to set it
    let coverPhoto = data.coverPhoto || "";
    if (!isVideo) coverPhoto = url;
    if (isVideo && !coverPhoto) coverPhoto = url;

    await updateDoc(projectRef, { sessions, coverPhoto });

    // Local sync (helps UI feel instant)
    if (activeProject?.id === projectId) {
      setActiveProject((p) => (p ? { ...p, sessions, coverPhoto } : p));
    }
  };

  // Delete media
  const deleteMediaFromProject = async (projectId, sessionId, mediaId) => {
    if (!user || !projectId || !sessionId || !mediaId) return;

    const projectRef = doc(db, "projects", projectId);
    const snap = await getDoc(projectRef);
    if (!snap.exists()) return;

    const data = snap.data();
    let sessions = safeArray(data.sessions).map((session) => {
      if (session.id !== sessionId) return session;
      const media = safeArray(session.media).filter((m) => m.id !== mediaId);
      return { ...session, media };
    });

    // Optional: if a session becomes empty, keep it (you can choose to remove it later)
    await updateDoc(projectRef, { sessions });

    if (activeProject?.id === projectId) {
      setActiveProject((p) => (p ? { ...p, sessions } : p));
    }
  };

  // Pins: add
  

  // --- Sessions ---
  const deleteSession = async (projectId, sessionId) => {
    if (!user || !projectId || !sessionId) return;
    const projectRef = doc(db, "projects", projectId);
    const snap = await getDoc(projectRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const sessions = Array.isArray(data.sessions) ? data.sessions : [];
    const nextSessions = sessions.filter((s) => s.id !== sessionId);

    await updateDoc(projectRef, { sessions: nextSessions });

    // Keep UI consistent
    if (activeProject?.id === projectId) {
      setActiveProject((p) => (p ? { ...p, sessions: nextSessions } : p));
      // If you were viewing media from that session, bail out
      if (activeMedia?.sessionId === sessionId) {
        setActiveMedia(null);
        setView("project");
      }
    }
  };

  // --- Auth actions ---
  const signOutUser = async () => {
    try {
      await signOut(auth);
    } finally {
      // Clear local UI immediately (auth listener will also run)
      setView("dashboard");
      setTab("library");
      setActiveProject(null);
      setActiveMedia(null);
      setSearch("");
    }
  };
const addHotspotToMedia = async (projectId, sessionId, mediaId, hotspotData) => {
    if (!user || !projectId || !sessionId || !mediaId) return;

    const projectRef = doc(db, "projects", projectId);
    const snap = await getDoc(projectRef);
    if (!snap.exists()) return;

    const data = snap.data();

    const sessions = safeArray(data.sessions).map((session) => {
      if (session.id !== sessionId) return session;

      const media = safeArray(session.media).map((m) => {
        if (m.id !== mediaId) return m;
        const hotspots = safeArray(m.hotspots);

        const id = hotspotData?.id || `h-${Date.now()}`;
        // Ensure id doesn't get overwritten by ...hotspotData
        const { id: _ignored, ...rest } = hotspotData || {};

        return {
          ...m,
          hotspots: [...hotspots, { id, ...rest }],
        };
      });

      return { ...session, media };
    });

    await updateDoc(projectRef, { sessions });

    if (activeProject?.id === projectId) {
      setActiveProject((p) => (p ? { ...p, sessions } : p));
    }
  };

  // Pins: update
  const updateHotspotInMedia = async (projectId, sessionId, mediaId, hotspotId, updates) => {
    if (!user || !projectId || !sessionId || !mediaId || !hotspotId) return;

    const projectRef = doc(db, "projects", projectId);
    const snap = await getDoc(projectRef);
    if (!snap.exists()) return;

    const data = snap.data();

    const sessions = safeArray(data.sessions).map((session) => {
      if (session.id !== sessionId) return session;

      const media = safeArray(session.media).map((m) => {
        if (m.id !== mediaId) return m;

        const hotspots = safeArray(m.hotspots).map((h) => {
          if (h.id !== hotspotId) return h;
          return { ...h, ...(updates || {}) };
        });

        return { ...m, hotspots };
      });

      return { ...session, media };
    });

    await updateDoc(projectRef, { sessions });

    if (activeProject?.id === projectId) {
      setActiveProject((p) => (p ? { ...p, sessions } : p));
    }
  };

  // Pins: delete
  const deleteHotspotFromMedia = async (projectId, sessionId, mediaId, hotspotId) => {
    if (!user || !projectId || !sessionId || !mediaId || !hotspotId) return;

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

    if (activeProject?.id === projectId) {
      setActiveProject((p) => (p ? { ...p, sessions } : p));
    }
  };

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
    signOutUser,

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

    addProject,
    deleteProject,
    deleteSession,
    addMediaToProject,
    deleteMediaFromProject,

    addHotspotToMedia,
    updateHotspotInMedia,
    deleteHotspotFromMedia,
  };

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export const useVault = () => useContext(VaultContext);
