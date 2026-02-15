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
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "../lib/firebase";

const VaultContext = createContext();

// --- helpers ---
const formatDateShort = (d = new Date()) =>
  d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });

const safeArray = (v) => (Array.isArray(v) ? v : []);

export function VaultProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // UI state
  const [view, setView] = useState("dashboard");
  const [tab, setTab] = useState("library");
  const [activeProject, setActiveProject] = useState(null);
  const [activeMedia, setActiveMedia] = useState(null);
  const [search, setSearch] = useState("");

  // Data state
  const [projects, setProjects] = useState([]);

  // 1) Auth Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const ensureSignedIn = async () => {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
  };

  // 2) Subscribe to projects
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

  // 3) Keep activeProject fresh when projects list updates
  useEffect(() => {
    if (!activeProject?.id) return;
    const updated = projects.find((p) => p.id === activeProject.id);
    if (updated) setActiveProject(updated);
  }, [projects, activeProject?.id]);

  // 4) Actions
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
      coverPhoto: "", // <-- important: this is what the grid uses
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

  // --- Upload media + update sessions + update cover photo ---
  const addMediaToProject = async (projectId, file, sessionId = null, sessionTitle = "") => {
    if (!user || !file || !projectId) return;

    // 1) Upload to Storage
    const safeName = (file.name || "upload").replace(/[^\w.-]+/g, "_");
    const storagePath = `projects/${projectId}/${Date.now()}_${safeName}`;
    const fileRef = storageRef(storage, storagePath);

    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);

    // 2) Create media object
    const isVideo = file.type?.startsWith("video");
    const newMedia = {
      id: `m-${Date.now()}`,
      type: isVideo ? "video" : "photo",
      url,
      path: storagePath,
      createdAt: new Date().toISOString(),
      hotspots: [],
    };

    // 3) Read existing project
    const projectRef = doc(db, "projects", projectId);
    const snap = await getDoc(projectRef);
    if (!snap.exists()) return;

    const data = snap.data();
    let sessions = Array.isArray(data.sessions) ? data.sessions : [];

    // 4) Put media into session
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

    // 5) Cover photo logic (this is the missing piece)
    // - If it's a photo, use it as the cover (newest wins).
    // - If it's a video, leave cover alone unless there isn't one.
    let coverPhoto = data.coverPhoto || "";
    if (!isVideo) coverPhoto = url;
    if (isVideo && !coverPhoto) coverPhoto = url;

    // 6) Save to Firestore
    await updateDoc(projectRef, { sessions, coverPhoto });

    // Optional: make UI feel instant (Firestore should update anyway)
    if (activeProject?.id === projectId) {
      setActiveProject((p) => (p ? { ...p, sessions, coverPhoto } : p));
    }
  };

  // Filtering Logic
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
    ensureSignedIn,

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
    addMediaToProject,
  };

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export const useVault = () => useContext(VaultContext);
