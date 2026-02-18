import { useEffect, useMemo, useRef, useState } from "react";

function clamp01(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

/**
 * Long-press drag pins + drop on trash to delete.
 * Also handles optimistic movement.
 */
export default function usePinDrag({
  projectId,
  mediaId,
  sessionId,
  hotspots = [],
  stageRef,
  trashRef,

  // flags
  isFocusMode = false,
  isAddPinMode = false,

  // callbacks
  onUpdateHotspot,
  onDeleteHotspot,

  // selection
  selectedPinId,
  setSelectedPinId,
}) {
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

  const selectedPin = useMemo(() => {
    if (!hotspots.length) return null;
    const found = selectedPinId ? hotspots.find((h) => h.id === selectedPinId) : null;
    return found || hotspots[0] || null;
  }, [hotspots, selectedPinId]);

  // Reset when media changes
  useEffect(() => {
    dragRef.current.dragging = false;
    dragRef.current.hotspotId = null;
    if (dragRef.current.timer) {
      clearTimeout(dragRef.current.timer);
      dragRef.current.timer = null;
    }
    setDraggingPinId(null);
    setOptimisticPin(null);
    setIsHoveringTrash(false);
  }, [mediaId]);

  const onPinPointerDown = (e, hotspot) => {
    if (isFocusMode) return;
    if (isAddPinMode) return;

    // Tap selects (no editor)
    setSelectedPinId?.(hotspot.id);

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

    if (!stageRef?.current) return;

    const rect = stageRef.current.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    if (clientX == null || clientY == null) return;

    const x = clamp01((clientX - rect.left) / rect.width);
    const y = clamp01((clientY - rect.top) / rect.height);
    setOptimisticPin({ id: dragRef.current.hotspotId, x, y });

    if (trashRef?.current) {
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
    if (wasDragging && trashRef?.current && clientX != null && clientY != null) {
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
    if (!projectId || !mediaId) return;

    if (droppedInTrash) {
      try {
        await onDeleteHotspot?.(projectId, sessionId, mediaId, hotspotId);
      } catch (err) {
        console.error("Failed to delete pin:", err);
      }
      return;
    }

    if (pinDataToSave) {
      try {
        await onUpdateHotspot?.(projectId, sessionId, mediaId, hotspotId, {
          x: pinDataToSave.x,
          y: pinDataToSave.y,
        });
      } catch (err) {
        console.error("Failed to move pin:", err);
      }
    }
  };

  const getDisplayXY = (hotspot) => {
    const displayX = optimisticPin?.id === hotspot.id ? optimisticPin.x : hotspot.x;
    const displayY = optimisticPin?.id === hotspot.id ? optimisticPin.y : hotspot.y;
    return { x: clamp01(displayX), y: clamp01(displayY) };
  };

  return {
    // state
    selectedPin,
    draggingPinId,
    optimisticPin,
    isHoveringTrash,

    // helpers
    getDisplayXY,

    // handlers
    onPinPointerDown,
    onStagePointerMove,
    onStagePointerUp,
  };
}
