// /src/App.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  Share,
  Plus,
  Trash2,
  Upload,
  Loader2,
  Play,
  MoreHorizontal,
  Pencil,
  Check,
} from "lucide-react";

import { VaultProvider, useVault } from "./context/VaultContext";

import Navigation from "./components/Navigation";
import MediaCard from "./components/MediaCard";
import NewProjectModal from "./components/NewProjectModal";
import AddMediaModal from "./components/AddMediaModal";
import LibraryGrid from "./features/library/LibraryGrid";
import Login from "./components/Login";

import MediaViewer from "./features/media/MediaViewer";

function AuthGate({ children }) {
  const { user, authReady } = useVault();

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#FFFEFA" }}>
        <Loader2 className="w-8 h-8 animate-spin text-black" />
      </div>
    );
  }
  if (!user) return <Login />;
  return children;
}

function BrandMark() {
  const headerFont =
    '"Avenir Next Rounded","Avenir Next","Avenir","SF Pro Rounded","SF Pro Display","SF Pro Text",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';

  const palette = { sky: "#3AA8FF", sun: "#FFEA3A" };

  return (
    <div className="text-[20px] font-bold tracking-[-0.01em] leading-none select-none" style={{ fontFamily: headerFont }}>
      <span style={{ color: palette.sky }}>[</span>
      <span style={{ letterSpacing: "0.08em" }}>Index</span>
      <span style={{ color: palette.sun }}>]</span>
    </div>
  );
}

function TileButton({ variant = "primary", icon: Icon, children, style, ...props }) {
  const isPrimary = variant === "primary";

  return (
    <button
      {...props}
      className={[
        "h-11 px-4 rounded-[14px] inline-flex items-center gap-2",
        "text-xs font-black uppercase tracking-[0.12em]",
        "active:scale-[0.985] transition-all duration-200 ease-out",
        "focus:outline-none focus:ring-2 focus:ring-black/10",
      ].join(" ")}
      style={{
        background: isPrimary ? "#FFEA3A" : "rgba(255,255,255,0.70)",
        color: "rgba(0,0,0,0.82)",
        border: "1px solid rgba(0,0,0,0.10)",
        boxShadow: isPrimary
          ? "0 14px 30px -22px rgba(0,0,0,0.28)"
          : "0 14px 30px -30px rgba(0,0,0,0.20)",
        backdropFilter: "blur(16px)",
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0px)";
      }}
    >
      {Icon ? <Icon className="w-4 h-4" /> : null}
      <span>{children}</span>
    </button>
  );
}

function ProfileMenu({ user, onSignOut, palette }) {
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

  const name = user?.displayName || user?.email || "You";
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  const src = user?.photoURL || "";

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shrink-0"
        style={{
          background: "rgba(255,255,255,0.70)",
          border: `1px solid ${palette?.line || "rgba(0,0,0,0.10)"}`,
          boxShadow: "0 14px 30px -26px rgba(0,0,0,0.25)",
          backdropFilter: "blur(16px)",
        }}
        title={name}
        aria-label="Profile"
      >
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs font-black" style={{ color: "rgba(0,0,0,0.75)" }}>
            {initials || "ME"}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-60 overflow-hidden z-50"
          style={{
            borderRadius: 14,
            background: "rgba(255,255,255,0.86)",
            border: `1px solid ${palette?.line || "rgba(0,0,0,0.10)"}`,
            backdropFilter: "blur(18px)",
            boxShadow: "0 18px 45px -38px rgba(0,0,0,0.45)",
          }}
        >
          <div className="px-4 py-3">
            <div className="text-sm font-semibold text-black/80 truncate">{user?.displayName || "Account"}</div>
            <div className="text-xs text-black/50 truncate">{user?.email || ""}</div>
          </div>

          <div style={{ borderTop: `1px solid ${palette?.line || "rgba(0,0,0,0.10)"}` }} />

          <button
            onClick={() => {
              setOpen(false);
              onSignOut?.();
            }}
            className="w-full px-4 py-3 flex items-center gap-3 text-sm font-semibold text-left hover:bg-black/5"
            style={{ color: "rgba(0,0,0,0.78)" }}
          >
            Switch user
          </button>

          <button
            onClick={() => {
              setOpen(false);
              onSignOut?.();
            }}
            className="w-full px-4 py-3 flex items-center gap-3 text-sm font-semibold text-left hover:bg-black/5"
            style={{ color: "#DC2626" }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
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
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="w-9 h-9 rounded-[10px] inline-flex items-center justify-center"
        style={{
          background: "rgba(255,255,255,0.70)",
          border: `1px solid ${palette?.line || "rgba(0,0,0,0.10)"}`,
          color: "rgba(0,0,0,0.70)",
          backdropFilter: "blur(14px)",
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
            borderRadius: 14,
            background: "rgba(255,255,255,0.86)",
            border: `1px solid ${palette?.line || "rgba(0,0,0,0.10)"}`,
            backdropFilter: "blur(18px)",
            boxShadow: "0 18px 45px -38px rgba(0,0,0,0.45)",
          }}
        >
          {items.map((it, idx) => (
            <button
              key={idx}
              onClick={() => {
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

function AbstractCreamBackdrop({ children }) {
  const palette = useMemo(
    () => ({
      paper: "#FFFEFA",
      sky: "#3AA8FF",
      sun: "#FFEA3A",
      breeze: "#54E6C1",
    }),
    []
  );

  return (
    <div className="min-h-screen relative" style={{ background: palette.paper }}>
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -top-28 -left-28 w-[520px] h-[520px] rounded-[48px] rotate-[18deg]"
          style={{ background: palette.sun, opacity: 0.16 }}
        />
        <div
          className="absolute top-10 -right-64 w-[820px] h-[300px] rounded-[60px] rotate-[-12deg]"
          style={{ background: palette.sky, opacity: 0.1 }}
        />
        <div
          className="absolute -bottom-44 left-16 w-[760px] h-[460px] rounded-[70px] rotate-[10deg]"
          style={{ background: palette.breeze, opacity: 0.09 }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.45) 40%, rgba(255,255,255,0.78) 100%)",
            opacity: 0.7,
          }}
        />
      </div>

      {children}
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
      cloud: "#FFFFFF",
      line: "rgba(0,0,0,0.08)",
      sky: "#3AA8FF",
      sun: "#FFEA3A",
      breeze: "#54E6C1",
      pinEdge: "rgba(0,0,0,0.14)",
    }),
    []
  );

  const {
    user,
    view,
    setView,
    tab,
    setTab,

    // search UI
    search,
    setSearch,

    activeProject,
    setActiveProject,
    activeMedia,
    setActiveMedia,

    addProject,
    renameProject,
    addMediaToProject,
    deleteProject,
    renameSession,
    deleteSession,
    deleteMediaFromProject,
    bulkDeleteMediaFromSession,

    addHotspotToMedia,
    updateHotspotInMedia,
    deleteHotspotFromMedia,

    signOutUser,
  } = useVault();

  const [newOpen, setNewOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [autoPromptMediaPicker, setAutoPromptMediaPicker] = useState(false);

  // focus search input when Search tab opens
  const searchInputRef = useRef(null);
  useEffect(() => {
    if (view === "dashboard" && tab === "search") {
      const t = setTimeout(() => searchInputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [view, tab]);

  // -----------------------------
  // Multi-select (Apple-style)
  // -----------------------------
  const [selectMode, setSelectMode] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  useEffect(() => {
    if (view !== "project") {
      setSelectMode(false);
      setSelectedSessionId(null);
      setSelectedIds(new Set());
    }
  }, [view, activeProject?.id]);

  const exitSelect = () => {
    setSelectMode(false);
    setSelectedSessionId(null);
    setSelectedIds(new Set());
  };

  const enterSelect = (sessionId, mediaId) => {
    setSelectMode(true);
    setSelectedSessionId(sessionId);
    setSelectedIds(new Set([mediaId]));
  };

  const toggleSelect = (sessionId, mediaId) => {
    if (!selectMode || selectedSessionId !== sessionId) {
      enterSelect(sessionId, mediaId);
      return;
    }

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(mediaId)) next.delete(mediaId);
      else next.add(mediaId);

      if (next.size === 0) {
        setSelectMode(false);
        setSelectedSessionId(null);
      }
      return next;
    });
  };

  const deleteSelected = async () => {
    if (!activeProject?.id || !selectedSessionId || selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} item(s)?`)) return;

    const ids = Array.from(selectedIds);

    if (bulkDeleteMediaFromSession) {
      await bulkDeleteMediaFromSession(activeProject.id, selectedSessionId, ids);
    } else {
      for (const id of ids) {
        // eslint-disable-next-line no-await-in-loop
        await deleteMediaFromProject(activeProject.id, selectedSessionId, id);
      }
    }

    exitSelect();
  };

  // -----------------------------
  // Navigation helpers
  // -----------------------------
  const goBack = () => {
    if (selectMode) {
      exitSelect();
      return;
    }

    if (view === "media") {
      setView("project");
      setActiveMedia(null);
      return;
    }

    setView("dashboard");
    setActiveProject(null);
    setActiveMedia(null);
  };

  const navigateToMedia = (m, sessionId) => {
    setActiveMedia({ ...m, sessionId });
    setView("media");
  };

  const handleQuickAdd = (project) => {
    setActiveProject(project);
    setAutoPromptMediaPicker(false);
    setMediaOpen(true);
  };

  // Create project + auto-open upload
  const handleCreateProject = async ({ title, tags, note }) => {
    try {
      const p = await addProject({ title, aiTags: tags, note });
      setNewOpen(false);

      setActiveProject(p);
      setView("project");

      setAutoPromptMediaPicker(true);
      setMediaOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddMedia = async ({ file, sessionId, sessionTitle }) => {
    if (!activeProject) return;
    try {
      await addMediaToProject(activeProject.id, file, sessionId, sessionTitle);
      setMediaOpen(false);
      setAutoPromptMediaPicker(false);
    } catch (e) {
      console.error("Media upload failed", e);
    }
  };

  const handleDeleteProject = async () => {
    if (!activeProject) return;
    if (!confirm("Nuke this entire project?")) return;
    await deleteProject(activeProject.id);
  };

  const handleRenameProject = async () => {
    if (!activeProject?.id) return;
    const next = prompt("Rename project", activeProject.title || "");
    if (next == null) return;
    try {
      await renameProject?.(activeProject.id, next);
    } catch (e) {
      alert(e?.message || "Rename failed.");
    }
  };

  const shareProject = async () => {
    if (!activeProject?.id) return;

    try {
      if (navigator?.share) {
        await navigator.share({
          title: activeProject.title || "Index project",
          text: `Index project: ${activeProject.title || "Untitled"}`,
        });
        return;
      }
    } catch (_e) {}

    try {
      await navigator.clipboard.writeText(activeProject.id);
      alert("Copied project share token (projectId) to clipboard.");
    } catch (_e) {
      prompt("Copy projectId:", activeProject.id);
    }
  };

  const shareSession = async (session) => {
    if (!activeProject?.id || !session?.id) return;
    const token = `${activeProject.id}::${session.id}`;
    try {
      await navigator.clipboard.writeText(token);
      alert("Copied session share token to clipboard.");
    } catch (_e) {
      prompt("Copy session token:", token);
    }
  };

  const handleRenameSession = async (session) => {
    if (!activeProject?.id || !session?.id) return;
    const next = prompt("Rename session", session.title || "");
    if (next == null) return;
    try {
      await renameSession?.(activeProject.id, session.id, next);
    } catch (e) {
      alert(e?.message || "Rename failed.");
    }
  };

  // -----------------------------
  // Media (viewer helpers)
  // -----------------------------
  const currentSession = useMemo(() => {
    if (!activeProject || !activeMedia?.sessionId) return null;
    return (activeProject.sessions || []).find((s) => s.id === activeMedia.sessionId) || null;
  }, [activeProject, activeMedia?.sessionId]);

  const currentMedia = useMemo(() => {
    if (!activeProject || !activeMedia?.id || !activeMedia?.sessionId) return null;
    const s = (activeProject.sessions || []).find((ss) => ss.id === activeMedia.sessionId);
    if (!s) return null;
    const m = (s.media || []).find((mm) => mm.id === activeMedia.id);
    if (!m) return null;
    return { ...m, sessionId: s.id };
  }, [activeProject, activeMedia?.id, activeMedia?.sessionId]);

  const sessionMediaList = currentSession?.media || [];

  const mediaIndex = useMemo(() => {
    if (!currentMedia?.id) return 0;
    const idx = sessionMediaList.findIndex((m) => m.id === currentMedia.id);
    return Math.max(0, idx);
  }, [sessionMediaList, currentMedia?.id]);

  const goToMediaIndex = (idx) => {
    if (!currentSession) return;
    if (idx < 0 || idx >= sessionMediaList.length) return;
    const m = sessionMediaList[idx];
    setActiveMedia({ ...m, sessionId: currentSession.id });
  };

  const goPrev = () => goToMediaIndex(mediaIndex - 1);
  const goNext = () => goToMediaIndex(mediaIndex + 1);

  const handleDeleteCurrentMedia = async () => {
    if (!activeProject || !activeMedia?.id || !activeMedia?.sessionId) return;
    if (!confirm("Permanently delete this photo?")) return;
    await deleteMediaFromProject(activeProject.id, activeMedia.sessionId, activeMedia.id);
    setActiveMedia(null);
    setView("project");
  };

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <AbstractCreamBackdrop>
      <div
        className="min-h-screen text-gray-900 flex justify-center items-center antialiased selection:bg-black selection:text-white"
        style={{ fontFamily: bodyFont }}
      >
        {view === "dashboard" && <Navigation currentTab={tab} setTab={setTab} />}

        <div className={`w-full transition-all duration-300 ease-out flex justify-center ${view === "dashboard" ? "md:pl-64" : ""}`}>
          <div
            className={`w-full ${view === "dashboard" ? "max-w-md" : "max-w-6xl"} min-h-screen relative border-x`}
            style={{
              background: "rgba(255,255,255,0.68)",
              borderColor: "rgba(0,0,0,0.08)",
              backdropFilter: "blur(18px)",
              boxShadow: "0 22px 60px -52px rgba(0,0,0,0.35)",
            }}
          >
            {/* DASHBOARD */}
            {view === "dashboard" && (
              <div className="p-5 transition-all duration-300 ease-out">
                {/* Header: left add, center logo, right profile */}
                <div className="relative pt-8 mb-2">
                  <div className="h-12 relative">
                    <div className="absolute inset-0 flex items-center justify-between">
                      <button
                        onClick={() => setNewOpen(true)}
                        className="w-10 h-10 rounded-full inline-flex items-center justify-center active:scale-[0.97] transition-transform duration-200 ease-out"
                        style={{
                          background: palette.sun,
                          border: "1px solid rgba(0,0,0,0.10)",
                          boxShadow: "0 14px 30px -26px rgba(0,0,0,0.28)",
                        }}
                        aria-label="Start project"
                        title="Start project"
                      >
                        <Plus className="w-5 h-5" style={{ color: palette.ink }} />
                      </button>

                      <ProfileMenu user={user} palette={palette} onSignOut={() => signOutUser?.()} />
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="pointer-events-auto" style={{ fontFamily: headerFont }}>
                        <BrandMark />
                      </div>
                    </div>
                  </div>

                  {/* Smooth search bar reveal */}
                  <div
                    className="overflow-hidden transition-all duration-300 ease-out"
                    style={{
                      maxHeight: tab === "search" ? 72 : 0,
                      opacity: tab === "search" ? 1 : 0,
                      transform: tab === "search" ? "translateY(0px)" : "translateY(-6px)",
                    }}
                  >
                    <div
                      className="mt-3 px-4 py-3 rounded-[14px]"
                      style={{
                        background: "rgba(255,255,255,0.72)",
                        border: `1px solid ${palette.line}`,
                        backdropFilter: "blur(16px)",
                        boxShadow: "0 14px 30px -30px rgba(0,0,0,0.22)",
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
                      <div className="text-[10px] mt-1" style={{ color: "rgba(0,0,0,0.40)" }}>
                        Try a project name or a #tag
                      </div>
                    </div>
                  </div>
                </div>

                <LibraryGrid onQuickAdd={handleQuickAdd} />
              </div>
            )}

            {/* PROJECT VIEW */}
            {view === "project" && activeProject && (
              <>
                {/* PROJECT TOP BAR */}
                <div
                  className="px-4 pt-12 pb-3 flex justify-between items-center z-40 sticky top-0"
                  style={{
                    background: "rgba(255,255,255,0.70)",
                    backdropFilter: "blur(16px)",
                    borderBottom: "1px solid rgba(0,0,0,0.08)",
                  }}
                >
                  <button
                    onClick={goBack}
                    className="flex items-center gap-1 text-gray-700 hover:text-black transition-colors px-2 py-2 rounded-[8px]"
                    style={{
                      background: "rgba(255,255,255,0.45)",
                      border: "1px solid rgba(0,0,0,0.06)",
                    }}
                  >
                    <ChevronLeft className="w-6 h-6" />
                    <span className="font-semibold text-sm">{selectMode ? "Cancel" : "Back"}</span>
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteProject}
                      className="p-2 rounded-[8px] transition-colors"
                      style={{
                        background: "rgba(255,255,255,0.55)",
                        border: "1px solid rgba(0,0,0,0.08)",
                        color: "#DC2626",
                      }}
                      title="Delete project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      className="flex items-center gap-2 px-3 py-2 rounded-[8px] text-[11px] font-semibold"
                      style={{
                        background: palette.sun,
                        color: palette.ink,
                        border: "1px solid rgba(0,0,0,0.10)",
                      }}
                    >
                      <Share className="w-4 h-4" /> Export
                    </button>
                  </div>
                </div>

                <div className="p-5 md:p-10 transition-all duration-300 ease-out">
                  <div className="flex items-start justify-between gap-4">
                    <h2
                      className="text-4xl md:text-6xl font-semibold mb-6 leading-none tracking-[-0.02em]"
                      style={{ fontFamily: headerFont, color: palette.ink }}
                    >
                      {activeProject.title}
                    </h2>

                    <div className="pt-2">
                      <KebabMenu
                        palette={palette}
                        items={[
                          { label: "Share", icon: Share, onClick: shareProject },
                          { label: "Edit", icon: Pencil, onClick: handleRenameProject },
                          { label: "Delete", icon: Trash2, danger: true, onClick: handleDeleteProject },
                        ]}
                      />
                    </div>
                  </div>

                  <div className="mb-6">
                    <TileButton
                      variant="secondary"
                      icon={Upload}
                      onClick={() => {
                        setAutoPromptMediaPicker(false);
                        setMediaOpen(true);
                      }}
                      style={{
                        border: `1px solid ${palette.line}`,
                        color: "rgba(0,0,0,0.75)",
                      }}
                    >
                      Add Media
                    </TileButton>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-8">
                    {(activeProject.aiTags || []).map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] font-semibold px-3 py-1 rounded-[8px]"
                        style={{
                          background: "rgba(255,255,255,0.55)",
                          border: "1px solid rgba(0,0,0,0.08)",
                          color: "rgba(0,0,0,0.55)",
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {activeProject.overallAudio && (
                    <div
                      className="p-6 mb-10 flex gap-4 rounded-[12px]"
                      style={{
                        background: "rgba(255,255,255,0.62)",
                        border: "1px solid rgba(0,0,0,0.08)",
                        backdropFilter: "blur(16px)",
                        boxShadow: "0 22px 60px -52px rgba(0,0,0,0.28)",
                      }}
                    >
                      <button
                        className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center shrink-0 shadow-lg hover:scale-[1.02] transition-transform duration-200 ease-out"
                        title="Play"
                      >
                        <Play className="w-5 h-5 ml-1" />
                      </button>

                      <div className="flex-1">
                        <p className="text-[10px] font-semibold text-black/45 uppercase tracking-widest mb-1">
                          Project Context
                        </p>
                        <p className="text-sm text-gray-900 leading-relaxed">“{activeProject.overallAudio}”</p>
                      </div>
                    </div>
                  )}

                  {(activeProject.sessions || []).map((session) => (
                    <div key={session.id} className="mb-12">
                      <div className="flex justify-between items-baseline pb-2 mb-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <h3 className="text-sm font-semibold truncate" style={{ fontFamily: headerFont }}>
                            {session.title}
                          </h3>

                          <KebabMenu
                            palette={palette}
                            items={[
                              { label: "Share", icon: Share, onClick: () => shareSession(session) },
                              { label: "Edit", icon: Pencil, onClick: () => handleRenameSession(session) },
                              {
                                label: "Delete",
                                icon: Trash2,
                                danger: true,
                                onClick: () => {
                                  if (!confirm(`Delete "${session.title}" and all its photos?`)) return;
                                  deleteSession?.(activeProject.id, session.id);
                                },
                              },
                            ]}
                          />
                        </div>

                        <p className="text-xs text-black/40">{session.date}</p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {(session.media || []).map((m) => {
                          const inThisSession = selectMode && selectedSessionId === session.id;
                          const isSelected = inThisSession && selectedIds.has(m.id);

                          return (
                            <MediaCard
                              key={m.id}
                              item={m}
                              selectionMode={inThisSession}
                              selected={isSelected}
                              onLongPress={() => enterSelect(session.id, m.id)}
                              onToggleSelect={() => toggleSelect(session.id, m.id)}
                              onClick={() => {
                                if (inThisSession) toggleSelect(session.id, m.id);
                                else navigateToMedia(m, session.id);
                              }}
                              onDelete={
                                inThisSession ? null : () => deleteMediaFromProject(activeProject.id, session.id, m.id)
                              }
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Sticky selected bar (shows only in selection mode) */}
                  {selectMode && selectedSessionId && (
                    <div className="sticky bottom-0 pb-5">
                      <div
                        className="mx-auto mt-6 px-4 py-3 flex items-center justify-between gap-3"
                        style={{
                          borderRadius: 18,
                          background: "rgba(255,255,255,0.82)",
                          border: `1px solid ${palette.line}`,
                          backdropFilter: "blur(18px)",
                          boxShadow: "0 22px 60px -52px rgba(0,0,0,0.45)",
                        }}
                      >
                        <div className="text-sm font-semibold" style={{ color: "rgba(0,0,0,0.75)" }}>
                          {selectedIds.size} selected
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={exitSelect}
                            className="h-10 px-4 text-sm font-semibold"
                            style={{
                              borderRadius: 14,
                              background: "transparent",
                              border: `1px solid ${palette.line}`,
                              color: "rgba(0,0,0,0.55)",
                            }}
                          >
                            Cancel
                          </button>

                          <button
                            onClick={deleteSelected}
                            className="h-10 px-4 text-sm font-semibold inline-flex items-center gap-2"
                            style={{
                              borderRadius: 14,
                              background: "rgba(220,38,38,0.10)",
                              border: "1px solid rgba(220,38,38,0.25)",
                              color: "#DC2626",
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* MEDIA VIEW */}
            {view === "media" && activeProject && currentMedia && (
              <MediaViewer
                project={activeProject}
                media={currentMedia}
                headerFont={headerFont}
                palette={palette}
                mediaIndex={mediaIndex}
                mediaCount={sessionMediaList.length}
                onBack={() => {
                  setView("project");
                  setActiveMedia(null);
                }}
                onPrev={goPrev}
                onNext={goNext}
                onDeleteMedia={handleDeleteCurrentMedia}
                onAddHotspot={addHotspotToMedia}
                onUpdateHotspot={updateHotspotInMedia}
                onDeleteHotspot={deleteHotspotFromMedia}
              />
            )}

            {/* Modals */}
            <NewProjectModal open={newOpen} onClose={() => setNewOpen(false)} onCreate={handleCreateProject} />

            <AddMediaModal
              isOpen={mediaOpen}
              onClose={() => {
                setMediaOpen(false);
                setAutoPromptMediaPicker(false);
              }}
              project={activeProject}
              onAddMedia={handleAddMedia}
              mode="upload"
              existingSessions={activeProject?.sessions || []}
              autoPrompt={autoPromptMediaPicker}
              autoSubmit={autoPromptMediaPicker}
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
