// /src/features/media/MediaViewer.jsx
import React, { useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  Trash2,
  Pencil,
  MapPin,
  Maximize2,
  Minimize2,
  StickyNote,
  Edit3,
  Share2,
  MoreHorizontal,
  Heart,
} from "lucide-react";
import PinEditorModal from "../../components/PinEditorModal";

function clamp01(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

/**
 * MediaViewer
 * - Fully owns "media view" UI state: focus mode, pin mode, selected pin, drag, pin editor modal, swipe
 * - You pass in project/media + pin CRUD callbacks from App (or from context).
 */
export default function MediaViewer({
  project,
  media, // expects { id, url, sessionId, hotspots: [] }
  headerFont,
  palette,
  mediaIndex = 0,
  mediaCount = 0,
  onBack,
  onPrev,
  onNext,
  onDeleteMedia,

  // Pin CRUD (wire to VaultContext functions)
  onAddHotspot,
  onUpdateHotspot,
  onDeleteHotspot,
}) {
  // Pins
  const [isAddPinMode, setIsAddPinMode] = useState(false);
  const [selectedPinId, setSelectedPinId] = useState(null);

  // Focus mode (full-bleed image, no pins, no panel)
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Pin editor modal
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

  // Swipe nav
  const swipeRef = useRef({ down: false, x0: 0, y0: 0 });

  const currentHotspots = Array.isArray(media?.hotspots) ? media.hotspots : [];

  const selectedPin = useMemo(() => {
    if (!currentHotspots.length) return null;
    const found = selectedPinId ? currentHotspots.find((h) => h.id === selectedPinId) : null;
    return found || currentHotspots[0] || null;
  }, [currentHotspots, selectedPinId]);

  const openPinEditor = (hotspot) => {
    if (!hotspot?.id) return;
    setPinTarget({
      sessionId: media.sessionId,
      mediaId: media.id,
      hotspotId: hotspot.id,
    });
    setPinDraft({ label: hotspot.label || "", note: hotspot.note || "" });
    setPinOpen(true);
  };

  const savePinEdits = async (nextDraft) => {
    if (!project?.id || !pinTarget) return;

    try {
      await onUpdateHotspot?.(
        project.id,
        pinTarget.sessionId,
        pinTarget.mediaId,
        pinTarget.hotspotId,
        { label: nextDraft?.label || "", note: nextDraft?.note || "" }
      );
      setPinOpen(false);
      setPinTarget(null);
    } catch (e) {
      console.error("Failed to update pin:", e);
    }
  };

  const deletePin = async () => {
    if (!project?.id || !pinTarget) return;
    if (!confirm("Delete this pin?")) return;
    try {
      await onDeleteHotspot?.(
        project.id,
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

  const handleStageClickToAddPin = async (e) => {
    if (!isAddPinMode || isFocusMode) return;
    if (!project?.id || !media?.id) return;
    if (!stageRef.current) return;

    try {
      const rect = stageRef.current.getBoundingClientRect();
      const clientX = e.clientX ?? e.touches?.[0]?.clientX;
      const clientY = e.clientY ?? e.touches?.[0]?.clientY;
      if (clientX == null || clientY == null) return;

      const x = clamp01((clientX - rect.left) / rect.width);
      const y = clamp01((clientY - rect.top) / rect.height);
      const newPinId = `h-${Date.now()}`;

      await onAddHotspot?.(project.id, media.sessionId, media.id, {
        id: newPinId,
        x,
        y,
        label: "",
        note: "",
      });

      setIsAddPinMode(false);
      setSelectedPinId(newPinId);
    } catch (err) {
      console.error("Failed to save pin:", err);
      alert("Failed to save pin. Check console.");
    }
  };

  const onPinPointerDown = (e, hotspot) => {
    if (isFocusMode) return;

    // Tap selects (no editor)
    setSelectedPinId(hotspot.id);

    // Long press to drag
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
    }, 450);
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

    if (!stageRef.current) return;

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

      setIsHoveringTrash(hovering);
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

    if (droppedInTrash && project?.id && media?.id) {
      try {
        await onDeleteHotspot?.(project.id, media.sessionId, media.id, hotspotId);
      } catch (err) {
        console.error("Failed to incinerate pin:", err);
      }
      return;
    }

    if (pinDataToSave && project?.id && media?.id) {
      try {
        await onUpdateHotspot?.(
          project.id,
          media.sessionId,
          media.id,
          hotspotId,
          { x: pinDataToSave.x, y: pinDataToSave.y }
        );
      } catch (err) {
        console.error("Failed to move pin:", err);
      }
    }
  };

  // Swipe handling (mobile-first)
  // - Allow swipe in focus mode too.
  // - Keep disabled while adding pins.
  // - Stage uses touchAction: pan-y, and the image is pointerEvents:none.
  const onStagePointerDown = (e) => {
    if (isAddPinMode) return;
    const x = e.clientX ?? e.touches?.[0]?.clientX;
    const y = e.clientY ?? e.touches?.[0]?.clientY;
    if (x == null || y == null) return;
    swipeRef.current = { down: true, x0: x, y0: y };
  };

  const onStagePointerEnd = (e) => {
    if (isAddPinMode) return;
    if (!swipeRef.current.down) return;

    const x =
      e.clientX ?? e.changedTouches?.[0]?.clientX ?? e.touches?.[0]?.clientX ?? null;
    const y =
      e.clientY ?? e.changedTouches?.[0]?.clientY ?? e.touches?.[0]?.clientY ?? null;

    swipeRef.current.down = false;
    if (x == null || y == null) return;

    const dx = x - swipeRef.current.x0;
    const dy = y - swipeRef.current.y0;

    // Require clear horizontal intent
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.25) {
      if (dx < 0) onNext?.();
      else onPrev?.();
    }
  };

  const canPrev = mediaIndex > 0;
  const canNext = mediaIndex < Math.max(0, mediaCount - 1);

  return (
    <div className="fixed inset-0 z-[100]" style={{ background: "#F4F4F5" }}>
      {/* Sticky top bar (Pinterest-like) */}
      <div className="absolute top-0 inset-x-0 z-50 px-4 pt-4 pb-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsAddPinMode(false);
              setIsFocusMode(false);
              setSelectedPinId(null);
              onBack?.();
            }}
            className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md border border-black/10 text-black flex items-center justify-center hover:bg-white transition-colors duration-200 ease-out"
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
            className="h-10 px-3 rounded-full bg-white/80 backdrop-blur-md border border-black/10 text-black flex items-center gap-2 hover:bg-white transition-colors duration-200 ease-out"
            aria-label="Focus"
          >
            {isFocusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="text-xs font-semibold">{isFocusMode ? "Exit Focus" : "Focus"}</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={onPrev}
            disabled={!canPrev}
            className="h-10 px-3 rounded-full bg-white/80 backdrop-blur-md border border-black/10 text-black flex items-center gap-2 hover:bg-white transition-colors duration-200 ease-out disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Previous photo"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-xs font-semibold">Prev</span>
          </button>

          <button
            onClick={onNext}
            disabled={!canNext}
            className="h-10 px-3 rounded-full bg-white/80 backdrop-blur-md border border-black/10 text-black flex items-center gap-2 hover:bg-white transition-colors duration-200 ease-out disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Next photo"
          >
            <span className="text-xs font-semibold">Next</span>
            <ChevronLeft className="w-4 h-4 rotate-180" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md border border-black/10 text-black flex items-center justify-center hover:bg-white transition-colors duration-200 ease-out"
            aria-label="Save"
            title="Save"
            onClick={() => alert("Wire save later.")}
          >
            <Heart className="w-5 h-5" />
          </button>

          <button
            className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md border border-black/10 text-black flex items-center justify-center hover:bg-white transition-colors duration-200 ease-out"
            aria-label="Share"
            title="Share"
            onClick={() => alert("Wire share later.")}
          >
            <Share2 className="w-5 h-5" />
          </button>

          <button
            onClick={onDeleteMedia}
            className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md border border-black/10 text-red-600 flex items-center justify-center hover:bg-white transition-colors duration-200 ease-out"
            aria-label="Delete"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div
        className="h-full w-full grid"
        style={{ gridTemplateRows: isFocusMode ? "1fr" : "minmax(0, 1fr) auto" }}
      >
        {/* IMAGE CARD */}
        <div className="min-h-0 flex items-center justify-center px-4 pt-20 pb-6 sm:px-6">
          <div
            className="w-full max-w-5xl"
            style={{
              borderRadius: 18,
              background: "rgba(255,255,255,0.86)",
              border: "1px solid rgba(0,0,0,0.08)",
              boxShadow: "0 26px 70px -56px rgba(0,0,0,0.55)",
              overflow: "hidden",
            }}
          >
            {/* Stage is the relative area (pins live here) */}
            <div
              ref={stageRef}
              className={`relative w-full ${isAddPinMode && !isFocusMode ? "cursor-crosshair" : ""}`}
              style={{ touchAction: "pan-y" }}
              onClick={handleStageClickToAddPin}
              onPointerDown={onStagePointerDown}
              onPointerMove={onStagePointerMove}
              onPointerUp={(e) => {
                onStagePointerUp(e);
                onStagePointerEnd(e);
              }}
              onPointerLeave={(e) => {
                onStagePointerUp(e);
                onStagePointerEnd(e);
              }}
              onTouchStart={onStagePointerDown}
              onTouchEnd={onStagePointerEnd}
            >
              <img
                src={media?.url}
                className={`w-full object-contain transition-opacity duration-200 ease-out ${
                  isAddPinMode ? "opacity-85" : "opacity-100"
                }`}
                style={{ pointerEvents: "none", maxHeight: "72vh" }}
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
                        className="w-9 h-9 rounded-full text-xs font-bold flex items-center justify-center shadow-[0_14px_40px_-20px_rgba(0,0,0,0.35)]"
                        style={{
                          pointerEvents: "none",
                          background: isSelected ? palette.sun : "rgba(255,255,255,0.92)",
                          color: isSelected ? palette.ink : "#111",
                          border: `1px solid ${palette.pinEdge || "rgba(0,0,0,0.14)"}`,
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
                    draggingPinId
                      ? "opacity-100 translate-y-0 scale-100"
                      : "opacity-0 translate-y-3 scale-95 pointer-events-none"
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
                <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center pointer-events-none z-50">
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

            {/* Action row under the image (Pinterest vibe) */}
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}
            >
              <button
                className="w-10 h-10 rounded-full grid place-items-center"
                style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.08)" }}
                onClick={() => alert("Wire actions later.")}
                aria-label="More"
                title="More"
              >
                <MoreHorizontal className="w-5 h-5 text-black/70" />
              </button>

              <div className="text-[11px] text-black/45">
                {mediaIndex + 1} / {mediaCount}
              </div>

              <button
                onClick={() => setIsAddPinMode((v) => !v)}
                className="h-10 px-4 rounded-full inline-flex items-center gap-2 transition-transform duration-200 ease-out active:scale-[0.98]"
                style={{
                  background: isAddPinMode ? palette.sun : "rgba(0,0,0,0.04)",
                  border: "1px solid rgba(0,0,0,0.10)",
                  color: palette.ink,
                }}
                aria-label="Add pin"
                title="Add pin"
                disabled={isFocusMode}
              >
                <MapPin className="w-4 h-4" />
                <span className="text-xs font-semibold">{isAddPinMode ? "Cancel" : "Add Pin"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* BOTTOM PANEL */}
        {!isFocusMode && (
          <div
            className="w-full px-4 pb-4 sm:px-6"
            style={{
              background:
                "linear-gradient(180deg, rgba(244,244,245,0.00) 0%, rgba(244,244,245,0.72) 22%, rgba(244,244,245,0.96) 100%)",
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
              {/* Panel header row */}
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}
              >
                <div className="flex items-center gap-2">
                  <StickyNote className="w-4 h-4 text-black/60" />
                  <div className="text-sm font-semibold" style={{ fontFamily: headerFont }}>
                    Notes
                  </div>
                </div>

                {/* (Keep add pin here too for mobile quick access) */}
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

              <div className="p-4 sm:p-5 space-y-4">
                {/* Photo notes (placeholder) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-black/45">
                      Photo notes
                    </div>
                    <button
                      onClick={() => alert("Wire per-photo notes later.")}
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
                    No photo notes yet.
                  </div>
                </div>

                {/* Pins */}
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
                      {/* Selected pin preview */}
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
                                {Math.max(
                                  1,
                                  currentHotspots.findIndex((h) => h.id === selectedPin?.id) + 1
                                )}
                              </div>
                              <div
                                className="text-sm font-semibold truncate"
                                style={{ fontFamily: headerFont }}
                              >
                                {selectedPin?.label?.trim() ? selectedPin.label : "Untitled pin"}
                              </div>
                            </div>

                            <div className="mt-2 text-sm text-black/70 leading-relaxed">
                              {selectedPin?.note?.trim()
                                ? selectedPin.note
                                : "No note yet. Hit Edit to add one."}
                            </div>
                          </div>

                          <button
                            onClick={() => openPinEditor(selectedPin)}
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

                      {/* Quick pin list */}
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

      {/* Pin editor modal (MUST be inside the returned JSX) */}
      {pinOpen && (
        <PinEditorModal
          open={pinOpen}
          initial={pinDraft}
          headerFont={headerFont}
          palette={palette}
          onClose={() => setPinOpen(false)}
          onSave={async (draft) => {
            await savePinEdits(draft);
          }}
          onDelete={async () => {
            await deletePin();
          }}
        />
      )}
    </div>
  );
}
