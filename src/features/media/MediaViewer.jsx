import React, { useEffect, useMemo, useRef, useState } from "react";

import MediaStage from "./components/MediaStage";
import PinNotesPanel from "./components/PinNotesPanel";

// ✅ this one is NOT in features/media — it's in /src/components (per your screenshot)
import PinEditorModal from "../../components/PinEditorModal";

import useSwipeNav from "./hooks/useSwipeNav";

function clamp01(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

export default function MediaViewer({
  mode = "modal", // "modal" | "embedded"
  project,
  media,
  headerFont,
  palette,

  mediaIndex = 0,
  mediaCount = 0,
  moreFromSession = [],
  onSelectMedia,

  onPrev,
  onNext,
  onSwipeDown,
  onBack,
  onDeleteMedia,

  // annotations (hotspots)
  onAddHotspot,
  onUpdateHotspot,
  onDeleteHotspot,

  // Option 2: general photo notes
  onUpdateMediaNote,
}) {
  const isEmbedded = mode === "embedded";
  const GAP_PX = 16;

  const stageRef = useRef(null);
  const carouselRef = useRef(null);
  const trashRef = useRef(null);

  // Pin editor modal
  const [pinOpen, setPinOpen] = useState(false);
  const [pinDraft, setPinDraft] = useState(null);

  // Modes
  const [isAddPinMode, setIsAddPinMode] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Selected pin + drag
  const [selectedPinId, setSelectedPinId] = useState(null);
  const [drag, setDrag] = useState({
    draggingPinId: null,
    draggingPin: null,
    selectedPin: null,
    isHoveringTrash: false,
  });

  // Helpers
  const currentHotspots = useMemo(() => {
    return Array.isArray(media?.hotspots) ? media.hotspots : [];
  }, [media?.hotspots]);

  const selectedPin = useMemo(() => {
    if (!selectedPinId) return null;
    return currentHotspots.find((h) => h.id === selectedPinId) || null;
  }, [selectedPinId, currentHotspots]);

  useEffect(() => {
    // Keep selection in sync when media changes
    setSelectedPinId(null);
    setIsAddPinMode(false);
    setIsFocusMode(false);
    setDrag({ draggingPinId: null, draggingPin: null, selectedPin: null, isHoveringTrash: false });
  }, [media?.id]);

  // Prev/next image sources for “gap” carousel
  const prevSrc = useMemo(() => {
    if (!onPrev) return "";
    // we don’t have direct prev item object here — parent supplies onPrev/onNext; stage only needs srcs
    // leaving empty means Stage will show blank on sides; still swipes cleanly.
    return "";
  }, [onPrev]);

  const nextSrc = useMemo(() => {
    if (!onNext) return "";
    return "";
  }, [onNext]);

  // Swipe navigator
  const swipe = useSwipeNav({
    enabled: true,
    carouselRef,
    stageRef,
    onPrev,
    onNext,
    onSwipeDown,
    isBlocked: !!drag.draggingPinId,
    canPrev: mediaIndex > 0,
    canNext: mediaIndex < mediaCount - 1,
    gapPx: GAP_PX,
  });

  // Display XY for a hotspot (supports percent coords)
  const getDisplayXY = (h) => {
    const x = clamp01(h?.x);
    const y = clamp01(h?.y);
    return { x, y };
  };

  // Pin drag handling
  const onPinPointerDown = (e, pin) => {
    if (!pin?.id) return;
    if (isAddPinMode) return;

    e.preventDefault();
    e.stopPropagation();

    try {
      e.currentTarget?.setPointerCapture?.(e.pointerId);
    } catch {}

    setSelectedPinId(pin.id);
    setDrag((d) => ({
      ...d,
      draggingPinId: pin.id,
      draggingPin: { ...pin },
      selectedPin: pin,
      isHoveringTrash: false,
    }));
  };

  const onStagePointerDown = (e) => {
    swipe.onPointerDown(e);
  };

  const onStagePointerMove = (e) => {
    if (drag.draggingPinId && drag.draggingPin) {
      // Dragging a pin
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      const next = {
        ...drag.draggingPin,
        x: clamp01(x),
        y: clamp01(y),
      };

      // Trash hover
      const trashRect = trashRef.current?.getBoundingClientRect();
      const hoveringTrash =
        trashRect &&
        e.clientX >= trashRect.left &&
        e.clientX <= trashRect.right &&
        e.clientY >= trashRect.top &&
        e.clientY <= trashRect.bottom;

      setDrag((d) => ({
        ...d,
        draggingPin: next,
        isHoveringTrash: !!hoveringTrash,
      }));

      return;
    }

    swipe.onPointerMove(e);
  };

  const onStagePointerUp = async (e) => {
    if (drag.draggingPinId && drag.draggingPin) {
      // Drop pin
      const shouldDelete = drag.isHoveringTrash;

      const pinId = drag.draggingPinId;
      const nextPin = drag.draggingPin;

      setDrag({ draggingPinId: null, draggingPin: null, selectedPin: selectedPin, isHoveringTrash: false });

      try {
        if (shouldDelete) {
          await onDeleteHotspot?.(project?.id, media?.sessionId, media?.id, pinId);
          setSelectedPinId(null);
        } else {
          await onUpdateHotspot?.(project?.id, media?.sessionId, media?.id, pinId, {
            x: nextPin.x,
            y: nextPin.y,
          });
        }
      } catch (err) {
        console.error("Pin drop failed", err);
      }

      return;
    }

    swipe.onPointerEnd(e);
  };

  const onStagePointerCancel = (e) => {
    swipe.onPointerEnd(e);
  };

  const onClickToAddPin = async (e) => {
    if (!isAddPinMode || isFocusMode) return;
    if (!stageRef.current) return;

    const rect = stageRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    try {
      await onAddHotspot?.(project?.id, media?.sessionId, media?.id, { x: clamp01(x), y: clamp01(y) });
      setIsAddPinMode(false);
    } catch (err) {
      console.error("Failed to add hotspot", err);
    }
  };

  const openPinEditor = (pin) => {
    if (!pin) return;
    setPinDraft(pin);
    setPinOpen(true);
  };

  const closePinEditor = () => {
    setPinOpen(false);
    setPinDraft(null);
  };

  const savePinEditor = async (nextText) => {
    if (!pinDraft?.id) return closePinEditor();
    try {
      await onUpdateHotspot?.(project?.id, media?.sessionId, media?.id, pinDraft.id, { note: nextText });
    } catch (err) {
      console.error("Failed to update pin note", err);
    } finally {
      closePinEditor();
    }
  };

  const Outer = ({ children }) => {
    if (isEmbedded) return <div className="w-full relative">{children}</div>;
    // True white (bright media makes any gray feel dirty)
    return (
      <div className="fixed inset-0 z-[100]" style={{ background: "#FFFFFF", overscrollBehavior: "contain" }}>
        {children}
      </div>
    );
  };

  return (
    <Outer>
      {/* 
        UX fix: stage + notes scroll together like a normal page.
        Swipe smoothness is handled by touch-action + preventing default only
        when we’ve committed to a horizontal swipe.
      */}
      <div className={isEmbedded ? "w-full h-full relative" : "h-full w-full overflow-y-auto"}>
        <MediaStage
          isEmbedded={isEmbedded}
          stageRef={stageRef}
          carouselRef={carouselRef}
          trashRef={trashRef}
          media={media}
          prevSrc={prevSrc}
          nextSrc={nextSrc}
          onBack={onBack}
          onDeleteMedia={onDeleteMedia}
          isAddPinMode={isAddPinMode}
          isFocusMode={isFocusMode}
          onStagePointerDown={onStagePointerDown}
          onStagePointerMove={onStagePointerMove}
          onStagePointerUp={onStagePointerUp}
          onStagePointerCancel={onStagePointerCancel}
          onClickToAddPin={onClickToAddPin}
          hotspots={currentHotspots}
          selectedPin={selectedPin}
          palette={palette}
          draggingPinId={drag.draggingPinId}
          isHoveringTrash={drag.isHoveringTrash}
          getDisplayXY={drag.draggingPinId ? () => getDisplayXY(drag.draggingPin) : getDisplayXY}
          onPinPointerDown={onPinPointerDown}
          gapPx={GAP_PX}
        />

        {!isFocusMode && (
          <div style={{ background: "#FFFFFF" }}>
            <PinNotesPanel
              headerFont={headerFont}
              palette={palette}
              projectId={project?.id}
              hotspots={currentHotspots}
              selectedPin={drag.selectedPin}
              setSelectedPinId={setSelectedPinId}
              isAddPinMode={isAddPinMode}
              toggleAddPinMode={() => setIsAddPinMode((v) => !v)}
              openPinEditor={openPinEditor}
              onUpdateMediaNote={onUpdateMediaNote}
              media={media}
              moreFromSession={moreFromSession}
              onSelectMedia={(m) => onSelectMedia?.(m)}
            />
          </div>
        )}

        {/* Pin editor modal */}
        {pinOpen && (
          <PinEditorModal
            open={pinOpen}
            palette={palette}
            headerFont={headerFont}
            initialText={pinDraft?.note || ""}
            onClose={closePinEditor}
            onSave={savePinEditor}
          />
        )}
      </div>
    </Outer>
  );
}