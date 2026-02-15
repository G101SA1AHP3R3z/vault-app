import React, { useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  Share,
  Play,
  Plus,
  Trash2,
  Upload,
  X,
  Pencil,
  Loader2,
  MapPin,
  Search as SearchIcon,
} from "lucide-react";

import { VaultProvider, useVault } from "./context/VaultContext";
import Navigation from "./components/Navigation";
import MediaCard from "./components/MediaCard";
import NewProjectModal from "./components/NewProjectModal";
import AddMediaModal from "./components/AddMediaModal";
import LibraryGrid from "./features/library/LibraryGrid";
import Login from "./components/Login";

function clamp01(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

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

  const palette = {
    sky: "#3AA8FF",
    sun: "#FFEA3A",
  };

  return (
    <div
      className="text-[20px] font-bold tracking-[-0.01em] leading-none select-none"
      style={{ fontFamily: headerFont }}
    >
      <span style={{ color: palette.sky }}>[</span>
      <span style={{ letterSpacing: "0.08em" }}>Index</span>
      <span style={{ color: palette.sun }}>]</span>
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

function SearchPanel({ palette, headerFont, bodyFont, projects, search, setSearch, onPickTag, onQuickAdd }) {
  const allTags = useMemo(() => {
    const map = new Map();
    (projects || []).forEach((p) => {
      (p?.aiTags || []).forEach((t) => {
        const key = String(t || "").trim();
        if (!key) return;
        map.set(key.toLowerCase(), key);
      });
    });
    return Array.from(map.values()).slice(0, 18);
  }, [projects]);

  return (
    <div className="p-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between mb-4 pt-8">
        <div className="flex items-center gap-3">
          <div style={{ fontFamily: headerFont }}>
            <BrandMark />
          </div>
          <div className="hidden sm:block text-xs text-black/50">Search projects, tags.</div>
        </div>
      </div>

      {/* Search input */}
      <div
        className="w-full flex items-center gap-2 px-3 h-11"
        style={{
          borderRadius: 12,
          background: "rgba(255,255,255,0.65)",
          border: "1px solid rgba(0,0,0,0.08)",
          backdropFilter: "blur(14px)",
        }}
      >
        <SearchIcon className="w-4 h-4 text-black/45" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search titles and tags…"
          className="flex-1 bg-transparent outline-none text-[14px]"
          style={{ fontFamily: bodyFont }}
        />
        {search?.trim() ? (
          <button
            onClick={() => setSearch("")}
            className="h-8 px-3 text-[12px] font-semibold"
            style={{
              borderRadius: 8,
              background: "rgba(0,0,0,0.04)",
              border: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            Clear
          </button>
        ) : (
          <div className="text-[11px] text-black/35 pr-1">Type to filter</div>
        )}
      </div>

      {/* Tag chips */}
      {allTags.length > 0 && (
        <div className="mt-4">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-black/40 mb-2">
            Quick tags
          </div>
          <div className="flex flex-wrap gap-2">
            {allTags.map((t) => (
              <button
                key={t}
                onClick={() => onPickTag(t)}
                className="px-3 py-1 text-[12px] font-semibold"
                style={{
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.55)",
                  border: "1px solid rgba(0,0,0,0.08)",
                  color: "rgba(0,0,0,0.7)",
                }}
              >
                #{t}
              </button>
            ))}
            <span
              className="px-3 py-1 text-[12px] font-semibold"
              style={{
                borderRadius: 8,
                background: "rgba(58,168,255,0.12)",
                border: "1px solid rgba(58,168,255,0.22)",
                color: "rgba(0,0,0,0.65)",
              }}
            >
              Tip: tags are lowercase in search
            </span>
          </div>
        </div>
      )}

      <div className="mt-6">
        {projects?.length ? (
          <LibraryGrid onQuickAdd={onQuickAdd} />
        ) : (
          <div
            className="mt-10 p-6 text-center"
            style={{
              borderRadius: 14,
              background: "rgba(255,255,255,0.55)",
              border: "1px solid rgba(0,0,0,0.08)",
            }}
          >
            <div className="text-[14px] font-semibold" style={{ fontFamily: headerFont }}>
              No results
            </div>
            <div className="mt-1 text-[12px] text-black/55">
              Try a shorter query or tap a tag.
            </div>
          </div>
        )}
      </div>
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
      line: "#E3ECF7",
      sky: "#3AA8FF",
      sun: "#FFEA3A",
      breeze: "#54E6C1",
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
    activeMedia,
    setActiveMedia,
    addProject,
    addMediaToProject,
    deleteProject,
    deleteMediaFromProject,
    addHotspotToMedia,
    updateHotspotInMedia,
    deleteHotspotFromMedia,
    filteredProjects,
  } = useVault();

  const [newOpen, setNewOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);

  // --- PIN LOGIC & MODE ---
  const [isAddPinMode, setIsAddPinMode] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinDraft, setPinDraft] = useState({ label: "", note: "" });
  const [pinTarget, setPinTarget] = useState(null);

  // --- DRAG & TRASH LOGIC ---
  const [draggingPinId, setDraggingPinId] = useState(null);
  const [optimisticPin, setOptimisticPin] = useState(null);
  const [isHoveringTrash, setIsHoveringTrash] = useState(false);

  const dragRef = useRef({
    dragging: false,
    hotspotId: null,
    startX: 0,
    startY: 0,
    timer: null,
  });

  const stageRef = useRef(null);
  const trashRef = useRef(null);

  const navigateToMedia = (m, sessionId) => {
    setActiveMedia({ ...m, sessionId });
    setView("media");
  };

  const goBack = () => {
    if (view === "media") {
      setView("project");
      setActiveMedia(null);
      setIsAddPinMode(false);
    } else {
      setView("dashboard");
      setActiveProject(null);
    }
  };

  const handleCreateProject = async ({ title, tags, note }) => {
    try {
      const p = await addProject({ title, aiTags: tags, note });
      setNewOpen(false);
      setActiveProject(p);
      setView("project");
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddMedia = async ({ file, sessionId, sessionTitle }) => {
    if (!activeProject) return;
    try {
      await addMediaToProject(activeProject.id, file, sessionId, sessionTitle);
      setMediaOpen(false);
    } catch (e) {
      console.error("Media upload failed", e);
    }
  };

  const handleDeleteProject = async () => {
    if (!activeProject) return;
    if (confirm("Nuke this entire project?")) {
      await deleteProject(activeProject.id);
    }
  };

  const currentMedia = useMemo(() => {
    if (!activeProject || !activeMedia?.id) return null;
    const sid = activeMedia.sessionId;
    const session = (activeProject.sessions || []).find((s) => s.id === sid);
    if (!session) return null;
    const media = (session.media || []).find((mm) => mm.id === activeMedia.id);
    return media ? { ...media, sessionId: sid } : null;
  }, [activeProject, activeMedia?.id, activeMedia?.sessionId]);

  const handleDeleteCurrentMedia = async () => {
    if (!activeProject || !currentMedia) return;
    if (confirm("Permanently delete this photo?")) {
      await deleteMediaFromProject(activeProject.id, currentMedia.sessionId, currentMedia.id);
      goBack();
    }
  };

  // --- QUICK ADD FROM GRID ---
  const handleQuickAdd = (project) => {
    setActiveProject(project);
    setMediaOpen(true);
  };

  const currentHotspots = currentMedia?.hotspots || [];

  const openPinEditor = (sessionId, mediaId, hotspot) => {
    setPinTarget({ sessionId, mediaId, hotspotId: hotspot.id });
    setPinDraft({ label: hotspot.label || "", note: hotspot.note || "" });
    setPinOpen(true);
  };

  const handleStageClickToAddPin = async (e) => {
    if (!isAddPinMode) return;

    try {
      if (!activeProject || !currentMedia) return;
      if (!stageRef.current) return;

      const rect = stageRef.current.getBoundingClientRect();
      const clientX = e.clientX ?? e.touches?.[0]?.clientX;
      const clientY = e.clientY ?? e.touches?.[0]?.clientY;
      if (clientX == null || clientY == null) return;

      const x = clamp01((clientX - rect.left) / rect.width);
      const y = clamp01((clientY - rect.top) / rect.height);
      const newPinId = `h-${Date.now()}`;

      await addHotspotToMedia(activeProject.id, currentMedia.sessionId, currentMedia.id, {
        id: newPinId,
        x,
        y,
        label: "",
        note: "",
      });

      setIsAddPinMode(false);
      openPinEditor(currentMedia.sessionId, currentMedia.id, { id: newPinId, label: "", note: "" });
    } catch (err) {
      console.error("Failed to save pin:", err);
      alert("Failed to save pin. Check console.");
    }
  };

  const savePinEdits = async () => {
    if (!activeProject || !pinTarget) return;
    try {
      await updateHotspotInMedia(
        activeProject.id,
        pinTarget.sessionId,
        pinTarget.mediaId,
        pinTarget.hotspotId,
        { label: pinDraft.label || "", note: pinDraft.note || "" }
      );
      setPinOpen(false);
      setPinTarget(null);
    } catch (e) {
      console.error("Failed to update pin:", e);
    }
  };

  const deletePin = async () => {
    if (!activeProject || !pinTarget) return;
    if (!confirm("Delete this pin?")) return;
    try {
      await deleteHotspotFromMedia(
        activeProject.id,
        pinTarget.sessionId,
        pinTarget.mediaId,
        pinTarget.hotspotId
      );
      setPinOpen(false);
      setPinTarget(null);
    } catch (e) {
      console.error("Failed to delete pin:", e);
    }
  };

  const onPinPointerDown = (e, hotspot) => {
    e.preventDefault();
    e.stopPropagation();

    dragRef.current.hotspotId = hotspot.id;
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;
    dragRef.current.dragging = false;

    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {}

    dragRef.current.timer = setTimeout(() => {
      dragRef.current.dragging = true;
      setDraggingPinId(hotspot.id);
      setOptimisticPin({ id: hotspot.id, x: hotspot.x, y: hotspot.y });
    }, 1500);
  };

  const onStagePointerMove = (e) => {
    if (!dragRef.current.hotspotId) return;

    if (!dragRef.current.dragging) {
      const dx = Math.abs(e.clientX - dragRef.current.startX);
      const dy = Math.abs(e.clientY - dragRef.current.startY);
      if (dx > 10 || dy > 10) {
        clearTimeout(dragRef.current.timer);
        dragRef.current.timer = null;
        dragRef.current.hotspotId = null;
      }
      return;
    }

    if (stageRef.current) {
      const rect = stageRef.current.getBoundingClientRect();
      const clientX = e.clientX ?? e.touches?.[0]?.clientX;
      const clientY = e.clientY ?? e.touches?.[0]?.clientY;

      const x = clamp01((clientX - rect.left) / rect.width);
      const y = clamp01((clientY - rect.top) / rect.height);
      setOptimisticPin({ id: dragRef.current.hotspotId, x, y });

      if (trashRef.current) {
        const tRect = trashRef.current.getBoundingClientRect();
        const hovering =
          clientX >= tRect.left &&
          clientX <= tRect.right &&
          clientY >= tRect.top &&
          clientY <= tRect.bottom;

        if (hovering !== isHoveringTrash) setIsHoveringTrash(hovering);
      }
    }
  };

  const onStagePointerUp = async (e) => {
    if (dragRef.current.timer) {
      clearTimeout(dragRef.current.timer);
      dragRef.current.timer = null;
    }

    const hotspotId = dragRef.current.hotspotId;
    const wasDragging = dragRef.current.dragging;
    const clientX = e.clientX ?? e.changedTouches?.[0]?.clientX;
    const clientY = e.clientY ?? e.changedTouches?.[0]?.clientY;

    let droppedInTrash = false;
    if (wasDragging && trashRef.current && clientX != null && clientY != null) {
      const tRect = trashRef.current.getBoundingClientRect();
      droppedInTrash =
        clientX >= tRect.left &&
        clientX <= tRect.right &&
        clientY >= tRect.top &&
        clientY <= tRect.bottom;
    }

    dragRef.current.hotspotId = null;
    dragRef.current.dragging = false;
    setDraggingPinId(null);
    setIsHoveringTrash(false);
    const pinDataToSave = optimisticPin;
    setOptimisticPin(null);

    if (!hotspotId) return;

    if (!wasDragging) {
      const hotspot = currentHotspots.find((h) => h.id === hotspotId);
      if (hotspot && !isAddPinMode) {
        openPinEditor(currentMedia.sessionId, currentMedia.id, hotspot);
      }
      return;
    }

    if (droppedInTrash && activeProject && currentMedia) {
      try {
        await deleteHotspotFromMedia(activeProject.id, currentMedia.sessionId, currentMedia.id, hotspotId);
      } catch (err) {
        console.error("Failed to incinerate pin:", err);
      }
      return;
    }

    if (pinDataToSave && activeProject && currentMedia) {
      try {
        await updateHotspotInMedia(
          activeProject.id,
          currentMedia.sessionId,
          currentMedia.id,
          hotspotId,
          { x: pinDataToSave.x, y: pinDataToSave.y }
        );
      } catch (err) {
        console.error("Failed to move pin:", err);
      }
    }
  };

  const pickTag = (t) => {
    const tag = String(t || "").trim();
    if (!tag) return;
    setSearch(tag.toLowerCase());
  };

  return (
    <AbstractCreamBackdrop>
      <div
        className="min-h-screen text-gray-900 flex justify-center items-center antialiased selection:bg-black selection:text-white"
        style={{ fontFamily: bodyFont }}
      >
        {view === "dashboard" && <Navigation currentTab={tab} setTab={setTab} />}

        <div className={`w-full transition-all duration-300 flex justify-center ${view === "dashboard" ? "md:pl-64" : ""}`}>
          <div
            className={`w-full ${view === "dashboard" ? "max-w-md" : "max-w-6xl"} min-h-screen relative border-x`}
            style={{
              background: "rgba(255,255,255,0.68)",
              borderColor: "rgba(0,0,0,0.08)",
              backdropFilter: "blur(18px)",
              boxShadow: "0 22px 60px -52px rgba(0,0,0,0.35)",
            }}
          >
            {/* PROJECT TOP BAR */}
            {view === "project" && (
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
                  style={{ background: "rgba(255,255,255,0.45)", border: "1px solid rgba(0,0,0,0.06)" }}
                >
                  <ChevronLeft className="w-6 h-6" />
                  <span className="font-semibold text-sm">Back</span>
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
            )}

            {/* DASHBOARD */}
            {view === "dashboard" && tab !== "search" && (
              <div className="p-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex justify-between items-center mb-6 pt-8">
                  <div className="flex items-center gap-3">
                    <div style={{ fontFamily: headerFont }}>
                      <BrandMark />
                    </div>
                    <div className="hidden sm:block text-xs text-black/50">Photos, but temporary.</div>
                  </div>

                  <button
                    onClick={() => setNewOpen(true)}
                    className="w-10 h-10 rounded-[8px] flex items-center justify-center active:scale-95 transition-transform"
                    style={{
                      background: palette.sun,
                      color: palette.ink,
                      border: "1px solid rgba(0,0,0,0.10)",
                      boxShadow: "0 14px 30px -22px rgba(0,0,0,0.35)",
                    }}
                    aria-label="New project"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                <LibraryGrid onQuickAdd={handleQuickAdd} />
              </div>
            )}

            {/* SEARCH */}
            {view === "dashboard" && tab === "search" && (
              <SearchPanel
                palette={palette}
                headerFont={headerFont}
                bodyFont={bodyFont}
                projects={filteredProjects}
                search={search}
                setSearch={setSearch}
                onPickTag={pickTag}
                onQuickAdd={handleQuickAdd}
              />
            )}

            {/* PROJECT VIEW */}
            {view === "project" && activeProject && (
              <div className="p-5 md:p-10 animate-in slide-in-from-right-4 duration-300">
                <div className="flex items-start justify-between gap-4">
                  <h2
                    className="text-4xl md:text-6xl font-semibold mb-6 leading-none tracking-[-0.02em]"
                    style={{ fontFamily: headerFont, color: palette.ink }}
                  >
                    {activeProject.title}
                  </h2>

                  <button
                    onClick={() => setMediaOpen(true)}
                    className="shrink-0 mt-2 px-3 py-2 rounded-[8px] font-semibold text-xs uppercase tracking-wide flex items-center gap-2 active:scale-95 transition"
                    style={{
                      background: palette.sky,
                      color: "#fff",
                      border: "1px solid rgba(0,0,0,0.08)",
                      boxShadow: "0 14px 30px -22px rgba(0,0,0,0.28)",
                    }}
                  >
                    <Upload className="w-4 h-4" /> Add Media
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 mb-8">
                  {activeProject.aiTags?.map((tag) => (
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
                      className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center shrink-0 shadow-lg hover:scale-105 transition-transform"
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
                      <h3 className="text-sm font-semibold" style={{ fontFamily: headerFont }}>
                        {session.title}
                      </h3>
                      <p className="text-xs text-black/40">{session.date}</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {(session.media || []).map((m) => (
                        <MediaCard
                          key={m.id}
                          item={m}
                          onClick={() => navigateToMedia(m, session.id)}
                          onDelete={() => deleteMediaFromProject(activeProject.id, session.id, m.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* MEDIA VIEW */}
            {view === "media" && activeProject && currentMedia && (
              <div
                className="fixed inset-0 z-[100] flex flex-col overflow-hidden touch-none animate-in fade-in zoom-in-95 duration-200"
                style={{
                  background:
                    "radial-gradient(1200px 800px at 50% 25%, rgba(58,168,255,0.10) 0%, rgba(0,0,0,0.92) 60%)",
                }}
              >
                <div className="absolute top-0 inset-x-0 p-6 z-50 flex justify-between items-center pointer-events-none">
                  <button
                    onClick={goBack}
                    className="pointer-events-auto w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors"
                    style={{
                      background: "rgba(255,255,255,0.10)",
                      border: "1px solid rgba(255,255,255,0.14)",
                      backdropFilter: "blur(12px)",
                    }}
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={handleDeleteCurrentMedia}
                    className="pointer-events-auto w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                    style={{
                      background: "rgba(255,255,255,0.10)",
                      border: "1px solid rgba(255,255,255,0.14)",
                      color: "rgba(255,180,180,0.95)",
                      backdropFilter: "blur(12px)",
                    }}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div
                  ref={stageRef}
                  className={`w-full h-full relative flex items-center justify-center transition-all ${
                    isAddPinMode ? "cursor-crosshair" : ""
                  }`}
                  onClick={handleStageClickToAddPin}
                  onPointerMove={onStagePointerMove}
                  onPointerUp={onStagePointerUp}
                  onPointerLeave={onStagePointerUp}
                >
                  <img
                    src={currentMedia.url}
                    className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${
                      isAddPinMode ? "opacity-70" : "opacity-100"
                    }`}
                    alt=""
                    draggable={false}
                  />

                  {currentHotspots.map((h, idx) => {
                    const displayX = optimisticPin?.id === h.id ? optimisticPin.x : h.x;
                    const displayY = optimisticPin?.id === h.id ? optimisticPin.y : h.y;

                    const left = `${clamp01(displayX) * 100}%`;
                    const top = `${clamp01(displayY) * 100}%`;
                    const number = idx + 1;

                    return (
                      <button
                        key={h.id}
                        type="button"
                        onPointerDown={(e) => {
                          if (!isAddPinMode) onPinPointerDown(e, h);
                        }}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-100 select-none touch-none ${
                          isAddPinMode
                            ? "pointer-events-none opacity-20 scale-75"
                            : "pointer-events-auto cursor-pointer z-10"
                        } ${draggingPinId === h.id ? "scale-125 z-50" : "hover:scale-110"}`}
                        style={{
                          left,
                          top,
                          WebkitTouchCallout: "none",
                          WebkitUserSelect: "none",
                          userSelect: "none",
                        }}
                        aria-label="Pin"
                      >
                        <div
                          className="w-9 h-9 rounded-full font-black text-xs flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.5)] border-2 transition-colors select-none"
                          style={{
                            pointerEvents: "none",
                            background: draggingPinId === h.id ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.88)",
                            color: "rgba(0,0,0,0.86)",
                            borderColor: draggingPinId === h.id ? palette.sun : "rgba(255,255,255,0.22)",
                          }}
                        >
                          {number}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 z-50 pointer-events-none">
                  {/* Trash drop zone */}
                  <div
                    ref={trashRef}
                    className={`absolute left-1/2 -translate-x-1/2 transition-all duration-300 pointer-events-auto ${
                      draggingPinId ? "translate-y-0 opacity-100 scale-100" : "translate-y-10 opacity-0 scale-50"
                    }`}
                  >
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-200"
                      style={{
                        background: isHoveringTrash ? "rgba(220,38,38,0.95)" : "rgba(255,255,255,0.12)",
                        border: isHoveringTrash ? "4px solid rgba(255,255,255,0.30)" : "1px solid rgba(255,255,255,0.18)",
                        color: isHoveringTrash ? "#fff" : "rgba(255,180,180,0.95)",
                        backdropFilter: "blur(14px)",
                        transform: isHoveringTrash ? "scale(1.18)" : "scale(1)",
                      }}
                    >
                      <Trash2 className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Add pin toggle — now sunny, not black */}
                  <button
                    onClick={() => setIsAddPinMode(!isAddPinMode)}
                    className={`pointer-events-auto px-5 py-3 font-semibold text-xs uppercase tracking-widest shadow-2xl transition-all flex items-center gap-2 ${
                      draggingPinId ? "opacity-0 scale-50 pointer-events-none" : "opacity-100 scale-100"
                    }`}
                    style={{
                      borderRadius: 999,
                      background: isAddPinMode ? "rgba(255,255,255,0.90)" : palette.sun,
                      color: palette.ink,
                      border: "1px solid rgba(0,0,0,0.10)",
                      boxShadow: "0 18px 50px -34px rgba(0,0,0,0.55)",
                    }}
                  >
                    {isAddPinMode ? (
                      <>
                        <X className="w-4 h-4" /> Cancel Pin
                      </>
                    ) : (
                      <>
                        <MapPin className="w-4 h-4" /> Add Pin
                      </>
                    )}
                  </button>
                </div>

                {isAddPinMode && (
                  <div className="absolute top-24 left-1/2 -translate-x-1/2 text-center pointer-events-none z-50 animate-in fade-in slide-in-from-top-2">
                    <span
                      className="inline-block text-[10px] font-semibold uppercase tracking-widest px-4 py-2 shadow-2xl"
                      style={{
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.90)",
                        color: palette.ink,
                        border: "1px solid rgba(0,0,0,0.10)",
                        backdropFilter: "blur(14px)",
                      }}
                    >
                      Tap anywhere to drop a pin
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Modals */}
            <NewProjectModal open={newOpen} onClose={() => setNewOpen(false)} onCreate={handleCreateProject} />
            <AddMediaModal
              isOpen={mediaOpen}
              onClose={() => setMediaOpen(false)}
              project={activeProject}
              onAddMedia={handleAddMedia}
              mode="upload"
              existingSessions={activeProject?.sessions || []}
            />

            {/* PIN EDITOR */}
            {pinOpen && (
              <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setPinOpen(false)} />
                <div
                  className="relative w-full max-w-lg bg-white overflow-hidden"
                  style={{
                    borderRadius: "14px",
                    border: "1px solid rgba(0,0,0,0.08)",
                    boxShadow: "0 22px 60px -52px rgba(0,0,0,0.45)",
                  }}
                >
                  <div className="px-5 py-4 flex justify-between items-center" style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                    <div className="flex items-center gap-2">
                      <Pencil className="w-4 h-4" />
                      <h3 className="text-sm font-semibold tracking-tight" style={{ fontFamily: headerFont }}>
                        Edit Pin
                      </h3>
                    </div>
                    <button
                      onClick={() => setPinOpen(false)}
                      className="p-2 rounded-[8px]"
                      style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(0,0,0,0.08)" }}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-5 space-y-4">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-widest text-black/45 mb-2">
                        Label (optional)
                      </label>
                      <input
                        value={pinDraft.label}
                        onChange={(e) => setPinDraft((p) => ({ ...p, label: e.target.value }))}
                        className="w-full px-4 py-3 text-sm outline-none"
                        style={{
                          background: "rgba(255,255,255,0.60)",
                          border: "1px solid rgba(0,0,0,0.10)",
                          borderRadius: "8px",
                        }}
                        placeholder="e.g. Waistline"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-widest text-black/45 mb-2">
                        Note
                      </label>
                      <textarea
                        rows={4}
                        value={pinDraft.note}
                        onChange={(e) => setPinDraft((p) => ({ ...p, note: e.target.value }))}
                        className="w-full px-4 py-3 text-sm outline-none resize-none"
                        style={{
                          background: "rgba(255,255,255,0.60)",
                          border: "1px solid rgba(0,0,0,0.10)",
                          borderRadius: "8px",
                        }}
                        placeholder="What needs to change here?"
                      />
                    </div>
                  </div>

                  <div className="p-5 flex gap-3" style={{ borderTop: "1px solid rgba(0,0,0,0.08)", background: "rgba(255,255,255,0.55)" }}>
                    <button
                      onClick={deletePin}
                      className="flex-1 py-3 rounded-[8px] font-semibold text-sm"
                      style={{
                        background: "rgba(255,255,255,0.72)",
                        border: "1px solid rgba(220,38,38,0.20)",
                        color: "#DC2626",
                      }}
                    >
                      Delete
                    </button>
                    <button
                      onClick={savePinEdits}
                      className="flex-[2] py-3 rounded-[8px] font-semibold text-sm"
                      style={{
                        background: palette.sun,
                        color: palette.ink,
                        border: "1px solid rgba(0,0,0,0.10)",
                      }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Subtle “floating create” for search, if you want it */}
            {view === "dashboard" && tab === "search" && (
              <button
                onClick={() => setNewOpen(true)}
                className="fixed bottom-24 right-5 w-12 h-12 flex items-center justify-center z-[60] active:scale-95 transition-transform"
                style={{
                  borderRadius: 999,
                  background: palette.sun,
                  color: palette.ink,
                  border: "1px solid rgba(0,0,0,0.10)",
                  boxShadow: "0 18px 50px -34px rgba(0,0,0,0.45)",
                }}
                aria-label="New project"
              >
                <Plus className="w-6 h-6" />
              </button>
            )}
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
