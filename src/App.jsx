import React, { useMemo, useRef, useState, useEffect } from "react";
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
  Expand,
  Shrink,
  ChevronRight,
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

  const palette = { sky: "#3AA8FF", sun: "#FFEA3A" };

  return (
    <div className="text-[20px] font-bold tracking-[-0.01em] leading-none select-none" style={{ fontFamily: headerFont }}>
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
      {/* Subtle abstract shapes */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -top-28 -left-28 w-[520px] h-[520px] rounded-[48px] rotate-[18deg]"
          style={{ background: palette.sun, opacity: 0.16 }}
        />
        <div
          className="absolute top-10 -right-64 w-[820px] h-[300px] rounded-[60px] rotate-[-12deg]"
          style={{ background: palette.sky, opacity: 0.10 }}
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
    activeProject,
    setActiveProject,
    activeMedia,
    setActiveMedia,
    search,
    setSearch,
    addProject,
    addMediaToProject,
    deleteProject,
    deleteMediaFromProject,
    addHotspotToMedia,
    updateHotspotInMedia,
    deleteHotspotFromMedia,
  } = useVault();

  const [newOpen, setNewOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);

  // Pins
  const [isAddPinMode, setIsAddPinMode] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinDraft, setPinDraft] = useState({ label: "", note: "" });
  const [pinTarget, setPinTarget] = useState(null);

  // New: media “dashboard” selection + layout
  const [selectedHotspotId, setSelectedHotspotId] = useState(null);
  const [focusMedia, setFocusMedia] = useState(false); // collapses bottom panel

  // Drag
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
      setSelectedHotspotId(null);
      setFocusMedia(false);
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
    if (confirm("Delete this entire project?")) {
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

  const currentHotspots = useMemo(() => currentMedia?.hotspots || [], [currentMedia?.hotspots]);

  // Auto-select first pin when media opens (if none selected)
  useEffect(() => {
    if (view !== "media") return;
    if (!currentHotspots.length) {
      setSelectedHotspotId(null);
      return;
    }
    if (selectedHotspotId && currentHotspots.some((h) => h.id === selectedHotspotId)) return;
    setSelectedHotspotId(currentHotspots[0]?.id || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, currentMedia?.id, currentHotspots.length]);

  const selectedHotspot = useMemo(() => {
    if (!selectedHotspotId) return null;
    return currentHotspots.find((h) => h.id === selectedHotspotId) || null;
  }, [currentHotspots, selectedHotspotId]);

  const handleDeleteCurrentMedia = async () => {
    if (!activeProject || !currentMedia) return;
    if (confirm("Permanently delete this media?")) {
      await deleteMediaFromProject(activeProject.id, currentMedia.sessionId, currentMedia.id);
      goBack();
    }
  };

  const handleQuickAdd = (project) => {
    setActiveProject(project);
    setMediaOpen(true);
  };

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
      setSelectedHotspotId(newPinId);
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

      // If we deleted the selected pin, move selection
      if (selectedHotspotId === pinTarget.hotspotId) {
        const remaining = currentHotspots.filter((h) => h.id !== pinTarget.hotspotId);
        setSelectedHotspotId(remaining[0]?.id || null);
      }
    } catch (e) {
      console.error("Failed to delete pin:", e);
    }
  };

  // Long-press drag
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
    }, 900); // faster than 1500ms for better UX
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

    // Not dragging => treat as select/open
    if (!wasDragging) {
      setSelectedHotspotId(hotspotId);
      const hotspot = currentHotspots.find((h) => h.id === hotspotId);
      if (hotspot && !isAddPinMode) openPinEditor(currentMedia.sessionId, currentMedia.id, hotspot);
      return;
    }

    // Dropped in trash
    if (droppedInTrash && activeProject && currentMedia) {
      try {
        await deleteHotspotFromMedia(activeProject.id, currentMedia.sessionId, currentMedia.id, hotspotId);
      } catch (err) {
        console.error("Failed to delete pin:", err);
      }
      return;
    }

    // Save moved pin
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

  // Pin navigation (bottom panel)
  const goNextPin = () => {
    if (!currentHotspots.length) return;
    const idx = currentHotspots.findIndex((h) => h.id === selectedHotspotId);
    const next = currentHotspots[(idx + 1) % currentHotspots.length];
    setSelectedHotspotId(next.id);
  };

  const goPrevPin = () => {
    if (!currentHotspots.length) return;
    const idx = currentHotspots.findIndex((h) => h.id === selectedHotspotId);
    const prev = currentHotspots[(idx - 1 + currentHotspots.length) % currentHotspots.length];
    setSelectedHotspotId(prev.id);
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
            {view === "dashboard" && (
              <div className="p-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex justify-between items-center mb-4 pt-8">
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

                {/* SEARCH (fixes your search tab “not working”) */}
                {tab === "search" && (
                  <div className="mb-4">
                    <div
                      className="flex items-center gap-2 px-3 h-11 rounded-[8px]"
                      style={{
                        background: "rgba(255,255,255,0.60)",
                        border: "1px solid rgba(0,0,0,0.10)",
                        backdropFilter: "blur(14px)",
                      }}
                    >
                      <SearchIcon className="w-4 h-4 text-black/40" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search projects and tags…"
                        className="w-full bg-transparent outline-none text-sm"
                      />
                      {search?.trim() ? (
                        <button
                          onClick={() => setSearch("")}
                          className="h-8 px-2 rounded-[8px] text-xs font-semibold"
                          style={{ background: "rgba(0,0,0,0.06)" }}
                        >
                          Clear
                        </button>
                      ) : null}
                    </div>
                  </div>
                )}

                <LibraryGrid onQuickAdd={handleQuickAdd} />
              </div>
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

            {/* MEDIA VIEW — NEW “DASHBOARD” LAYOUT */}
            {view === "media" && activeProject && currentMedia && (
              <div
                className="fixed inset-0 z-[100] flex flex-col overflow-hidden"
                style={{
                  background:
                    "radial-gradient(1200px 600px at 15% 10%, rgba(255,234,58,0.22) 0%, rgba(0,0,0,0) 55%), radial-gradient(900px 500px at 85% 15%, rgba(58,168,255,0.20) 0%, rgba(0,0,0,0) 55%), linear-gradient(180deg, rgba(11,11,12,0.92) 0%, rgba(11,11,12,0.88) 100%)",
                }}
              >
                {/* Top controls */}
                <div className="absolute top-0 inset-x-0 p-5 z-50 flex justify-between items-center pointer-events-none">
                  <button
                    onClick={goBack}
                    className="pointer-events-auto w-10 h-10 rounded-[8px] flex items-center justify-center text-white"
                    style={{
                      background: "rgba(255,255,255,0.12)",
                      border: "1px solid rgba(255,255,255,0.14)",
                      backdropFilter: "blur(14px)",
                    }}
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <div className="pointer-events-auto flex items-center gap-2">
                    <button
                      onClick={() => setFocusMedia((v) => !v)}
                      className="h-10 px-3 rounded-[8px] text-xs font-semibold inline-flex items-center gap-2 text-white"
                      style={{
                        background: "rgba(255,255,255,0.12)",
                        border: "1px solid rgba(255,255,255,0.14)",
                        backdropFilter: "blur(14px)",
                      }}
                      title={focusMedia ? "Show notes" : "Focus media"}
                    >
                      {focusMedia ? <Shrink className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
                      {focusMedia ? "Notes" : "Focus"}
                    </button>

                    <button
                      onClick={handleDeleteCurrentMedia}
                      className="pointer-events-auto w-10 h-10 rounded-[8px] flex items-center justify-center"
                      style={{
                        background: "rgba(255,255,255,0.12)",
                        border: "1px solid rgba(255,255,255,0.14)",
                        backdropFilter: "blur(14px)",
                        color: "#FCA5A5",
                      }}
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Media stage */}
                <div
                  ref={stageRef}
                  className="w-full flex-1 relative flex items-center justify-center px-2 sm:px-6"
                  onClick={handleStageClickToAddPin}
                  onPointerMove={onStagePointerMove}
                  onPointerUp={onStagePointerUp}
                  onPointerLeave={onStagePointerUp}
                  style={{ paddingTop: 70, paddingBottom: focusMedia ? 28 : 260 }}
                >
                  <img
                    src={currentMedia.url}
                    className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${
                      isAddPinMode ? "opacity-75" : "opacity-100"
                    }`}
                    alt=""
                    draggable={false}
                  />

                  {/* Hotspots (new style) */}
                  {currentHotspots.map((h, idx) => {
                    const displayX = optimisticPin?.id === h.id ? optimisticPin.x : h.x;
                    const displayY = optimisticPin?.id === h.id ? optimisticPin.y : h.y;

                    const left = `${clamp01(displayX) * 100}%`;
                    const top = `${clamp01(displayY) * 100}%`;
                    const number = idx + 1;

                    const isSelected = selectedHotspotId === h.id;

                    return (
                      <button
                        key={h.id}
                        type="button"
                        onPointerDown={(e) => {
                          if (!isAddPinMode) onPinPointerDown(e, h);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedHotspotId(h.id);
                        }}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 select-none touch-none transition-all duration-150 ${
                          isAddPinMode ? "pointer-events-none opacity-25 scale-75" : "pointer-events-auto"
                        } ${draggingPinId === h.id ? "scale-125 z-50" : "hover:scale-110"} ${
                          isSelected ? "z-40" : "z-10"
                        }`}
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
                          className="w-9 h-9 flex items-center justify-center text-xs font-bold"
                          style={{
                            borderRadius: 999,
                            background: isSelected ? palette.sun : "rgba(255,255,255,0.90)",
                            color: palette.ink,
                            border: isSelected ? "1px solid rgba(0,0,0,0.18)" : "1px solid rgba(255,255,255,0.25)",
                            boxShadow: isSelected
                              ? "0 18px 40px -26px rgba(0,0,0,0.9)"
                              : "0 14px 30px -22px rgba(0,0,0,0.75)",
                            backdropFilter: "blur(10px)",
                            pointerEvents: "none",
                          }}
                        >
                          {number}
                        </div>
                      </button>
                    );
                  })}

                  {/* “Tap to add” helper */}
                  {isAddPinMode && (
                    <div className="absolute top-24 left-1/2 -translate-x-1/2 text-center pointer-events-none z-50 animate-in fade-in slide-in-from-top-2">
                      <span
                        className="inline-block text-[10px] font-semibold uppercase tracking-widest px-4 py-2"
                        style={{
                          borderRadius: 999,
                          background: "rgba(255,255,255,0.85)",
                          border: "1px solid rgba(0,0,0,0.10)",
                          color: palette.ink,
                          backdropFilter: "blur(14px)",
                        }}
                      >
                        Tap anywhere to drop a pin
                      </span>
                    </div>
                  )}
                </div>

                {/* Bottom overlay controls */}
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                  {/* Trash drop zone (only when dragging) */}
                  <div
                    ref={trashRef}
                    className={`absolute left-1/2 -translate-x-1/2 transition-all duration-300 pointer-events-auto ${
                      draggingPinId ? "translate-y-0 opacity-100 scale-100" : "translate-y-10 opacity-0 scale-50"
                    }`}
                    style={{ bottom: 84 }}
                  >
                    <div
                      className="w-16 h-16 flex items-center justify-center shadow-2xl transition-all duration-200"
                      style={{
                        borderRadius: 999,
                        background: isHoveringTrash ? "rgba(220,38,38,0.95)" : "rgba(255,255,255,0.12)",
                        border: isHoveringTrash ? "3px solid rgba(252,165,165,0.9)" : "1px solid rgba(255,255,255,0.14)",
                        color: isHoveringTrash ? "#fff" : "#FCA5A5",
                        backdropFilter: "blur(14px)",
                        transform: isHoveringTrash ? "scale(1.15)" : "scale(1)",
                      }}
                    >
                      <Trash2 className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Add pin toggle */}
                  <button
                    onClick={() => setIsAddPinMode(!isAddPinMode)}
                    className={`pointer-events-auto h-12 px-5 inline-flex items-center gap-2 text-xs font-semibold transition-all ${
                      draggingPinId ? "opacity-0 scale-50 pointer-events-none" : "opacity-100 scale-100"
                    }`}
                    style={{
                      borderRadius: 999,
                      background: isAddPinMode ? "rgba(255,255,255,0.90)" : palette.sun,
                      color: palette.ink,
                      border: "1px solid rgba(0,0,0,0.14)",
                      boxShadow: "0 18px 40px -26px rgba(0,0,0,0.9)",
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

                {/* Bottom “dashboard” panel */}
                {!focusMedia && (
                  <div className="absolute bottom-0 inset-x-0 z-40">
                    <div
                      className="mx-auto max-w-6xl px-4 pb-4"
                      style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
                    >
                      <div
                        className="p-4 sm:p-5"
                        style={{
                          borderRadius: 14,
                          background: "rgba(255,255,255,0.86)",
                          border: "1px solid rgba(0,0,0,0.12)",
                          backdropFilter: "blur(18px)",
                          boxShadow: "0 22px 60px -52px rgba(0,0,0,0.65)",
                        }}
                      >
                        {/* Photo notes */}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[10px] font-semibold uppercase tracking-widest text-black/50">
                              Photo Notes
                            </div>
                            <div className="mt-1 text-sm text-black/80 leading-relaxed">
                              {currentMedia.note?.trim()
                                ? currentMedia.note
                                : "No photo notes yet. (Optional: add a `note` field on media.)"}
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            <button
                              onClick={goPrevPin}
                              disabled={!currentHotspots.length}
                              className="h-10 px-3 rounded-[8px] text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-40"
                              style={{
                                background: "rgba(0,0,0,0.06)",
                                border: "1px solid rgba(0,0,0,0.10)",
                              }}
                            >
                              <ChevronLeft className="w-4 h-4" /> Prev
                            </button>
                            <button
                              onClick={goNextPin}
                              disabled={!currentHotspots.length}
                              className="h-10 px-3 rounded-[8px] text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-40"
                              style={{
                                background: palette.sky,
                                border: "1px solid rgba(0,0,0,0.10)",
                                color: "#fff",
                              }}
                            >
                              Next <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="my-4" style={{ height: 1, background: "rgba(0,0,0,0.10)" }} />

                        {/* Pin notes */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="text-[10px] font-semibold uppercase tracking-widest text-black/50">
                              Pin Notes
                            </div>

                            {selectedHotspot ? (
                              <div className="mt-1">
                                <div className="text-sm font-semibold" style={{ fontFamily: headerFont }}>
                                  {selectedHotspot.label?.trim() ? selectedHotspot.label : "Untitled pin"}
                                </div>
                                <div className="mt-1 text-sm text-black/75 leading-relaxed">
                                  {selectedHotspot.note?.trim() ? selectedHotspot.note : "No pin note yet."}
                                </div>
                              </div>
                            ) : (
                              <div className="mt-1 text-sm text-black/60">
                                No pin selected.
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => {
                              if (!selectedHotspot || !currentMedia) return;
                              openPinEditor(currentMedia.sessionId, currentMedia.id, selectedHotspot);
                            }}
                            disabled={!selectedHotspot}
                            className="h-10 px-3 rounded-[8px] text-xs font-semibold inline-flex items-center gap-2 disabled:opacity-40"
                            style={{
                              background: palette.sun,
                              border: "1px solid rgba(0,0,0,0.10)",
                              color: palette.ink,
                            }}
                          >
                            <Pencil className="w-4 h-4" /> Edit Pin
                          </button>
                        </div>

                        {/* Pin chips */}
                        {currentHotspots.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {currentHotspots.map((h, idx) => {
                              const active = h.id === selectedHotspotId;
                              return (
                                <button
                                  key={h.id}
                                  onClick={() => setSelectedHotspotId(h.id)}
                                  className="px-3 h-9 text-xs font-semibold"
                                  style={{
                                    borderRadius: 999,
                                    background: active ? palette.sun : "rgba(0,0,0,0.06)",
                                    border: "1px solid rgba(0,0,0,0.10)",
                                    color: palette.ink,
                                  }}
                                >
                                  #{idx + 1}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
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

            {/* PIN EDITOR (kept, but matches your 8px rule) */}
            {pinOpen && (
              <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setPinOpen(false)} />
                <div
                  className="relative w-full max-w-lg bg-white overflow-hidden"
                  style={{
                    borderRadius: 14,
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
                          borderRadius: 8,
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
                          borderRadius: 8,
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
