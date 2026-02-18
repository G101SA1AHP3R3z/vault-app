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
  media, // expects { id, url, sessionId, hotspots: [] }
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

  // Pin CRUD
  onAddHotspot,
  onUpdateHotspot,
  onDeleteHotspot,
}) {
  const isEmbedded = mode === "embedded";

  // Modes
  const [isAddPinMode, setIsAddPinMode] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false); // kept for compatibility
  const [selectedPinId, setSelectedPinId] = useState(null);

  // Pin editor modal
  const [pinOpen, setPinOpen] = useState(false);
  const [pinDraft, setPinDraft] = useState({ label: "", note: "" });
  const [pinTarget, setPinTarget] = useState(null);

  const stageRef = useRef(null);
  const trashRef = useRef(null);

  const currentHotspots = Array.isArray(media?.hotspots) ? media.hotspots : [];

  // Reset on media change
  useEffect(() => {
    setIsAddPinMode(false);
    setIsFocusMode(false);
    setSelectedPinId(null);
  }, [media?.id]);

  const swipe = useSwipeNav({
    enabled: true,
    isBlocked: isAddPinMode, // match your old behavior
    onPrev,
    onNext,
    onSwipeDown,
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
      <div className={isEmbedded ? "w-full" : "h-full w-full overflow-y-auto"}>
        <MediaStage
          isEmbedded={isEmbedded}
          stageRef={stageRef}
          trashRef={trashRef}
          media={media}
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
          onBack={() => {
            setIsAddPinMode(false);
            setIsFocusMode(false);
            setSelectedPinId(null);
            onBack?.();
          }}
          // swipe + drag
          onStagePointerDown={swipe.onPointerDown}
          onStagePointerEnd={swipe.onPointerEnd}
          onStagePointerMove={drag.onStagePointerMove}
          onStagePointerUp={drag.onStagePointerUp}
          onTouchStart={swipe.onTouchStart}
          onTouchEnd={swipe.onTouchEnd}
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
          onSave={async (draft) => {
            await savePinEdits(draft);
          }}
          onDelete={async () => {
            await deletePin();
          }}
        />
      )}
    </Outer>
  );
}
