// /src/App.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  Share,
  Plus,
  Trash2,
  Upload,
  Loader2,
  MoreHorizontal,
  Pencil,
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
        "h-11 px-4 rounded-[8px] inline-flex items-center gap-2",
        "text-xs font-black uppercase tracking-[0.12em]",
        "active:scale-[0.985] transition-all duration-200 ease-out",
        "focus:outline-none focus:ring-2 focus:ring-black/10",
      ].join(" ")}
      style={{
        background: isPrimary ? "#FFEA3A" : "rgba(255,255,255,0.78)",
        color: "rgba(0,0,0,0.82)",
        border: "1px solid rgba(0,0,0,0.10)",
        boxShadow: isPrimary
          ? "0 14px 30px -22px rgba(0,0,0,0.28)"
          : "0 14px 30px -30px rgba(0,0,0,0.20)",
        ...style,
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
          background: "rgba(255,255,255,0.78)",
          border: `1px solid ${palette?.line || "rgba(0,0,0,0.10)"}`,
          boxShadow: "0 14px 30px -26px rgba(0,0,0,0.25)",
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
            borderRadius: 8,
            background: "rgba(255,255,255,0.92)",
            border: `1px solid ${palette?.line || "rgba(0,0,0,0.10)"}`,
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
        className="w-9 h-9 rounded-[8px] inline-flex items-center justify-center"
        style={{
          background: "rgba(255,255,255,0.78)",
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
            background: "rgba(255,255,255,0.92)",
            border: `1px solid ${palette?.line || "rgba(0,0,0,0.10)"}`,
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
    <div className="min-h-screen relative" style={{ background: "#FFFEFA" }}>
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -top-28 -left-28 w-[520px] h-[520px] rounded-[48px] rotate-[18deg]"
          style={{ background: palette.sun, opacity: 0.12 }}
        />
        <div
          className="absolute top-10 -right-64 w-[820px] h-[300px] rounded-[60px] rotate-[-12deg]"
          style={{ background: palette.sky, opacity: 0.08 }}
        />
        <div
          className="absolute -bottom-44 left-16 w-[760px] h-[460px] rounded-[70px] rotate-[10deg]"
          style={{ background: palette.breeze, opacity: 0.07 }}
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

    search,
    setSearch,

    activeProject,
    setActiveProject,

    addProject,
    renameProject,
    addMediaToProject,
    addMediaFilesToProject,
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

  // Search focus
  const searchInputRef = useRef(null);
  useEffect(() => {
    if (view === "dashboard" && tab === "search") {
      const t = setTimeout(() => searchInputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [view, tab]);

  // Multi-select (unchanged)
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

  // Project media selection (Pinterest-style)
  const [detailOpen, setDetailOpen] = useState(true);
  const [selectedKey, setSelectedKey] = useState(null); // { sessionId, mediaId }
  const gridTopRef = useRef(null);

  // Flatten media in project order: session order, then media order
  const flatMedia = useMemo(() => {
    const sessions = Array.isArray(activeProject?.sessions) ? activeProject.sessions : [];
    return sessions.flatMap((s) =>
      (Array.isArray(s?.media) ? s.media : []).map((m) => ({ ...m, sessionId: s.id }))
    );
  }, [activeProject?.sessions]);

  // Initialize selection when opening a project
  useEffect(() => {
    if (view !== "project" || !activeProject?.id) return;

    // default pick: first media in project (if any)
    const first = flatMedia[0] || null;
    if (!first) {
      setSelectedKey(null);
      setDetailOpen(false);
      return;
    }

    setSelectedKey((prev) => prev || { sessionId: first.sessionId, mediaId: first.id });
    setDetailOpen(true);
  }, [view, activeProject?.id, flatMedia]);

  const selectedIndex = useMemo(() => {
    if (!selectedKey) return -1;
    return flatMedia.findIndex((m) => m.id === selectedKey.mediaId && m.sessionId === selectedKey.sessionId);
  }, [flatMedia, selectedKey]);

  const selectedMedia = useMemo(() => {
    if (selectedIndex < 0) return null;
    return flatMedia[selectedIndex] || null;
  }, [flatMedia, selectedIndex]);

  const setSelectedByIndex = (idx) => {
    if (idx < 0 || idx >= flatMedia.length) return;
    const m = flatMedia[idx];
    setSelectedKey({ sessionId: m.sessionId, mediaId: m.id });
    setDetailOpen(true);
  };

  const nextMedia = () => setSelectedByIndex(selectedIndex + 1);
  const prevMedia = () => setSelectedByIndex(selectedIndex - 1);

  const closeToGrid = () => {
    setDetailOpen(false);
    // snap to where the grid starts (feels like Pinterest)
    requestAnimationFrame(() => {
      gridTopRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    });
  };

  const openFromThumb = (sessionId, mediaId) => {
    setSelectedKey({ sessionId, mediaId });
    setDetailOpen(true);
    // pull the detail card into view
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  };

  // Navigation
  const goBack = () => {
    if (selectMode) {
      exitSelect();
      return;
    }
    setView("dashboard");
    setActiveProject(null);
    setSelectedKey(null);
    setDetailOpen(true);
  };

  const handleQuickAdd = (project) => {
    setActiveProject(project);
    setAutoPromptMediaPicker(false);
    setMediaOpen(true);
  };

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

const handleAddMedia = async ({ files, sessionId, sessionTitle }) => {
  if (!activeProject) return;
  try {
    // preferred: one session, up to 5 files, single write to Firestore
    if (addMediaFilesToProject) {
      await addMediaFilesToProject(activeProject.id, files, sessionId, sessionTitle);
    } else {
      // fallback (older context): sequential single uploads (will create multiple sessions if sessionId is null)
      for (const f of (files || []).slice(0, 5)) {
        // eslint-disable-next-line no-await-in-loop
        await addMediaToProject(activeProject.id, f, sessionId, sessionTitle);
      }
    }

    setMediaOpen(false);
    setAutoPromptMediaPicker(false);
  } catch (e) {
    console.error("Media upload failed", e);
    alert(e?.message || "Upload failed. Check console.");
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

  const handleDeleteSelectedMedia = async () => {
    if (!activeProject?.id || !selectedMedia?.id || !selectedMedia?.sessionId) return;
    if (!confirm("Permanently delete this photo?")) return;

    const deletedIndex = selectedIndex;

    await deleteMediaFromProject(activeProject.id, selectedMedia.sessionId, selectedMedia.id);

    // After delete: select next item if exists, else prev, else close detail
    requestAnimationFrame(() => {
      const next = flatMedia[deletedIndex + 1] || flatMedia[deletedIndex - 1] || null;
      if (!next) {
        setSelectedKey(null);
        setDetailOpen(false);
        return;
      }
      setSelectedKey({ sessionId: next.sessionId, mediaId: next.id });
      setDetailOpen(true);
    });
  };

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
              background: "rgba(255,254,250,0.96)",
              borderColor: "rgba(0,0,0,0.08)",
              boxShadow: "0 18px 48px -44px rgba(0,0,0,0.28)",
            }}
          >
            {/* DASHBOARD */}
            {view === "dashboard" && (
              <div className="p-5 transition-all duration-300 ease-out">
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

                  <div
                    className="overflow-hidden transition-all duration-300 ease-out"
                    style={{
                      maxHeight: tab === "search" ? 72 : 0,
                      opacity: tab === "search" ? 1 : 0,
                      transform: tab === "search" ? "translateY(0px)" : "translateY(-6px)",
                    }}
                  >
                    <div
                      className="mt-3 px-4 py-3 rounded-[8px]"
                      style={{
                        background: "rgba(255,255,255,0.82)",
                        border: `1px solid ${palette.line}`,
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
                {/* Sticky header row */}
                <div
                  className="px-4 pt-10 md:pt-12 pb-4 sticky top-0 z-40"
                  style={{ background: "rgba(255,254,250,0.90)" }}
                >
                  <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <button
                      onClick={selectMode ? exitSelect : goBack}
                      className="w-10 h-10 rounded-full inline-flex items-center justify-center"
                      style={{
                        background: "rgba(255,255,255,0.90)",
                        border: `1px solid ${palette.line}`,
                        boxShadow: "0 18px 45px -40px rgba(0,0,0,0.35)",
                      }}
                      aria-label={selectMode ? "Cancel selection" : "Back"}
                      title={selectMode ? "Cancel" : "Back"}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-2">
                      <TileButton
                        variant="secondary"
                        icon={Upload}
                        onClick={() => {
                          setAutoPromptMediaPicker(false);
                          setMediaOpen(true);
                        }}
                        style={{ height: 40, borderRadius: 999, paddingLeft: 14, paddingRight: 14 }}
                      >
                        Add
                      </TileButton>

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
                </div>

                <div className="px-4 pb-24 md:pb-28">
                  <div className="max-w-5xl mx-auto">
                    {/* Title + meta */}
                    <div className="mt-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2
                          className="text-[26px] md:text-[34px] font-semibold tracking-[-0.02em] leading-tight"
                          style={{ fontFamily: headerFont, color: palette.ink }}
                        >
                          {activeProject.title}
                        </h2>
                        <div className="mt-1 text-[12px] text-black/45">
                          {activeProject.expiresIn ? `Expires in ${activeProject.expiresIn}` : ""}
                        </div>
                      </div>

                      <button
                        onClick={handleDeleteProject}
                        className="w-10 h-10 rounded-full inline-flex items-center justify-center"
                        style={{
                          background: "rgba(255,255,255,0.90)",
                          border: `1px solid ${palette.line}`,
                          color: "#DC2626",
                        }}
                        title="Delete project"
                        aria-label="Delete project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-6 mt-5">
                      {(activeProject.aiTags || []).map((tag) => (
                        <span
                          key={tag}
                          className="text-[11px] font-semibold px-3 py-1 rounded-[8px]"
                          style={{
                            background: "rgba(255,255,255,0.70)",
                            border: "1px solid rgba(0,0,0,0.08)",
                            color: "rgba(0,0,0,0.55)",
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    {/* Embedded “selected photo” detail (Pinterest pin) */}
                    {detailOpen && selectedMedia && (
                      <div className="mb-8">
                        <MediaViewer
                          mode="embedded"
                          project={activeProject}
                          media={selectedMedia}
                          headerFont={headerFont}
                          palette={palette}
                          mediaIndex={Math.max(0, selectedIndex)}
                          mediaCount={flatMedia.length}
                          onPrev={prevMedia}
                          onNext={nextMedia}
                          onSwipeDown={closeToGrid}
                          onDeleteMedia={handleDeleteSelectedMedia}
                          onAddHotspot={addHotspotToMedia}
                          onUpdateHotspot={updateHotspotInMedia}
                          onDeleteHotspot={deleteHotspotFromMedia}
                        />
                      </div>
                    )}

                    {/* Grid start target */}
                    <div ref={gridTopRef} />

                    {/* Sessions (Pinterest “more to explore” rails) */}
                    {(activeProject.sessions || []).map((session) => {
                      const inThisSession = selectMode && selectedSessionId === session.id;

                      return (
                        <div key={session.id} className="mt-10">
                          <div className="flex items-center justify-between mb-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="text-[13px] font-semibold truncate" style={{ fontFamily: headerFont }}>
                                  {session.title}
                                </h3>
                                <span className="text-[11px] text-black/40">{session.date}</span>
                              </div>
                              <div className="text-[11px] text-black/45 mt-0.5">
                                {(session.media || []).length} items
                              </div>
                            </div>

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

                          {inThisSession ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                              {(session.media || []).map((m) => {
                                const isSelected = selectedIds.has(m.id);
                                return (
                                  <MediaCard
                                    key={m.id}
                                    item={m}
                                    variant="square"
                                    selectionMode
                                    selected={isSelected}
                                    onLongPress={() => enterSelect(session.id, m.id)}
                                    onToggleSelect={() => toggleSelect(session.id, m.id)}
                                    onClick={() => toggleSelect(session.id, m.id)}
                                  />
                                );
                              })}
                            </div>
                          ) : (
                            <div className="-mx-4 px-4 overflow-x-auto">
                              <div className="flex gap-3 pb-2">
                                {(session.media || []).map((m) => (
                                  <div key={m.id} className="shrink-0" style={{ width: 182 }}>
                                    <MediaCard
                                      item={m}
                                      variant="tall"
                                      onLongPress={() => enterSelect(session.id, m.id)}
                                      onClick={() => openFromThumb(session.id, m.id)}
                                      onDelete={() => deleteMediaFromProject(activeProject.id, session.id, m.id)}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Sticky selected bar */}
                    {selectMode && selectedSessionId && (
                      <div className="sticky bottom-0 pb-5 mt-10">
                        <div
                          className="mx-auto px-4 py-3 flex items-center justify-between gap-3"
                          style={{
                            borderRadius: 8,
                            background: "rgba(255,255,255,0.90)",
                            border: `1px solid ${palette.line}`,
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
                                borderRadius: 8,
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
                                borderRadius: 8,
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
                </div>
              </>
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
