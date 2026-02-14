// src/context/VaultContext.jsx
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
import {
  signInAnonymously,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

import { auth, db, storage } from "../lib/firebase";

const VaultContext = createContext();

// --- helpers ---
const formatDateShort = (d = new Date()) =>
  d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });

const safeString = (v) => (typeof v === "string" ? v : "");
const safeArray = (v) => (Array.isArray(v) ? v : []);

export function VaultProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // UI state
  const [view, setView] = useState("dashboard"); // dashboard | project | media
  const [tab, setTab] = useState("library"); // library | search | graveyard
  const [activeProject, setActiveProject] = useState(null);
  const [activeMedia, setActiveMedia] = useState(null);
  const [search, setSearch] = useState("");

  // Data state
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // -----------------------------
  // AUTH (anonymous auto + optional Google sign-in)
  // -----------------------------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        if (u) {
          setUser(u);
          setAuthReady(true);
          return;
        }
        const res = await signInAnonymously(auth);
        setUser(res.user);
        setAuthReady(true);
      } catch (e) {
        console.error("Auth init failed:", e);
        setAuthReady(true);
      }
    });

    return () => unsub();
  }, []);

  const ensureSignedIn = async () => {
    if (auth.currentUser) return auth.currentUser;
    const res = await signInAnonymously(auth);
    setUser(res.user);
    return res.user;
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const res = await signInWithPopup(auth, provider);
    setUser(res.user);
    return res.user;
  };

  const signOutUser = async () => {
    await signOut(auth);
    // auto re-anon on listener
  };

  // -----------------------------
  // REALTIME PROJECTS LISTENER
  // -----------------------------
  useEffect(() => {
    if (!authReady) return;
    if (!user?.uid) return;

    setLoadingProjects(true);

    const qy = query(
      collection(db, "users", user.uid, "projects"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      qy,
      (snap) => {
        try {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

          const normalized = list.map((p) => ({
            id: p.id,
            title: safeString(p.title),
            status: safeString(p.status) || "active",
            expiresIn: safeString(p.expiresIn) || "30 Days",
            coverPhoto: safeString(p.coverPhoto),
            overallAudio: safeString(p.overallAudio),
            aiTags: safeArray(p.aiTags),
            collaborators: safeArray(p.collaborators),
            sessions: safeArray(p.sessions).map((s) => ({
              ...s,
              id: safeString(s.id),
              title: safeString(s.title),
              date: safeString(s.date),
              media: safeArray(s.media).map((m) => ({
                ...m,
                id: safeString(m.id),
                type: safeString(m.type),
                url: safeString(m.url),
                hotspots: safeArray(m.hotspots),
                meta: m.meta && typeof m.meta === "object" ? m.meta : {},
              })),
            })),
          }));

          setProjects(normalized);
        } catch (e) {
          console.error("Projects snapshot parse error:", e);
        } finally {
          setLoadingProjects(false);
        }
      },
      (err) => {
        console.error("Projects snapshot error:", err);
        setLoadingProjects(false);
      }
    );

    return () => unsub();
  }, [user?.uid, authReady]);

  // keep activeProject synced with updated projects
  const activeProjectResolved = useMemo(() => {
    if (!activeProject?.id) return null;
    return projects.find((p) => p.id === activeProject.id) || activeProject;
  }, [projects, activeProject]);

  // -----------------------------------
  // CREATE PROJECT (Firestore)
  // -----------------------------------
  const addProject = async ({ title, tags }) => {
    const u = await ensureSignedIn();

    const payload = {
      title: (title || "").trim(),
      status: "active",
      expiresIn: "30 Days",
      coverPhoto:
        "https://images.unsplash.com/photo-1520975682031-ae5f8dff0c9f?auto=format&fit=crop&w=800&q=80",
      overallAudio: "",
      aiTags: Array.isArray(tags) ? tags : [],
      collaborators: [],
      sessions: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const refDoc = await addDoc(collection(db, "users", u.uid, "projects"), payload);

    return { id: refDoc.id, ...payload, createdAt: Date.now(), updatedAt: Date.now() };
  };

  // -----------------------------------
  // ADD SESSION
  // -----------------------------------
  const addSession = async (projectId, { title } = {}) => {
    const u = await ensureSignedIn();
    if (!projectId) throw new Error("Missing projectId");

    const projectRef = doc(db, "users", u.uid, "projects", projectId);
    const snap = await getDoc(projectRef);
    if (!snap.exists()) throw new Error("Project not found");

    const p = snap.data();
    const sessions = safeArray(p.sessions);

    const now = Date.now();
    const newSession = {
      id: `s_${now}`,
      title: (title || "").trim() || `Session ${formatDateShort(new Date())}`,
      date: formatDateShort(new Date()),
      media: [],
      createdAt: now,
    };

    await updateDoc(projectRef, {
      sessions: [newSession, ...sessions],
      updatedAt: serverTimestamp(),
    });

    return newSession;
  };

  // -----------------------------------
  // ADD MEDIA (Storage + Firestore)
  // -----------------------------------
  const addMediaToProject = async (projectId, { file, sessionId, createNewSessionTitle } = {}) => {
    const u = await ensureSignedIn();
    if (!projectId) throw new Error("Missing projectId");
    if (!file) return null;

    const projectRef = doc(db, "users", u.uid, "projects", projectId);
    const snap = await getDoc(projectRef);
    if (!snap.exists()) throw new Error("Project not found");

    const p = snap.data();
    let sessions = safeArray(p.sessions);

    const now = Date.now();
    const isVideo = !!file.type && file.type.startsWith("video/");
    const mediaId = `m_${now}`;

    const extFromName =
      typeof file.name === "string" && file.name.includes(".")
        ? file.name.split(".").pop()
        : null;

    const ext = (extFromName || (isVideo ? "mp4" : "jpg")).toLowerCase();

    // 1) decide target session
    let targetSessionId = sessionId;

    if (!targetSessionId) {
      if (createNewSessionTitle && createNewSessionTitle.trim()) {
        const newSession = {
          id: `s_${now}_new`,
          title: createNewSessionTitle.trim(),
          date: formatDateShort(new Date()),
          media: [],
          createdAt: now,
        };
        sessions = [newSession, ...sessions];
        targetSessionId = newSession.id;
      } else if (sessions?.[0]?.id) {
        targetSessionId = sessions[0].id;
      } else {
        const autoSession = {
          id: `s_${now}_auto`,
          title: `Session ${formatDateShort(new Date())}`,
          date: formatDateShort(new Date()),
          media: [],
          createdAt: now,
        };
        sessions = [autoSession, ...sessions];
        targetSessionId = autoSession.id;
      }
    }

    // 2) upload file to Storage
    const path = `users/${u.uid}/projects/${projectId}/media/${mediaId}.${ext}`;
    const sRef = storageRef(storage, path);

    try {
      await uploadBytes(sRef, file);
    } catch (err) {
      console.error("Storage uploadBytes failed:", err);
      // Make error readable
      const msg =
        err?.code === "storage/unauthorized"
          ? "Storage unauthorized. Fix Storage Rules (must allow auth.uid write)."
          : err?.code === "storage/canceled"
          ? "Upload canceled."
          : err?.code === "storage/retry-limit-exceeded"
          ? "Upload retry limit exceeded."
          : err?.message || "Upload failed.";
      throw new Error(msg);
    }

    let downloadURL = "";
    try {
      downloadURL = await getDownloadURL(sRef);
    } catch (err) {
      console.error("getDownloadURL failed:", err);
      throw new Error(err?.message || "Failed to get download URL.");
    }

    // 3) media object (no undefined fields)
    const media = {
      id: mediaId,
      type: isVideo ? "video" : "photo",
      url: downloadURL,
      hotspots: [],
      meta: {
        name: typeof file.name === "string" ? file.name : `${mediaId}.${ext}`,
        size: typeof file.size === "number" ? file.size : 0,
        mime: typeof file.type === "string" ? file.type : "",
        createdAt: now,
        storagePath: path,
      },
      ...(isVideo ? { duration: "--:--" } : {}),
    };

    // 4) insert into session
    let found = false;
    const updatedSessions = sessions.map((s) => {
      if (s.id !== targetSessionId) return s;
      found = true;
      const mediaArr = safeArray(s.media);
      return { ...s, media: [media, ...mediaArr] };
    });

    if (!found) {
      updatedSessions.unshift({
        id: targetSessionId,
        title: (createNewSessionTitle || "").trim() || `Session ${formatDateShort(new Date())}`,
        date: formatDateShort(new Date()),
        media: [media],
        createdAt: now,
      });
    }

    try {
      await updateDoc(projectRef, {
        sessions: updatedSessions,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("updateDoc failed after upload:", err);
      throw new Error(err?.message || "Failed to save media to project (Firestore).");
    }

    return media;
  };

  // -----------------------------------
  // DELETE PROJECT (Firestore + Storage files)
  // -----------------------------------
  const deleteProject = async (projectId) => {
    const u = await ensureSignedIn();
    if (!projectId) throw new Error("Missing projectId");

    const projectRef = doc(db, "users", u.uid, "projects", projectId);

    // Grab doc first so we can delete storage objects
    const snap = await getDoc(projectRef);
    if (snap.exists()) {
      const p = snap.data();
      const sessions = safeArray(p.sessions);

      // collect storage paths
      const paths = [];
      sessions.forEach((s) => {
        safeArray(s.media).forEach((m) => {
          const sp = m?.meta?.storagePath;
          if (typeof sp === "string" && sp.trim()) paths.push(sp);
        });
      });

      // delete storage objects best-effort
      await Promise.all(
        paths.map(async (path) => {
          try {
            await deleteObject(storageRef(storage, path));
          } catch (err) {
            // ignore missing/permission errors so project delete still works
            console.warn("deleteObject failed (ignored):", path, err?.code || err?.message);
          }
        })
      );
    }

    // delete Firestore doc
    await deleteDoc(projectRef);

    // cleanup local UI state
    if (activeProject?.id === projectId) {
      setActiveProject(null);
      setView("dashboard");
    }
  };

  // -----------------------------------
  // FILTERING
  // -----------------------------------
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
    // Auth
    user,
    authReady,
    ensureSignedIn,
    signInWithGoogle,
    signOutUser,

    // UI
    view,
    setView,
    tab,
    setTab,
    activeProject: activeProjectResolved,
    setActiveProject,
    activeMedia,
    setActiveMedia,
    search,
    setSearch,

    // Data
    projects,
    filteredProjects,
    loadingProjects,

    // Actions
    addProject,
    addSession,
    addMediaToProject,
    deleteProject,
  };

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export const useVault = () => useContext(VaultContext);
