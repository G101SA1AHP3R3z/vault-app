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
  Maximize2,
  Minimize2,
  StickyNote,
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
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-28 -left-28 w-[520px] h-[520px] rounded-[48px] rotate-[18deg]" style={{ background: palette.sun, opacity: 0.16 }} />
        <div className="absolute top-10 -right-64 w-[820px] h-[300px] rounded-[60px] rotate-[-12deg]" style={{ background: palette.sky, opacity: 0.10 }} />
        <div className="absolute -bottom-44 left-16 w-[760px] h-[460px] rounded-[70px] rotate-[10deg]" style={{ background: palette.breeze, opacity: 0.09 }} />
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

/** --- Inline Search (so Search tab actually works) --- */
function SearchBarInline({ value, onChange }) {
  return (
    <div
      className="mb-4 rounded-[8px] px-3 py-2 flex items-center gap-2"
      style={{
        background: "rgba(255,255,255,0.62)",
        border: "1px solid rgba(0,0,0,0.08)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="text-black/35 text-xs font-semibold uppercase tracking-widest">Search</div>
      <div className="flex-1" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Projects, tags…"
        className="w-full bg-transparent outline-none text-sm text-black placeholder:text-black/35"
      />
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

  // --- PIN + SELECTION ---
  const [isAddPinMode, setIsAddPinMode] = useState(false);
  const [selectedPinId, setSelectedPinId] = useState(null);

  // --- SHEET + FOCUS ---
  const [isFocused, setIsFocused] = useState(false);
  const [sheetY, setSheetY] = useState(0); // translateY in px (0 = fully up)
  const sheetDragRef = useRef({
    dragging: false,
    startY: 0,
    startSheetY: 0,
  });

  // --- NOTES (UI only; persistence TODO) ---
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  // --- DRAG & TRASH FOR PINS ---
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
    setIsFocused(false);
    setSheetY(0);
    setIsAddPinMode(false);
    setSelectedPinId(null);
  };

  const goBack = () => {
    if (view === "media") {
      setView("project");
      setActiveMedia(null);
      setIsAddPinMode(false);
      setIsFocused(false);
      setSheetY(0);
      setSelectedPinId(null);
      setIsEditingNote(false);
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

  const currentHotspots = currentMedia?.hotspots || [];

  // Keep selected pin sane
  useEffect(() => {
    if (!currentMedia) return;
    const exists = currentHotspots.some((h) => h.id === selectedPinId);
    if (!exists) setSelectedPinId(currentHotspots[0]?.id || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMedia?.id, currentHotspots.length]);

  // Seed note draft when media changes
  useEffect(() => {
    if (!currentMedia) return;
    setNoteDraft(currentMedia.note || "");
    setIsEditingNote(false);
  }, [currentMedia?.id]);

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

  /** ---------------------------
   *  PINS: add + drag
   *  --------------------------*/
  const handleStageClickToAddPin = async (e) => {
    if (!isAddPinMode) return;
    if (isFocused) return; // requirement: focus hides pins + pin actions

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

      setSelectedPinId(newPinId);
      setIsAddPinMode(false);
    } catch (err) {
      console.error("Failed to save pin:", err);
      alert("Failed to save pin. Check console.");
    }
  };

  const onPinPointerDown = (e, hotspot) => {
    e.preventDefault();
    e.stopPropagation();

    // TAP SHOULD ONLY SELECT (no auto open editor)
    setSelectedPinId(hotspot.id);

    // still allow long-press drag
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
        const hovering = clientX >= tRect.left && clientX <= tRect.right && clientY >= tRect.top && clientY <= tRect.bottom;
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
      droppedInTrash = clientX >= tRect.left && clientX <= tRect.right && clientY >= tRect.top && clientY <= tRect.bottom;
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
        if (selectedPinId === hotspotId) setSelectedPinId(null);
      } catch (err) {
        console.error("Failed to delete pin:", err);
      }
      return;
    }

    if (pinDataToSave && activeProject && currentMedia) {
      try {
        await updateHotspotInMedia(activeProject.id, currentMedia.sessionId, currentMedia.id, hotspotId, {
          x: pinDataToSave.x,
          y: pinDataToSave.y,
        });
      } catch (err) {
        console.error("Failed to move pin:", err);
      }
    }
  };

  /** ---------------------------
   *  SHEET DRAG -> FOCUS
   *  --------------------------*/
  const SHEET_PEEK = 54; // px visible when focused
  const SHEET_MAX_DOWN = 520; // clamp

  const setFocusOn = (on) => {
    setIsFocused(on);
    setIsAddPinMode(false); // requirement: hide pins + add pin when focused
    if (on) {
      setSheetY(SHEET_MAX_DOWN);
    } else {
      setSheetY(0);
    }
  };

  const onSheetPointerDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    sheetDragRef.current.dragging = true;
    sheetDragRef.current.startY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    sheetDragRef.current.startSheetY = sheetY;
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {}
  };

  const onSheetPointerMove = (e) => {
    if (!sheetDragRef.current.dragging) return;
    const cy = e.clientY ?? e.touches?.[0]?.clientY;
    if (cy == null) return;
    const dy = cy - sheetDragRef.current.startY;
    const next = Math.max(0, Math.min(SHEET_MAX_DOWN, sheetDragRef.current.startSheetY + dy));
    setSheetY(next);
  };

  const onSheetPointerUp = () => {
    if (!sheetDragRef.current.dragging) return;
    sheetDragRef.current.dragging = false;

    // Snap behavior
    const threshold = 220; // if pulled down enough -> focus
    if (sheetY > threshold) {
      setIsFocused(true);
      setIsAddPinMode(false);
      setSheetY(SHEET_MAX_DOWN);
    } else {
      setIsFocused(false);
      setSheetY(0);
    }
  };

  /** ---------------------------
   *  NOTES + PIN CONTENT
   *  --------------------------*/
  const selectedPin = useMemo(() => currentHotspots.find((h) => h.id === selectedPinId) || null, [currentHotspots, selectedPinId]);

  const goNextPin = () => {
    if (!currentHotspots.length) return;
    const idx = currentHotspots.findIndex((h) => h.id === selectedPinId);
    const next = idx < 0 ? 0 : (idx + 1) % currentHotspots.length;
    setSelectedPinId(currentHotspots[next].id);
  };

  const saveNote = async () => {
    // TODO: Persist this. Add a VaultContext method like:
    // updateMediaNote(projectId, sessionId, mediaId, note)
    // and call it here.
    //
    // For now, we just close the editor so UX flows.
    setIsEditingNote(false);
  };

  return (
    <AbstractCreamBackdrop>
      <div className="min-h-screen text-gray-900 flex justify-center items-center antialiased selection:bg-black selection:text-white" style={{ fontFamily: bodyFont }}>
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

                {/* FIX: Search tab actually needs a search input */}
                {tab === "search" && <SearchBarInline value={search} onChange={setSearch} />}

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
                    <button className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center shrink-0 shadow-lg hover:scale-105 transition-transform" title="Play">
                      <Play className="w-5 h-5 ml-1" />
                    </button>
                    <div className="flex-1">
                      <p className="text-[10px] font-semibold text-black/45 uppercase tracking-widest mb-1">Project Context</p>
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

            {/* MEDIA VIEW — NEW DASHBOARD STYLE */}
            {view === "media" && activeProject && currentMedia && (
              <div className="fixed inset-0 z-[100] overflow-hidden" style={{ background: palette.paper }}>
                {/* Sticky top bar (always visible) */}
                <div
                  className="absolute top-0 inset-x-0 z-50 px-4 pt-4 pb-3 flex items-center justify-between"
                  style={{
                    background: "rgba(255,255,255,0.55)",
                    backdropFilter: "blur(14px)",
                    borderBottom: "1px solid rgba(0,0,0,0.08)",
                  }}
                >
                  <button
                    onClick={goBack}
                    className="h-11 px-3 rounded-[8px] inline-flex items-center gap-2 text-sm font-semibold"
                    style={{ background: "rgba(255,255,255,0.70)", border: "1px solid rgba(0,0,0,0.08)" }}
                  >
                    <ChevronLeft className="w-5 h-5" /> Back
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setFocusOn(!isFocused)}
                      className="h-11 px-3 rounded-[8px] inline-flex items-center gap-2 text-sm font-semibold"
                      style={{
                        background: isFocused ? palette.sun : "rgba(255,255,255,0.70)",
                        border: "1px solid rgba(0,0,0,0.08)",
                        color: palette.ink,
                      }}
                      title={isFocused ? "Exit focus" : "Focus"}
                    >
                      {isFocused ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                      <span className="hidden sm:inline">{isFocused ? "Focused" : "Focus"}</span>
                    </button>

                    <button
                      onClick={handleDeleteCurrentMedia}
                      className="h-11 px-3 rounded-[8px] inline-flex items-center gap-2 text-sm font-semibold"
                      style={{
                        background: "rgba(255,255,255,0.70)",
                        border: "1px solid rgba(220,38,38,0.25)",
                        color: "#DC2626",
                      }}
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                </div>

                {/* Photo stage */}
                <div
                  ref={stageRef}
                  className="absolute inset-0 pt-[72px] pb-[24px] flex items-center justify-center"
                  onClick={handleStageClickToAddPin}
                  onPointerMove={onStagePointerMove}
                  onPointerUp={onStagePointerUp}
                  onPointerLeave={onStagePointerUp}
                >
                  <div
                    className="relative w-full h-full"
                    style={{
                      paddingBottom: isFocused ? 0 : 18,
                    }}
                  >
                    {/* image */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        className="relative max-w-[96vw] max-h-[78vh] md:max-h-[86vh]"
                        style={{
                          borderRadius: 12,
                          overflow: "hidden",
                          boxShadow: "0 22px 60px -52px rgba(0,0,0,0.45)",
                          border: "1px solid rgba(0,0,0,0.08)",
                          background: "rgba(255,255,255,0.45)",
                        }}
                      >
                        <img
                          src={currentMedia.url}
                          className={`block max-w-full max-h-[86vh] object-contain transition-opacity duration-300 ${
                            isAddPinMode && !isFocused ? "opacity-70" : "opacity-100"
                          }`}
                          alt=""
                          draggable={false}
                        />
                      </div>
                    </div>

                    {/* pins overlay (hidden when focused) */}
                    {!isFocused &&
                      currentHotspots.map((h, idx) => {
                        const displayX = optimisticPin?.id === h.id ? optimisticPin.x : h.x;
                        const displayY = optimisticPin?.id === h.id ? optimisticPin.y : h.y;

                        const left = `${clamp01(displayX) * 100}%`;
                        const top = `${clamp01(displayY) * 100}%`;
                        const number = idx + 1;
                        const isSelected = selectedPinId === h.id;

                        return (
                          <button
                            key={h.id}
                            type="button"
                            onPointerDown={(e) => {
                              if (!isAddPinMode) onPinPointerDown(e, h);
                            }}
                            className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-100 select-none touch-none ${
                              isAddPinMode ? "pointer-events-none opacity-15 scale-75" : "pointer-events-auto cursor-pointer z-10"
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
                              className="w-9 h-9 flex items-center justify-center text-xs font-semibold"
                              style={{
                                pointerEvents: "none",
                                borderRadius: 999,
                                background: isSelected ? palette.sun : "rgba(255,255,255,0.92)",
                                color: palette.ink,
                                border: isSelected ? "1px solid rgba(0,0,0,0.18)" : "1px solid rgba(0,0,0,0.10)",
                                boxShadow: "0 10px 25px -18px rgba(0,0,0,0.45)",
                              }}
                            >
                              {number}
                            </div>
                          </button>
                        );
                      })}

                    {/* trash drop zone (only while dragging) */}
                    {!isFocused && (
                      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
                        <div
                          ref={trashRef}
                          className={`transition-all duration-300 pointer-events-auto ${
                            draggingPinId ? "translate-y-0 opacity-100 scale-100" : "translate-y-10 opacity-0 scale-50"
                          }`}
                        >
                          <div
                            className="w-16 h-16 flex items-center justify-center"
                            style={{
                              borderRadius: 999,
                              background: isHoveringTrash ? "#DC2626" : "rgba(255,255,255,0.78)",
                              color: isHoveringTrash ? "#fff" : "#DC2626",
                              border: "1px solid rgba(0,0,0,0.10)",
                              boxShadow: "0 18px 50px -40px rgba(0,0,0,0.55)",
                              backdropFilter: "blur(14px)",
                              transform: isHoveringTrash ? "scale(1.15)" : "scale(1)",
                              transition: "all 140ms ease",
                            }}
                          >
                            <Trash2 className="w-6 h-6" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Add pin helper text */}
                    {!isFocused && isAddPinMode && (
                      <div className="absolute top-24 left-1/2 -translate-x-1/2 text-center pointer-events-none z-50 animate-in fade-in slide-in-from-top-2">
                        <span
                          className="inline-block text-[10px] font-semibold uppercase tracking-widest px-4 py-2"
                          style={{
                            borderRadius: 999,
                            background: "rgba(255,255,255,0.85)",
                            border: "1px solid rgba(0,0,0,0.08)",
                            backdropFilter: "blur(12px)",
                          }}
                        >
                          Tap anywhere to drop a pin
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom sheet: notes + pins (draggable) */}
                <div
                  className="absolute inset-x-0 bottom-0 z-60"
                  style={{
                    transform: `translateY(${sheetY}px)`,
                    transition: sheetDragRef.current.dragging ? "none" : "transform 220ms ease",
                  }}
                >
                  {/* “peek” bar area */}
                  <div
                    onPointerDown={onSheetPointerDown}
                    onPointerMove={onSheetPointerMove}
                    onPointerUp={onSheetPointerUp}
                    onPointerCancel={onSheetPointerUp}
                    className="w-full"
                    style={{
                      paddingTop: 10,
                      paddingBottom: 10,
                      background: "rgba(255,255,255,0.62)",
                      borderTop: "1px solid rgba(0,0,0,0.10)",
                      backdropFilter: "blur(18px)",
                    }}
                  >
                    <div className="mx-auto w-12 h-[4px]" style={{ borderRadius: 999, background: "rgba(0,0,0,0.18)" }} />
                  </div>

                  {/* Sheet content */}
                  <div
                    className="px-4 pb-5"
                    style={{
                      background: "rgba(255,255,255,0.62)",
                      backdropFilter: "blur(18px)",
                      borderTop: "1px solid rgba(0,0,0,0.08)",
                      boxShadow: "0 -22px 60px -52px rgba(0,0,0,0.35)",
                    }}
                  >
                    {/* When focused, we only show the peek area; content stays hidden */}
                    {isFocused ? (
                      <div style={{ height: SHEET_PEEK }} />
                    ) : (
                      <>
                        {/* NOTES HEADER + ACTIONS */}
                        <div className="pt-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <StickyNote className="w-4 h-4 text-black/60" />
                            <div className="text-[11px] font-semibold uppercase tracking-widest text-black/50">Notes</div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Add Pin moved next to Notes. Hidden while focused (handled above), also hide while add-pin mode active? keep visible. */}
                            <button
                              onClick={() => {
                                setIsAddPinMode((v) => !v);
                              }}
                              className="h-9 px-3 rounded-[8px] inline-flex items-center gap-2 text-[12px] font-semibold"
                              style={{
                                background: isAddPinMode ? palette.sun : "rgba(255,255,255,0.72)",
                                border: "1px solid rgba(0,0,0,0.10)",
                                color: palette.ink,
                              }}
                              title={isAddPinMode ? "Cancel add pin" : "Add pin"}
                            >
                              {isAddPinMode ? <X className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                              <span>{isAddPinMode ? "Cancel" : "Add pin"}</span>
                            </button>

                            {/* note edit/add */}
                            <button
                              onClick={() => setIsEditingNote((v) => !v)}
                              className="h-9 w-9 rounded-[8px] inline-flex items-center justify-center"
                              style={{
                                background: "rgba(255,255,255,0.72)",
                                border: "1px solid rgba(0,0,0,0.10)",
                                color: palette.ink,
                              }}
                              title={currentMedia.note ? "Edit note" : "Add note"}
                            >
                              {currentMedia.note ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* NOTES BODY */}
                        <div className="mt-2">
                          {isEditingNote ? (
                            <div className="space-y-2">
                              <textarea
                                rows={3}
                                value={noteDraft}
                                onChange={(e) => setNoteDraft(e.target.value)}
                                className="w-full px-3 py-2 text-sm outline-none resize-none"
                                style={{
                                  background: "rgba(255,255,255,0.78)",
                                  border: "1px solid rgba(0,0,0,0.10)",
                                  borderRadius: 8,
                                }}
                                placeholder="Add a quick note about this photo…"
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setIsEditingNote(false);
                                    setNoteDraft(currentMedia.note || "");
                                  }}
                                  className="h-9 px-3 rounded-[8px] text-[12px] font-semibold"
                                  style={{
                                    background: "rgba(255,255,255,0.72)",
                                    border: "1px solid rgba(0,0,0,0.10)",
                                  }}
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={saveNote}
                                  className="h-9 px-3 rounded-[8px] text-[12px] font-semibold"
                                  style={{
                                    background: palette.sky,
                                    color: "#fff",
                                    border: "1px solid rgba(0,0,0,0.10)",
                                  }}
                                >
                                  Save
                                </button>
                              </div>
                              <div className="text-[10px] text-black/40">
                                TODO: wire this to Firestore by adding `updateMediaNote(...)` in VaultContext.
                              </div>
                            </div>
                          ) : currentMedia.note ? (
                            <div
                              className="px-3 py-2 text-sm"
                              style={{
                                background: "rgba(255,255,255,0.72)",
                                border: "1px solid rgba(0,0,0,0.10)",
                                borderRadius: 8,
                              }}
                            >
                              {currentMedia.note}
                            </div>
                          ) : (
                            <div
                              className="px-3 py-2 text-sm text-black/45"
                              style={{
                                background: "rgba(255,255,255,0.62)",
                                border: "1px dashed rgba(0,0,0,0.18)",
                                borderRadius: 8,
                              }}
                            >
                              No notes yet.
                            </div>
                          )}
                        </div>

                        {/* PIN NOTES */}
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-black/60" />
                            <div className="text-[11px] font-semibold uppercase tracking-widest text-black/50">Pins</div>
                            <div className="text-[11px] font-semibold text-black/35">
                              {currentHotspots.length ? `${currentHotspots.length}` : "0"}
                            </div>
                          </div>

                          <button
                            onClick={goNextPin}
                            disabled={!currentHotspots.length}
                            className="h-9 px-3 rounded-[8px] inline-flex items-center gap-2 text-[12px] font-semibold disabled:opacity-50"
                            style={{
                              background: "rgba(255,255,255,0.72)",
                              border: "1px solid rgba(0,0,0,0.10)",
                              color: palette.ink,
                            }}
                          >
                            Next pin <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="mt-2">
                          {selectedPin ? (
                            <div
                              className="p-3"
                              style={{
                                background: "rgba(255,255,255,0.72)",
                                border: "1px solid rgba(0,0,0,0.10)",
                                borderRadius: 8,
                              }}
                            >
                              <div className="text-[12px] font-semibold" style={{ fontFamily: headerFont }}>
                                {selectedPin.label?.trim() ? selectedPin.label : "Untitled pin"}
                              </div>
                              <div className="mt-1 text-sm text-black/70">
                                {selectedPin.note?.trim() ? selectedPin.note : "No pin note yet."}
                              </div>

                              {/* Optional: quick delete pin */}
                              <div className="mt-3 flex justify-end">
                                <button
                                  onClick={async () => {
                                    if (!confirm("Delete this pin?")) return;
                                    await deleteHotspotFromMedia(activeProject.id, currentMedia.sessionId, currentMedia.id, selectedPin.id);
                                  }}
                                  className="h-9 px-3 rounded-[8px] inline-flex items-center gap-2 text-[12px] font-semibold"
                                  style={{
                                    background: "rgba(255,255,255,0.72)",
                                    border: "1px solid rgba(220,38,38,0.25)",
                                    color: "#DC2626",
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" /> Delete pin
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="p-3 text-sm text-black/45"
                              style={{
                                background: "rgba(255,255,255,0.62)",
                                border: "1px dashed rgba(0,0,0,0.18)",
                                borderRadius: 8,
                              }}
                            >
                              Tap a pin to see its note.
                            </div>
                          )}
                        </div>

                        {/* Pin “selector row” — small chips for quick jumping */}
                        {currentHotspots.length > 0 && (
                          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                            {currentHotspots.map((h, i) => {
                              const active = h.id === selectedPinId;
                              return (
                                <button
                                  key={h.id}
                                  onClick={() => setSelectedPinId(h.id)}
                                  className="shrink-0 h-9 px-3 rounded-[8px] text-[12px] font-semibold"
                                  style={{
                                    background: active ? palette.sun : "rgba(255,255,255,0.72)",
                                    border: "1px solid rgba(0,0,0,0.10)",
                                    color: palette.ink,
                                  }}
                                >
                                  {i + 1}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* When focused, leave just a visible lip so user can pull up */}
                  {isFocused && (
                    <div
                      className="absolute inset-x-0 bottom-0"
                      style={{
                        height: SHEET_PEEK,
                        background: "rgba(255,255,255,0.62)",
                        borderTop: "1px solid rgba(0,0,0,0.08)",
                        backdropFilter: "blur(18px)",
                      }}
                    />
                  )}
                </div>
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
