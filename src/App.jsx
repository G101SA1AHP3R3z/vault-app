// /src/App.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  Loader2,
  Play,
  Plus,
  MoreHorizontal,
  Share2,
  Pencil,
  Trash2,
} from "lucide-react";

import { VaultProvider, useVault } from "./context/VaultContext";

import Navigation from "./components/Navigation";
import NewProjectModal from "./components/NewProjectModal";
import AddMediaModal from "./components/AddMediaModal";
import Login from "./components/Login";

import LibraryGrid from "./features/library/LibraryGrid";
import MediaViewer from "./features/media/MediaViewer";

function AuthGate({ children }) {
  const { user, authReady } = useVault();

  if (!authReady) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#FFFEFA" }}
      >
        <Loader2 className="w-8 h-8 animate-spin text-black" />
      </div>
    );
  }
  if (!user) return <Login />;
  return children;
}

function AbstractCreamBackdrop({ children }) {
  return (
    <div className="min-h-screen relative" style={{ background: "#FFFEFA" }}>
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -top-28 -left-28 w-[520px] h-[520px] rounded-[48px] rotate-[18deg]"
          style={{ background: "#FFEA3A", opacity: 0.12 }}
        />
        <div
          className="absolute top-10 -right-64 w-[820px] h-[300px] rounded-[60px] rotate-[-12deg]"
          style={{ background: "#3AA8FF", opacity: 0.08 }}
        />
        <div
          className="absolute -bottom-44 left-16 w-[760px] h-[460px] rounded-[70px] rotate-[10deg]"
          style={{ background: "#54E6C1", opacity: 0.07 }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.25) 40%, rgba(255,255,255,0.55) 100%)",
            opacity: 0.55,
          }}
        />
      </div>

      {children}
    </div>
  );
}

function formatProjectDate(createdAt) {
  try {
    if (!createdAt) return "";
    if (typeof createdAt?.toDate === "function") {
      const d = createdAt.toDate();
      return d.toLocaleDateString(undefined, {
        month: "2-digit",
        day: "2-digit",
        year: "2-digit",
      });
    }
    if (typeof createdAt?.seconds === "number") {
      const d = new Date(createdAt.seconds * 1000);
      return d.toLocaleDateString(undefined, {
        month: "2-digit",
        day: "2-digit",
        year: "2-digit",
      });
    }
    const d = new Date(createdAt);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, {
        month: "2-digit",
        day: "2-digit",
        year: "2-digit",
      });
    }
  } catch {}
  return "";
}

function parseOverview(project) {
  const items = Array.isArray(project?.overviewItems)
    ? project.overviewItems.filter(Boolean)
    : [];
  if (items.length) return items.slice(0, 8);

  const raw = (project?.overview || "").trim();
  if (raw) {
    const lines = raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.replace(/^\d+\.\s*/, ""));
    if (lines.length) return lines.slice(0, 8);
  }

  const fallback = (project?.overallAudio || "").trim();
  if (!fallback) return [];
  return fallback
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 4)
    .map((l) => l.replace(/^\d+\.\s*/, ""));
}

function KebabMenu({ items = [], palette }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="w-9 h-9 rounded-[8px] inline-flex items-center justify-center"
        style={{
          background: "rgba(255,255,255,0.92)",
          border: `1px solid ${palette?.line || "rgba(0,0,0,0.10)"}`,
          color: "rgba(0,0,0,0.70)",
        }}
        aria-label="More"
        title="More"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-52 overflow-hidden z-50"
          style={{
            borderRadius: 8,
            background: "rgba(255,255,255,0.95)",
            border: `1px solid ${palette?.line || "rgba(0,0,0,0.10)"}`,
            boxShadow: "0 18px 45px -38px rgba(0,0,0,0.45)",
          }}
        >
          {items.map((it, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                it?.onClick?.();
              }}
              className="w-full px-4 py-3 flex items-center gap-3 text-sm font-semibold text-left hover:bg-black/5"
              style={{ color: it?.danger ? "#DC2626" : "rgba(0,0,0,0.78)" }}
            >
              {it?.icon ? <it.icon className="w-4 h-4" /> : null}
              {it?.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function VaultShell() {
  const bodyFont =
    '"SF Pro Text","SF Pro Display",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';
  const headerFont =
    '"Avenir Next Rounded","Avenir Next","Avenir","SF Pro Rounded","SF Pro Display","SF Pro Text",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';

  const palette = useMemo(
    () => ({
      ink: "#0B0B0C",
      paper: "#FFFEFA",
      line: "rgba(0,0,0,0.08)",
      sky: "#3AA8FF",
      sun: "#FFEA3A",
      breeze: "#54E6C1",
      accent: "rgba(255,77,46,0.95)",
      pinEdge: "rgba(0,0,0,0.14)",
    }),
    []
  );

  const {
    view,
    setView,
    tab,
    setTab,
    search,
    setSearch,

    activeProject,
    setActiveProject,

    // project actions
    addProject,
    renameProject,
    archiveProject, // ✅ pull from here (no second useVault call)

    createInvite,
    renameSession,
    deleteSession,

    // media/pins
    addMediaFilesToProject,
    addMediaToProject,
    deleteMediaFromProject,
    addHotspotToMedia,
    updateHotspotInMedia,
    deleteHotspotFromMedia,
  } = useVault();

  const [newOpen, setNewOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [autoPromptMediaPicker, setAutoPromptMediaPicker] = useState(false);

  const [prefillSessionId, setPrefillSessionId] = useState(null);
  const [prefillSessionTitle, setPrefillSessionTitle] = useState("");

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerKey, setViewerKey] = useState(null); // { sessionId, mediaId }

  const searchInputRef = useRef(null);
  useEffect(() => {
    if (view === "dashboard" && tab === "search") {
      const t = setTimeout(() => searchInputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [view, tab]);

  const flatMedia = useMemo(() => {
    const sessions = Array.isArray(activeProject?.sessions)
      ? activeProject.sessions
      : [];
    return sessions.flatMap((s) =>
      (Array.isArray(s?.media) ? s.media : []).map((m) => ({
        ...m,
        sessionId: s.id,
      }))
    );
  }, [activeProject?.sessions]);

  const selectedIndex = useMemo(() => {
    if (!viewerKey) return -1;
    return flatMedia.findIndex(
      (m) => m.id === viewerKey.mediaId && m.sessionId === viewerKey.sessionId
    );
  }, [flatMedia, viewerKey]);

  const selectedMedia = useMemo(() => {
    if (selectedIndex < 0) return null;
    return flatMedia[selectedIndex] || null;
  }, [flatMedia, selectedIndex]);

  const moreFromSession = useMemo(() => {
    if (!activeProject?.sessions || !selectedMedia?.sessionId) return [];
    const s = (activeProject.sessions || []).find(
      (x) => x?.id === selectedMedia.sessionId
    );
    const arr = Array.isArray(s?.media) ? s.media : [];
    return arr
      .filter((m) => m?.url)
      .map((m) => ({ id: m.id, url: m.url, sessionId: s?.id }));
  }, [activeProject?.sessions, selectedMedia?.sessionId]);

  const setSelectedByIndex = (idx) => {
    if (idx < 0 || idx >= flatMedia.length) return;
    const m = flatMedia[idx];
    setViewerKey({ sessionId: m.sessionId, mediaId: m.id });
  };

  const openViewer = (sessionId, mediaId) => {
    setViewerKey({ sessionId, mediaId });
    setViewerOpen(true);
  };

  const closeViewer = () => setViewerOpen(false);

  const nextMedia = () => setSelectedByIndex(selectedIndex + 1);
  const prevMedia = () => setSelectedByIndex(selectedIndex - 1);

  const handleDeleteInViewer = async () => {
    if (!activeProject?.id || !selectedMedia?.id || !selectedMedia?.sessionId) return;
    if (!confirm("Permanently delete this photo?")) return;

    const deletedIndex = selectedIndex;
    await deleteMediaFromProject(
      activeProject.id,
      selectedMedia.sessionId,
      selectedMedia.id
    );

    requestAnimationFrame(() => {
      const next =
        flatMedia[deletedIndex + 1] || flatMedia[deletedIndex - 1] || null;
      if (!next) {
        setViewerKey(null);
        setViewerOpen(false);
        return;
      }
      setViewerKey({ sessionId: next.sessionId, mediaId: next.id });
    });
  };

  const handleCreateProject = async ({ title, tags, note }) => {
    try {
      const p = await addProject({ title, aiTags: tags, note });
      setNewOpen(false);

      setActiveProject(p);
      setView("project");

      setPrefillSessionId(null);
      setPrefillSessionTitle("First Fitting");
      setAutoPromptMediaPicker(true);
      setMediaOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddMedia = async ({ files, sessionId, sessionTitle }) => {
    if (!activeProject) return;
    try {
      if (addMediaFilesToProject) {
        await addMediaFilesToProject(activeProject.id, files, sessionId, sessionTitle);
      } else {
        for (const f of (files || []).slice(0, 5)) {
          // eslint-disable-next-line no-await-in-loop
          await addMediaToProject(activeProject.id, f, sessionId, sessionTitle);
        }
      }
      setMediaOpen(false);
      setAutoPromptMediaPicker(false);
      setPrefillSessionId(null);
      setPrefillSessionTitle("");
    } catch (e) {
      console.error("Media upload failed", e);
      alert(e?.message || "Upload failed. Check console.");
    }
  };

  const openAddPhotosForSession = (session) => {
    setPrefillSessionId(session?.id || null);
    setPrefillSessionTitle(session?.title || "");
    setAutoPromptMediaPicker(false);
    setMediaOpen(true);
  };

  const openAddSession = () => {
    const title = prompt("New session name", "New Session");
    if (title == null) return;
    setPrefillSessionId(null);
    setPrefillSessionTitle(title.trim() || "New Session");
    setAutoPromptMediaPicker(false);
    setMediaOpen(true);
  };

  const goBackFromProject = () => {
    setViewerOpen(false);
    setViewerKey(null);
    setView("dashboard");
    setActiveProject(null);
  };

  // ---- kebab actions ----
  const shareProject = async () => {
    if (!activeProject?.id) return;
    try {
      const inviteId = await createInvite?.(activeProject.id, "editor");
      if (inviteId) {
        await navigator.clipboard.writeText(inviteId);
        alert("Copied invite code to clipboard.");
        return;
      }
    } catch {}

    try {
      await navigator.clipboard.writeText(activeProject.id);
      alert("Copied projectId to clipboard.");
    } catch {
      prompt("Copy projectId:", activeProject.id);
    }
  };

  const editProject = async () => {
    if (!activeProject?.id) return;
    const next = prompt("Rename project", activeProject.title || "");
    if (next == null) return;
    const title = next.trim();
    if (!title) return;
    try {
      await renameProject?.(activeProject.id, title);
    } catch (e) {
      alert(e?.message || "Rename failed.");
    }
  };

  // ✅ Send project to graveyard (soft delete)
  const removeProject = async () => {
    if (!activeProject?.id) return;
    if (!confirm('Archiv')) return;

    try {
      await archiveProject?.(activeProject.id);
      // leave project view after archiving
      setViewerOpen(false);
      setViewerKey(null);
      setActiveProject(null);
      setView("dashboard");
      setTab("archive");
    } catch (e) {
      alert(e?.message || "Archive failed.");
    }
  };

  const shareSession = async (session) => {
    if (!activeProject?.id || !session?.id) return;
    const token = `${activeProject.id}::${session.id}`;
    try {
      await navigator.clipboard.writeText(token);
      alert("Copied session token to clipboard.");
    } catch {
      prompt("Copy session token:", token);
    }
  };

  const editSession = async (session) => {
    if (!activeProject?.id || !session?.id) return;
    const next = prompt("Rename session", session.title || "");
    if (next == null) return;
    const title = next.trim();
    if (!title) return;
    try {
      await renameSession?.(activeProject.id, session.id, title);
    } catch (e) {
      alert(e?.message || "Rename failed.");
    }
  };

  const removeSession = async (session) => {
    if (!activeProject?.id || !session?.id) return;
    if (!confirm(`Delete "${session.title}" and all its photos?`)) return;
    try {
      await deleteSession?.(activeProject.id, session.id);
    } catch (e) {
      alert(e?.message || "Delete failed.");
    }
  };

  return (
    <AbstractCreamBackdrop>
      <div
        className="min-h-screen text-gray-900 flex justify-center items-center antialiased"
        style={{ fontFamily: bodyFont }}
      >
        {view === "dashboard" && (
          <Navigation currentTab={tab} setTab={setTab} />
        )}

        <div
          className={`w-full transition-all duration-300 ease-out flex justify-center ${
            view === "dashboard" ? "md:pl-64" : ""
          }`}
        >
          <div
            className="w-full max-w-md min-h-screen relative border-x"
            style={{
              background: "rgba(255,254,250,0.96)",
              borderColor: "rgba(0,0,0,0.08)",
              boxShadow: "0 18px 48px -44px rgba(0,0,0,0.28)",
            }}
          >
            {/* DASHBOARD */}
            {view === "dashboard" && (
              <div className="transition-all duration-300 ease-out">
                {tab === "search" ? (
                  <div className="px-6 pt-2">
                    <div
                      className="mt-3 px-4 py-3"
                      style={{
                        borderRadius: 0,
                        background: "rgba(255,255,255,0.82)",
                        border: `1px solid ${palette.line}`,
                      }}
                    >
                      <input
                        ref={searchInputRef}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search projects or tags…"
                        className="w-full bg-transparent outline-none text-sm"
                        style={{ color: "rgba(0,0,0,0.78)" }}
                      />
                      <div
                        className="text-[10px] mt-1"
                        style={{ color: "rgba(0,0,0,0.40)" }}
                      >
                        Try a project name or a #tag
                      </div>
                    </div>
                  </div>
                ) : null}

                <LibraryGrid
                  onQuickAdd={(project) => {
                    setActiveProject(project);
                    setView("project");
                    setPrefillSessionId(null);
                    setPrefillSessionTitle("New Session");
                    setAutoPromptMediaPicker(false);
                    setMediaOpen(true);
                  }}
                  onNew={() => setNewOpen(true)}
                />
              </div>
            )}

            {/* PROJECT PAGE */}
            {view === "project" && activeProject && (
              <div className="px-6 pt-8 pb-28">
                {/* Top row */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={goBackFromProject}
                    className="w-10 h-10 rounded-full inline-flex items-center justify-center"
                    style={{
                      background: "rgba(255,255,255,0.90)",
                      border: `1px solid ${palette.line}`,
                      boxShadow: "0 18px 45px -40px rgba(0,0,0,0.35)",
                    }}
                    aria-label="Back"
                    title="Back"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => setNewOpen(true)}
                    className="text-[12px] font-semibold tracking-[0.14em]"
                    style={{ color: palette.accent }}
                  >
                    + NEW
                  </button>
                </div>

                {/* Title + kebab */}
                <div className="mt-7 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div
                      className="text-[22px] font-semibold tracking-[0.08em] uppercase"
                      style={{
                        fontFamily: headerFont,
                        color: "rgba(0,0,0,0.85)",
                      }}
                    >
                      {(activeProject.title || "Untitled").slice(0, 18)}
                      {activeProject.title && activeProject.title.length > 18
                        ? " …"
                        : ""}
                    </div>
                    <div
                      className="mt-1 text-[12px]"
                      style={{ color: "rgba(0,0,0,0.35)" }}
                    >
                      {formatProjectDate(activeProject.createdAt) || ""}
                    </div>

                    <button
                      onClick={() => alert("Audio playback not wired yet.")}
                      className="mt-4 inline-flex items-center gap-2 text-[12px] font-semibold tracking-[0.12em]"
                      style={{ color: palette.accent }}
                    >
                      <Play className="w-4 h-4" />
                      PLAY AUDIO
                    </button>
                  </div>

                  <KebabMenu
                    palette={palette}
                    items={[
                      { label: "Edit", icon: Pencil, onClick: editProject },
                      { label: "Share", icon: Share2, onClick: shareProject },
                      {
                        label: "Delete",
                        icon: Trash2,
                        danger: true,
                        onClick: removeProject, // ✅ now defined
                      },
                    ]}
                  />
                </div>

                {/* Overview card */}
                <div className="mt-5">
                  <div
                    className="px-4 py-4"
                    style={{
                      background: "rgba(0,0,0,0.04)",
                      borderRadius: 6,
                      border: "1px solid rgba(0,0,0,0.06)",
                    }}
                  >
                    <div className="text-[12px] font-semibold tracking-[0.18em] text-black/45">
                      OVERVIEW
                    </div>

                    <ol className="mt-3 space-y-1 text-[13px] leading-relaxed text-black/70">
                      {parseOverview(activeProject).length ? (
                        parseOverview(activeProject).map((line, i) => (
                          <li key={i}>
                            {i + 1}. {line}
                          </li>
                        ))
                      ) : (
                        <li style={{ listStyle: "none" }}>No overview yet.</li>
                      )}
                    </ol>
                  </div>
                </div>

                {/* Sessions */}
                <div className="mt-10 space-y-10">
                  {(activeProject.sessions || []).map((session) => {
                    const media = Array.isArray(session?.media) ? session.media : [];
                    const thumbs = media.filter((m) => m?.url).slice(0, 3);

                    return (
                      <div key={session.id}>
                        <div className="flex items-center justify-between gap-3">
                          <div
                            className="text-[14px] font-semibold"
                            style={{
                              fontFamily: headerFont,
                              color: "rgba(0,0,0,0.80)",
                            }}
                          >
                            [{session.title || "Session"}] …
                          </div>

                          <KebabMenu
                            palette={palette}
                            items={[
                              {
                                label: "Edit",
                                icon: Pencil,
                                onClick: () => editSession(session),
                              },
                              {
                                label: "Share",
                                icon: Share2,
                                onClick: () => shareSession(session),
                              },
                              {
                                label: "Delete",
                                icon: Trash2,
                                danger: true,
                                onClick: () => removeSession(session),
                              },
                            ]}
                          />
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-3">
                          {thumbs.map((m) => (
                            <button
                              key={m.id}
                              onClick={() => openViewer(session.id, m.id)}
                              className="w-full aspect-square overflow-hidden"
                              style={{
                                borderRadius: 0,
                                background: "rgba(0,0,0,0.10)",
                                border: "1px solid rgba(0,0,0,0.06)",
                              }}
                              aria-label="Open photo"
                              title="Open photo"
                            >
                              <img
                                src={m.url}
                                alt=""
                                className="w-full h-full object-cover"
                                loading="lazy"
                                decoding="async"
                                draggable={false}
                              />
                            </button>
                          ))}

                          {Array.from({ length: Math.max(0, 3 - thumbs.length) }).map(
                            (_, i) => (
                              <div
                                key={`pad-${i}`}
                                className="w-full aspect-square"
                                style={{ background: "transparent" }}
                              />
                            )
                          )}
                        </div>

                        <button
                          onClick={() => openAddPhotosForSession(session)}
                          className="mt-3 text-[12px] font-semibold tracking-[0.12em]"
                          style={{ color: palette.accent }}
                        >
                          ADD PHOTOS
                        </button>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={openAddSession}
                  className="mt-10 inline-flex items-center gap-2 px-4 py-3 text-[12px] font-semibold tracking-[0.12em]"
                  style={{
                    borderRadius: 6,
                    border: `1px solid rgba(255,77,46,0.55)`,
                    color: palette.accent,
                    background: "transparent",
                  }}
                >
                  <Plus className="w-4 h-4" />
                  [ADD SESSION]
                </button>

                {/* Danger zone */}
                <div
                  className="mt-16 pt-10"
                  style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}
                >
                  <div className="text-[11px] font-semibold tracking-[0.18em] text-black/45">
                    DANGER ZONE
                  </div>

                  <button
                    onClick={() => removeProject()}
                    className="mt-4 text-[12px] font-semibold tracking-[0.14em]"
                    style={{ color: "rgba(220,38,38,0.95)" }}
                  >
                    ARCHIVE PROJECT
                  </button>

                  <div className="mt-2 text-[12px] text-black/45">
                    Archives this project (you can restore later).
                  </div>
                </div>
              </div>
            )}

            {/* Viewer overlay */}
            {viewerOpen && activeProject && selectedMedia && (
              <MediaViewer
                mode="modal"
                project={activeProject}
                media={selectedMedia}
                headerFont={headerFont}
                palette={palette}
                mediaIndex={Math.max(0, selectedIndex)}
                mediaCount={flatMedia.length}
                moreFromSession={moreFromSession}
                onSelectMedia={(m) => openViewer(m.sessionId, m.id)}
                onPrev={prevMedia}
                onNext={nextMedia}
                onSwipeDown={closeViewer}
                onBack={closeViewer}
                onDeleteMedia={handleDeleteInViewer}
                onAddHotspot={addHotspotToMedia}
                onUpdateHotspot={updateHotspotInMedia}
                onDeleteHotspot={deleteHotspotFromMedia}
              />
            )}

            {/* Modals */}
            <NewProjectModal
              open={newOpen}
              onClose={() => setNewOpen(false)}
              onCreate={handleCreateProject}
            />

            <AddMediaModal
              isOpen={mediaOpen}
              onClose={() => {
                setMediaOpen(false);
                setAutoPromptMediaPicker(false);
                setPrefillSessionId(null);
                setPrefillSessionTitle("");
              }}
              project={activeProject}
              onAddMedia={(payload) =>
                handleAddMedia({
                  ...payload,
                  sessionId: payload.sessionId ?? prefillSessionId,
                  sessionTitle: payload.sessionTitle ?? prefillSessionTitle,
                })
              }
              mode="upload"
              existingSessions={activeProject?.sessions || []}
              autoPrompt={autoPromptMediaPicker}
              autoSubmit={autoPromptMediaPicker}
              defaultSessionId={prefillSessionId}
              defaultSessionTitle={prefillSessionTitle}
            />
          </div>
        </div>
      </div>
    </AbstractCreamBackdrop>
  );
}

export default function App() {
  return (
    <VaultProvider>
      <AuthGate>
        <VaultShell />
      </AuthGate>
    </VaultProvider>
  );
}
