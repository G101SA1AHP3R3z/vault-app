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
  Maximize2,
  Minimize2,
  StickyNote,
  Edit3,
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
      pin: "#FFEA3A",
      pinEdge: "rgba(0,0,0,0.14)",
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
    addProject,
    addMediaToProject,
    deleteProject,
    deleteSession,
    signOutUser,
    deleteMediaFromProject,
    addHotspotToMedia,
    updateHotspotInMedia,
    deleteHotspotFromMedia,
  } = useVault();

  const [newOpen, setNewOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [autoPromptMediaPicker, setAutoPromptMediaPicker] = useState(false);

  // Pins
  const [isAddPinMode, setIsAddPinMode] = useState(false);
  const [selectedPinId, setSelectedPinId] = useState(null);

  // Focus mode (full-bleed image, no pins, no panel)
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Pin editor (still available via Edit button in panel)
  const [pinOpen, setPinOpen] = useState(false);
  const [pinDraft, setPinDraft] = useState({ label: "", note: "" });
  const [pinTarget, setPinTarget] = useState(null);

  // Drag & trash logic
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
    setIsAddPinMode(false);
    setIsFocusMode(false);
    setSelectedPinId(null);
  };

  const goBack = () => {
    if (view === "media") {
      setView("project");
      setActiveMedia(null);
      setIsAddPinMode(false);
      setIsFocusMode(false);
      setSelectedPinId(null);
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

      // Immediately prompt iOS/native picker and auto-save the first selection
      setAutoPromptMediaPicker(true);
      setAutoPromptMediaPicker(false);
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

  // --- Swipe navigation (between photos in the same session) ---
  const currentSession = useMemo(() => {
    if (!activeProject || !currentMedia?.sessionId) return null;
    return (activeProject.sessions || []).find((s) => s.id === currentMedia.sessionId) || null;
  }, [activeProject, currentMedia?.sessionId]);

  const sessionMediaList = currentSession?.media || [];
  const currentMediaIndex = useMemo(() => {
    if (!currentMedia?.id) return -1;
    return sessionMediaList.findIndex((m) => m.id === currentMedia.id);
  }, [sessionMediaList, currentMedia?.id]);

  const goToMediaIndex = (nextIndex) => {
    if (!activeProject || !currentSession) return;
    if (nextIndex < 0 || nextIndex >= sessionMediaList.length) return;
    const m = sessionMediaList[nextIndex];
    if (!m) return;
    setActiveMedia({ ...m, sessionId: currentSession.id });
    setSelectedPinId(null);
    setIsAddPinMode(false);
    setIsFocusMode(false);
  };

  const goPrevMedia = () => goToMediaIndex(currentMediaIndex - 1);
  const goNextMedia = () => goToMediaIndex(currentMediaIndex + 1);

  const swipeRef = useRef({ down: false, x0: 0, y0: 0 });

  const onStagePointerDown = (e) => {
    if (isAddPinMode || isFocusMode) return;
    const x = e.clientX ?? e.touches?.[0]?.clientX;
    const y = e.clientY ?? e.touches?.[0]?.clientY;
    if (x == null || y == null) return;
    swipeRef.current = { down: true, x0: x, y0: y };
  };

  const onStagePointerEnd = (e) => {
    if (isAddPinMode || isFocusMode) return;
    if (!swipeRef.current.down) return;

    const x = e.clientX ?? e.changedTouches?.[0]?.clientX ?? e.touches?.[0]?.clientX;
    const y = e.clientY ?? e.changedTouches?.[0]?.clientY ?? e.touches?.[0]?.clientY;
    swipeRef.current.down = false;
    if (x == null || y == null) return;

    const dx = x - swipeRef.current.x0;
    const dy = y - swipeRef.current.y0;

    // horizontal swipe threshold
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) goNextMedia();
      else goPrevMedia();
    }
  };


  const currentHotspots = currentMedia?.hotspots || [];

  const selectedPin = useMemo(() => {
    if (!currentHotspots.length) return null;
    const found = selectedPinId ? currentHotspots.find((h) => h.id === selectedPinId) : null;
    return found || currentHotspots[0] || null;
  }, [currentHotspots, selectedPinId]);

  const handleDeleteCurrentMedia = async () => {
    if (!activeProject || !currentMedia) return;
    if (confirm("Permanently delete this photo?")) {
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
    if (!isAddPinMode || isFocusMode) return;

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
      setSelectedPinId(newPinId); // select it so panel updates
      // No auto-open editor anymore
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
      setSelectedPinId(null);
    } catch (e) {
      console.error("Failed to delete pin:", e);
    }
  };

  const onPinPointerDown = (e, hotspot) => {
    if (isFocusMode) return;

    // tap selects (no editor)
    setSelectedPinId(hotspot.id);

    // drag still works (long press)
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
    }, 450); // smoother/faster than 1500ms
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

    if (!wasDragging) return;

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
              <div className="p-5 transition-all duration-300 ease-out">
                <div className="flex justify-between items-center mb-6 pt-8">
                  <div className="flex items-center gap-3">
                    <div style={{ fontFamily: headerFont }}>
                      <BrandMark />
                    </div>
                    <div className="hidden sm:block text-xs text-black/50">
                      Photos, but temporary.
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                  <button
                    onClick={() => signOutUser?.()}
                    className="h-10 px-3 rounded-[8px] text-xs font-semibold"
                    style={{
                      background: "rgba(255,255,255,0.70)",
                      color: "rgba(0,0,0,0.70)",
                      border: "1px solid rgba(0,0,0,0.10)",
                    }}
                  >
                    Sign out
                  </button>

                  <button
                    onClick={() => setNewOpen(true)}
                    className="h-10 px-3 rounded-[8px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform duration-200 ease-out"
                    style={{
                      background: palette.sun,
                      color: palette.ink,
                      border: "1px solid rgba(0,0,0,0.10)",
                      boxShadow: "0 14px 30px -22px rgba(0,0,0,0.35)",
                    }}
                    aria-label="New project"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="hidden sm:inline text-xs font-black uppercase tracking-wide">
                      Start Project
                    </span>
                  </button>
                </div>
                </div>

                <LibraryGrid onQuickAdd={handleQuickAdd} />
              </div>
            )}

            {/* PROJECT VIEW */}
            {view === "project" && activeProject && (
              <div className="p-5 md:p-10 transition-all duration-300 ease-out">
                <div className="flex items-start justify-between gap-4">
                  <h2
                    className="text-4xl md:text-6xl font-semibold mb-6 leading-none tracking-[-0.02em]"
                    style={{ fontFamily: headerFont, color: palette.ink }}
                  >
                    {activeProject.title}
                  </h2>

                  </div>

                <div className="mb-6">
                  <button
                    onClick={() => {
                      setAutoPromptMediaPicker(false);
                      setMediaOpen(true);
                    }}
                    className="px-3 py-2 rounded-[8px] font-semibold text-xs uppercase tracking-wide inline-flex items-center gap-2 active:scale-[0.98] transition-transform duration-200 ease-out"
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
                        <button
                          onClick={() => {
                            if (!activeProject) return;
                            if (confirm(`Delete "${session.title}" and all its photos?`)) {
                              deleteSession?.(activeProject.id, session.id);
                            }
                          }}
                          className="w-8 h-8 rounded-[8px] inline-flex items-center justify-center"
                          style={{
                            background: "rgba(255,255,255,0.70)",
                            border: "1px solid rgba(0,0,0,0.10)",
                            color: "rgba(220,38,38,0.95)",
                          }}
                          title="Delete session"
                          aria-label="Delete session"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

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

            {/* MEDIA VIEW — FIXED UX: photo area never covered by notes */}
            {view === "media" && activeProject && currentMedia && (
              <div className="fixed inset-0 z-[100] bg-black">
                {/* Sticky top bar (always visible) */}
                <div className="absolute top-0 inset-x-0 z-50 px-4 pt-4 pb-3 sm:px-6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={goBack}
                      className="w-10 h-10 rounded-full bg-black/35 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-black/55 transition-colors duration-200 ease-out"
                      aria-label="Back"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>

                    <button
                      onClick={() => {
                        const next = !isFocusMode;
                        setIsFocusMode(next);
                        setIsAddPinMode(false);
                        if (next) setSelectedPinId(null);
                      }}
                      className="h-10 px-3 rounded-full bg-black/35 backdrop-blur-md border border-white/10 text-white flex items-center gap-2 hover:bg-black/55 transition-colors duration-200 ease-out"
                      aria-label="Focus"
                    >
                      {isFocusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                      <span className="text-xs font-semibold">{isFocusMode ? "Exit Focus" : "Focus"}</span>
                    </button>
                  </div>

                  <div className="hidden sm:flex items-center gap-2">
                    <button
                      onClick={goPrevMedia}
                      disabled={currentMediaIndex <= 0}
                      className="h-10 px-3 rounded-full bg-black/35 backdrop-blur-md border border-white/10 text-white flex items-center gap-2 hover:bg-black/55 transition-colors duration-200 ease-out disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Previous photo"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="text-xs font-semibold">Prev</span>
                    </button>

                    <button
                      onClick={goNextMedia}
                      disabled={currentMediaIndex < 0 || currentMediaIndex >= sessionMediaList.length - 1}
                      className="h-10 px-3 rounded-full bg-black/35 backdrop-blur-md border border-white/10 text-white flex items-center gap-2 hover:bg-black/55 transition-colors duration-200 ease-out disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Next photo"
                    >
                      <span className="text-xs font-semibold">Next</span>
                      <ChevronLeft className="w-4 h-4 rotate-180" />
                    </button>
                  </div>

                  <button
                    onClick={handleDeleteCurrentMedia}
                    className="w-10 h-10 rounded-full bg-black/35 backdrop-blur-md border border-white/10 text-red-200 flex items-center justify-center hover:bg-black/55 hover:text-red-100 transition-colors duration-200 ease-out"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Main layout: image (top) + notes panel (bottom) */}
                <div
                  className="h-full w-full grid"
                  style={{
                    gridTemplateRows: isFocusMode ? "1fr" : "minmax(0, 1fr) auto",
                  }}
                >
                  {/* IMAGE STAGE (never covered) */}
                  <div
                    ref={stageRef}
                    className={`relative min-h-0 flex items-center justify-center ${
                      isAddPinMode && !isFocusMode ? "cursor-crosshair" : ""
                    }`}
                    onClick={handleStageClickToAddPin}
                    onPointerDown={onStagePointerDown}
                    onPointerMove={onStagePointerMove}
                    onPointerUp={(e) => { onStagePointerUp(e); onStagePointerEnd(e); }}
                    onPointerLeave={(e) => { onStagePointerUp(e); onStagePointerEnd(e); }}
                  >
                    <img
                      src={currentMedia.url}
                      className={`max-w-full max-h-full object-contain transition-opacity duration-200 ease-out ${
                        isAddPinMode ? "opacity-85" : "opacity-100"
                      }`}
                      alt=""
                      draggable={false}
                    />

                    {/* Pins (hidden in focus mode) */}
                    {!isFocusMode &&
                      currentHotspots.map((h, idx) => {
                        const displayX = optimisticPin?.id === h.id ? optimisticPin.x : h.x;
                        const displayY = optimisticPin?.id === h.id ? optimisticPin.y : h.y;

                        const left = `${clamp01(displayX) * 100}%`;
                        const top = `${clamp01(displayY) * 100}%`;
                        const number = idx + 1;
                        const isSelected = (selectedPin?.id || null) === h.id;

                        return (
                          <button
                            key={h.id}
                            type="button"
                            onPointerDown={(e) => {
                              if (!isAddPinMode) onPinPointerDown(e, h);
                            }}
                            className={`absolute -translate-x-1/2 -translate-y-1/2 select-none touch-none
                              transition-transform duration-200 ease-out
                              ${isAddPinMode ? "pointer-events-none opacity-25 scale-90" : "pointer-events-auto"}
                              ${draggingPinId === h.id ? "scale-[1.10] z-50" : "z-10 hover:scale-[1.04]"}
                            `}
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
                              className="w-9 h-9 rounded-full text-xs font-bold flex items-center justify-center shadow-[0_14px_40px_-20px_rgba(0,0,0,0.9)]"
                              style={{
                                pointerEvents: "none",
                                background: isSelected ? palette.sun : "rgba(255,255,255,0.92)",
                                color: isSelected ? palette.ink : "#111",
                                border: `1px solid ${palette.pinEdge}`,
                              }}
                            >
                              {number}
                            </div>
                          </button>
                        );
                      })}

                    {/* Trash drop zone (only while dragging) */}
                    {!isFocusMode && (
                      <div
                        ref={trashRef}
                        className={`absolute bottom-6 left-1/2 -translate-x-1/2 transition-all duration-200 ease-out ${
                          draggingPinId ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-3 scale-95 pointer-events-none"
                        }`}
                      >
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-150 ease-out"
                          style={{
                            background: isHoveringTrash ? "rgba(220,38,38,0.95)" : "rgba(0,0,0,0.55)",
                            border: "1px solid rgba(255,255,255,0.16)",
                            color: isHoveringTrash ? "#fff" : "rgba(255,200,200,0.95)",
                            backdropFilter: "blur(12px)",
                            transform: isHoveringTrash ? "scale(1.08)" : "scale(1)",
                          }}
                        >
                          <Trash2 className="w-6 h-6" />
                        </div>
                      </div>
                    )}

                    {/* Add-pin hint */}
                    {isAddPinMode && !isFocusMode && (
                      <div className="absolute top-20 left-1/2 -translate-x-1/2 text-center pointer-events-none z-50">
                        <span
                          className="inline-block text-[10px] font-semibold uppercase tracking-widest px-4 py-2 rounded-full"
                          style={{
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

                  {/* BOTTOM PANEL (separate, so it never covers pins) */}
                  {!isFocusMode && (
                    <div
                      className="w-full px-4 pb-4 sm:px-6"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(255,254,250,0.00) 0%, rgba(255,254,250,0.65) 22%, rgba(255,254,250,0.92) 100%)",
                      }}
                    >
                      <div
                        className="mx-auto max-w-6xl rounded-[14px] overflow-hidden"
                        style={{
                          background: "rgba(255,255,255,0.82)",
                          border: "1px solid rgba(0,0,0,0.10)",
                          backdropFilter: "blur(18px)",
                          boxShadow: "0 22px 60px -52px rgba(0,0,0,0.55)",
                        }}
                      >
                        {/* Panel header row: Notes + Add pin */}
                        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                          <div className="flex items-center gap-2">
                            <StickyNote className="w-4 h-4 text-black/60" />
                            <div className="text-sm font-semibold" style={{ fontFamily: headerFont }}>
                              Notes
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Add pin next to notes (as requested), hidden while in focus (already handled) */}
                            <button
                              onClick={() => setIsAddPinMode((v) => !v)}
                              className="h-9 px-3 rounded-[8px] inline-flex items-center gap-2 transition-transform duration-200 ease-out active:scale-[0.98]"
                              style={{
                                background: isAddPinMode ? palette.sun : "rgba(255,255,255,0.70)",
                                color: palette.ink,
                                border: "1px solid rgba(0,0,0,0.10)",
                              }}
                              aria-label="Add pin"
                              title="Add pin"
                            >
                              <MapPin className="w-4 h-4" />
                              <span className="text-xs font-semibold">{isAddPinMode ? "Cancel" : "Add Pin"}</span>
                            </button>
                          </div>
                        </div>

                        {/* Content: overall note + selected pin note list */}
                        <div className="p-4 sm:p-5 space-y-4">
                          {/* Overall notes (use existing label/note fields if you later add them to media) */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-[11px] font-semibold uppercase tracking-widest text-black/45">
                                Photo notes
                              </div>

                              {/* If you don’t have per-photo notes stored yet, this is a placeholder action */}
                              <button
                                onClick={() => alert("Add per-photo notes to your media schema, then wire this button.")}
                                className="w-9 h-9 rounded-[8px] inline-flex items-center justify-center"
                                style={{
                                  background: "rgba(255,255,255,0.70)",
                                  border: "1px solid rgba(0,0,0,0.10)",
                                }}
                                title="Add note"
                                aria-label="Add note"
                              >
                                <Edit3 className="w-4 h-4 text-black/60" />
                              </button>
                            </div>

                            <div
                              className="text-sm text-black/70 leading-relaxed"
                              style={{
                                background: "rgba(255,255,255,0.58)",
                                border: "1px solid rgba(0,0,0,0.08)",
                                borderRadius: 8,
                                padding: 12,
                              }}
                            >
                              {/* Replace this with currentMedia.note if you add it */}
                              No photo notes yet.
                            </div>
                          </div>

                          {/* Pin details */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-[11px] font-semibold uppercase tracking-widest text-black/45">
                                Pins
                              </div>

                              <div className="text-[11px] text-black/45">
                                {currentHotspots.length ? `${currentHotspots.length} total` : "None"}
                              </div>
                            </div>

                            {currentHotspots.length === 0 ? (
                              <div
                                className="text-sm text-black/60"
                                style={{
                                  background: "rgba(255,255,255,0.58)",
                                  border: "1px dashed rgba(0,0,0,0.18)",
                                  borderRadius: 8,
                                  padding: 12,
                                }}
                              >
                                No pins yet. Tap <b>Add Pin</b>, then tap the photo.
                              </div>
                            ) : (
                              <>
                                {/* Selected pin preview (auto-populates) */}
                                <div
                                  className="mb-3"
                                  style={{
                                    background: "rgba(255,255,255,0.58)",
                                    border: "1px solid rgba(0,0,0,0.08)",
                                    borderRadius: 8,
                                    padding: 12,
                                  }}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <div
                                          className="w-7 h-7 rounded-full grid place-items-center text-xs font-bold"
                                          style={{
                                            background: palette.sun,
                                            color: palette.ink,
                                            border: "1px solid rgba(0,0,0,0.12)",
                                          }}
                                        >
                                          {Math.max(1, currentHotspots.findIndex((h) => h.id === selectedPin?.id) + 1)}
                                        </div>
                                        <div className="text-sm font-semibold truncate" style={{ fontFamily: headerFont }}>
                                          {selectedPin?.label?.trim() ? selectedPin.label : "Untitled pin"}
                                        </div>
                                      </div>

                                      <div className="mt-2 text-sm text-black/70 leading-relaxed">
                                        {selectedPin?.note?.trim() ? selectedPin.note : "No note yet. Hit Edit to add one."}
                                      </div>
                                    </div>

                                    <button
                                      onClick={() => openPinEditor(currentMedia.sessionId, currentMedia.id, selectedPin)}
                                      className="h-9 px-3 rounded-[8px] inline-flex items-center gap-2"
                                      style={{
                                        background: "rgba(255,255,255,0.70)",
                                        border: "1px solid rgba(0,0,0,0.10)",
                                        color: palette.ink,
                                      }}
                                    >
                                      <Pencil className="w-4 h-4" />
                                      <span className="text-xs font-semibold">Edit</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Quick pin list (tap to select) */}
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                  {currentHotspots.map((h, i) => {
                                    const active = h.id === selectedPin?.id;
                                    return (
                                      <button
                                        key={h.id}
                                        onClick={() => setSelectedPinId(h.id)}
                                        className="shrink-0 h-9 px-3 rounded-[999px] text-xs font-semibold transition-colors duration-200 ease-out"
                                        style={{
                                          background: active ? palette.sky : "rgba(255,255,255,0.65)",
                                          color: active ? "#fff" : "rgba(0,0,0,0.70)",
                                          border: "1px solid rgba(0,0,0,0.10)",
                                        }}
                                      >
                                        #{i + 1}
                                      </button>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pin editor modal (unchanged, but style-aligned) */}
                {pinOpen && (
                  <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
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
              </div>
            )}

            {/* Modals */}
            <NewProjectModal open={newOpen} onClose={() => setNewOpen(false)} onCreate={handleCreateProject} />
            <AddMediaModal
              isOpen={mediaOpen}
              onClose={() => { setMediaOpen(false); setAutoPromptMediaPicker(false); }}
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