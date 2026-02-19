// /src/features/media/MediaViewer.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import PinEditorModal from "../../components/PinEditorModal";

import useSwipeNav from "./hooks/useSwipeNav";
import usePinDrag from "./hooks/usePinDrag";

import MediaStage from "./components/MediaStage";
import PinNotesPanel from "./components/PinNotesPanel";

function clamp01(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

export default function MediaViewer({
  mode = "modal",
  project,
  media,
  headerFont,
  palette,
  mediaIndex = 0,
  mediaCount = 0,

  moreFromSession = [],
  onSelectMedia,

  onBack,
  onPrev,
  onNext,
  onDeleteMedia,
  onSwipeDown,

  onAddHotspot,
  onUpdateHotspot,
  onDeleteHotspot,
}) {
  const isEmbedded = mode === "embedded";

  // iOS-like spacing between slides
  const GAP_PX = 16;

  const [isAddPinMode, setIsAddPinMode] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [selectedPinId, setSelectedPinId] = useState(null);

  const [pinOpen, setPinOpen] = useState(false);
  const [pinDraft, setPinDraft] = useState({ label: "", note: "" });
  const [pinTarget, setPinTarget] = useState(null);

  const stageRef = useRef(null);
  const carouselRef = useRef(null);
  const trashRef = useRef(null);

  const currentHotspots = Array.isArray(media?.hotspots) ? media.hotspots : [];

  const neighbors = useMemo(() => {
    if (!media?.id || !Array.isArray(moreFromSession) || moreFromSession.length === 0) {
      return { prevSrc: "", nextSrc: "", canPrev: false, canNext: false };
    }
    const idx = moreFromSession.findIndex((m) => m?.id === media.id);
    if (idx < 0) return { prevSrc: "", nextSrc: "", canPrev: false, canNext: false };

    const prev = idx > 0 ? moreFromSession[idx - 1] : null;
    const next = idx < moreFromSession.length - 1 ? moreFromSession[idx + 1] : null;

    return {
      prevSrc: prev?.url || "",
      nextSrc: next?.url || "",
      canPrev: Boolean(prev?.url),
      canNext: Boolean(next?.url),
    };
  }, [media?.id, moreFromSession]);

  // Preload + decode neighbors (reduces hitch)
  useEffect(() => {
    const list = [neighbors.prevSrc, neighbors.nextSrc].filter(Boolean);
    if (!list.length) return;

    list.forEach((src) => {
      const img = new Image();
      img.decoding = "async";
      img.src = src;
      if (typeof img.decode === "function") {
        img.decode().catch(() => {});
      }
    });
  }, [neighbors.prevSrc, neighbors.nextSrc]);

  // Reset UI when switching media
  useEffect(() => {
    setIsAddPinMode(false);
    setIsFocusMode(false);
    setSelectedPinId(null);
  }, [media?.id]);

  const swipe = useSwipeNav({
    enabled: true,
    isBlocked: isAddPinMode,
    stageRef,
    carouselRef,
    canPrev: neighbors.canPrev,
    canNext: neighbors.canNext,
    onPrev: () => onPrev?.(),
    onNext: () => onNext?.(),
    onSwipeDown,
    mediaKey: media?.id, // IMPORTANT: prevents “refresh” snap
    gapPx: GAP_PX,
  });

  const drag = usePinDrag({
    projectId: project?.id,
    mediaId: media?.id,
    sessionId: media?.sessionId,
    hotspots: currentHotspots,
    stageRef,
    trashRef,
    isFocusMode,
    isAddPinMode,
    onUpdateHotspot,
    onDeleteHotspot,
    selectedPinId,
    setSelectedPinId,
  });

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

  const Outer = ({ children }) => {
    if (isEmbedded) return <div className="w-full">{children}</div>;
    return <div className="fixed inset-0 z-[100] bg-white">{children}</div>;
  };

  return (
    <Outer>
      {/* IMPORTANT: modal viewer should NOT be scrollable; let inner panels scroll */}
      <div className={isEmbedded ? "w-full" : "h-full w-full overflow-hidden"}>
        <MediaStage
          isEmbedded={isEmbedded}
          stageRef={stageRef}
          carouselRef={carouselRef}
          trashRef={trashRef}
          media={media}
          prevSrc={neighbors.prevSrc}
          nextSrc={neighbors.nextSrc}
          palette={palette}
          isAddPinMode={isAddPinMode}
          isFocusMode={isFocusMode}
          selectedPin={drag.selectedPin}
          hotspots={currentHotspots}
          draggingPinId={drag.draggingPinId}
          isHoveringTrash={drag.isHoveringTrash}
          getDisplayXY={drag.getDisplayXY}
          onPinPointerDown={drag.onPinPointerDown}
          onClickToAddPin={handleStageClickToAddPin}
          onDeleteMedia={onDeleteMedia}
          gapPx={GAP_PX}
          onBack={() => {
            setIsAddPinMode(false);
            setIsFocusMode(false);
            setSelectedPinId(null);
            onBack?.();
          }}
          onStagePointerDown={(e) => swipe.onPointerDown(e)}
          onStagePointerMove={(e) => {
            drag.onStagePointerMove?.(e);
            if (!drag.draggingPinId) swipe.onPointerMove(e);
          }}
          onStagePointerUp={(e) => {
            drag.onStagePointerUp?.(e);
            if (!drag.draggingPinId) swipe.onPointerEnd(e);
          }}
          onStagePointerCancel={(e) => {
            drag.onStagePointerUp?.(e);
            if (!drag.draggingPinId) swipe.onPointerEnd(e);
          }}
        />

        {!isFocusMode && (
          <PinNotesPanel
            headerFont={headerFont}
            palette={palette}
            hotspots={currentHotspots}
            selectedPin={drag.selectedPin}
            setSelectedPinId={setSelectedPinId}
            isAddPinMode={isAddPinMode}
            toggleAddPinMode={() => setIsAddPinMode((v) => !v)}
            openPinEditor={openPinEditor}
            media={media}
            moreFromSession={moreFromSession}
            onSelectMedia={(m) => onSelectMedia?.(m)}
          />
        )}
      </div>

      {pinOpen && (
        <PinEditorModal
          open={pinOpen}
          initial={pinDraft}
          headerFont={headerFont}
          palette={palette}
          onClose={() => setPinOpen(false)}
          onSave={savePinEdits}
          onDelete={deletePin}
        />
      )}
    </Outer>
  );
}
