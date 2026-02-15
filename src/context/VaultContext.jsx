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
import { onAuthStateChanged } from "firebase/auth";
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

  // Auth Bouncer
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) {
      setProjects([]);
      return;
    }
    const qy = query(collection(db, "projects"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(qy, (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setProjects(list);
    });
    return () => unsub();
  }, [user]);

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

    let coverPhoto = data.coverPhoto || "";
    if (!isVideo) coverPhoto = url;
    if (isVideo && !coverPhoto) coverPhoto = url;

    await updateDoc(projectRef, { sessions, coverPhoto });

    if (activeProject?.id === projectId) {
      setActiveProject((p) => (p ? { ...p, sessions, coverPhoto } : p));
    }
  };

  // --- DELETE MEDIA (The photo executioner) ---
  const deleteMediaFromProject = async (projectId, sessionId, mediaId) => {
    if (!user || !projectId) return;
    const projectRef = doc(db, "projects", projectId);
    const snap = await getDoc(projectRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const sessions = (data.sessions || []).map((session) => {
      if (session.id !== sessionId) return session;
      const media = (session.media || []).filter((m) => m.id !== mediaId);
      return { ...session, media };
    });

    await updateDoc(projectRef, { sessions });

    if (activeProject?.id === projectId) {
      setActiveProject((p) => (p ? { ...p, sessions } : p));
    }
  };

  // --- THE HOLY TRINITY OF PINS ---
  const addHotspotToMedia = async (projectId, sessionId, mediaId, hotspotData) => {
    if (!user || !projectId) return;
    const projectRef = doc(db, "projects", projectId);
    const snap = await getDoc(projectRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const sessions = (data.sessions || []).map((session) => {
      if (session.id !== sessionId) return session;
      const media = (session.media || []).map((m) => {
        if (m.id !== mediaId) return m;
        const hotspots = Array.isArray(m.hotspots) ? m.hotspots : [];
        return {
          ...m,
          hotspots: [...hotspots, { id: hotspotData.id || `h-${Date.now()}`, ...hotspotData }],
        };
      });
      return { ...session, media };
    });

    await updateDoc(projectRef, { sessions });
    if (activeProject?.id === projectId) {
      setActiveProject((p) => (p ? { ...p, sessions } : p));
    }
  };

  const updateHotspotInMedia = async (projectId, sessionId, mediaId, hotspotId, updates) => {
    if (!user || !projectId) return;
    const projectRef = doc(db, "projects", projectId);
    const snap = await getDoc(projectRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const sessions = (data.sessions || []).map((session) => {
      if (session.id !== sessionId) return session;
      const media = (session.media || []).map((m) => {
        if (m.id !== mediaId) return m;
        const hotspots = (m.hotspots || []).map((h) => {
          if (h.id !== hotspotId) return h;
          return { ...h, ...updates };
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

  const deleteHotspotFromMedia = async (projectId, sessionId, mediaId, hotspotId) => {
    if (!user || !projectId) return;
    const projectRef = doc(db, "projects", projectId);
    const snap = await getDoc(projectRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const sessions = (data.sessions || []).map((session) => {
      if (session.id !== sessionId) return session;
      const media = (session.media || []).map((m) => {
        if (m.id !== mediaId) return m;
        const hotspots = (m.hotspots || []).filter((h) => h.id !== hotspotId);
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
    view, setView,
    tab, setTab,
    activeProject, setActiveProject,
    activeMedia, setActiveMedia,
    search, setSearch,
    filteredProjects,
    addProject,
    deleteProject,
    addMediaToProject,
    deleteMediaFromProject,
    addHotspotToMedia,
    updateHotspotInMedia,
    deleteHotspotFromMedia,
  };

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

// THIS IS THE LINE YOU KILLED. IT IS NOW SAFE.
export const useVault = () => useContext(VaultContext);