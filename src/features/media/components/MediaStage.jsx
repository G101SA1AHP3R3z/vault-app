import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Trash2 } from "lucide-react";

function clamp01(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

export default function MediaStage({
  // layout
  isEmbedded,
  headerHeightMax = "72vh",

  // refs
  stageRef,
  trashRef,

  // media
  media,
  prevSrc = "",
  nextSrc = "",

  // interactive carousel state
  dragX = 0,
  isDragging = false,

  // chrome actions
  onBack,
  onDeleteMedia,

  // modes
  isAddPinMode,
  isFocusMode,

  // swipe / drag handlers
  onStagePointerDown,
  onStagePointerMove,
  onStagePointerUp, // should end gesture once
  onStagePointerCancel,

  onTouchStart,
  onTouchMove,
  onTouchEnd,

  // add pin
  onClickToAddPin,

  // pins
  hotspots = [],
  selectedPin,
  palette,
  draggingPinId,
  isHoveringTrash,
  getDisplayXY,
  onPinPointerDown,
}) {
  const currentSrc = media?.url || "";

  const [stageWidth, setStageWidth] = useState(0);

  useEffect(() => {
    const el = stageRef?.current;
    if (!el) return;

    const update = () => setStageWidth(el.clientWidth || 0);
    update();

    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => update());
      ro.observe(el);
    } else {
      window.addEventListener("resize", update);
    }

    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", update);
    };
  }, [stageRef]);

  const stageHeight = useMemo(
    () => (isEmbedded ? "62vh" : headerHeightMax),
    [isEmbedded, headerHeightMax]
  );

  const w = stageWidth || 1;
  const progress = Math.min(1, Math.abs(dragX) / w);
  const transition = isDragging
    ? "none"
    : "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)";

  const prevX = -w + dragX;
  const curX = dragX;
  const nextX = w + dragX;

  const showPrev = Boolean(prevSrc);
  const showNext = Boolean(nextSrc);

  return (
    <div className={isEmbedded ? "w-full" : "w-full"}>
      <div
        ref={stageRef}
        className={`relative w-full overflow-hidden ${
          isAddPinMode && !isFocusMode ? "cursor-crosshair" : ""
        }`}
        style={{ touchAction: "pan-y", height: stageHeight }}
        onClick={onClickToAddPin}
        onPointerDown={onStagePointerDown}
        onPointerMove={onStagePointerMove}
        onPointerUp={onStagePointerUp}
        onPointerCancel={onStagePointerCancel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Back */}
        {!isEmbedded && (
          <button
            onClick={onBack}
            className="absolute top-4 left-4 z-50 w-10 h-10 rounded-full bg-white/90 border border-black/10 grid place-items-center shadow-sm"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5 text-black/80" />
          </button>
        )}

        {/* Delete media */}
        {!isEmbedded && typeof onDeleteMedia === "function" && (
          <button
            onClick={onDeleteMedia}
            className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/90 border border-black/10 grid place-items-center shadow-sm"
            aria-label="Delete"
            title="Delete"
          >
            <Trash2 className="w-5 h-5 text-red-600" />
          </button>
        )}

        {/* Interactive carousel panels */}
        <div className="absolute inset-0" style={{ pointerEvents: "none" }}>
          {/* Prev */}
          <div
            className="absolute inset-0"
            style={{
              transform: `translate3d(${prevX}px,0,0)`,
              transition,
              willChange: "transform",
              opacity: showPrev ? 1 : 0,
            }}
          >
            {showPrev ? (
              <img
                src={prevSrc}
                decoding="async"
                loading="eager"
                className="w-full h-full object-cover"
                alt=""
                draggable={false}
              />
            ) : null}
          </div>

          {/* Current */}
          <div
            className="absolute inset-0"
            style={{
              transform: `translate3d(${curX}px,0,0)`,
              transition,
              willChange: "transform",
              filter: progress > 0.02 ? `brightness(${1 - 0.04 * progress})` : "none",
            }}
          >
            {currentSrc ? (
              <img
                src={currentSrc}
                decoding="async"
                loading="eager"
                className={`w-full h-full object-cover ${
                  isAddPinMode ? "opacity-90" : "opacity-100"
                }`}
                alt=""
                draggable={false}
              />
            ) : null}
          </div>

          {/* Next */}
          <div
            className="absolute inset-0"
            style={{
              transform: `translate3d(${nextX}px,0,0)`,
              transition,
              willChange: "transform",
              opacity: showNext ? 1 : 0,
            }}
          >
            {showNext ? (
              <img
                src={nextSrc}
                decoding="async"
                loading="eager"
                className="w-full h-full object-cover"
                alt=""
                draggable={false}
              />
            ) : null}
          </div>
        </div>

        {/* Pins */}
        {!isFocusMode &&
          hotspots.map((h, idx) => {
            const { x, y } = getDisplayXY
              ? getDisplayXY(h)
              : { x: clamp01(h.x), y: clamp01(h.y) };
            const left = `${x * 100}%`;
            const top = `${y * 100}%`;
            const number = idx + 1;
            const isSelected = (selectedPin?.id || null) === h.id;

            return (
              <button
                key={h.id}
                type="button"
                onPointerDown={(e) => onPinPointerDown?.(e, h)}
                className={`absolute -translate-x-1/2 -translate-y-1/2 select-none touch-none
                  transition-transform duration-150 ease-out
                  ${
                    isAddPinMode
                      ? "pointer-events-none opacity-25 scale-90"
                      : "pointer-events-auto"
                  }
                  ${draggingPinId === h.id ? "scale-[1.10] z-50" : "z-10 hover:scale-[1.03]"}
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
                  className="w-9 h-9 rounded-full text-xs font-semibold flex items-center justify-center shadow-[0_12px_30px_-18px_rgba(0,0,0,0.35)]"
                  style={{
                    pointerEvents: "none",
                    background: "rgba(255,255,255,0.95)",
                    color: "rgba(0,0,0,0.75)",
                    border: isSelected
                      ? `2px solid ${palette?.sun || "#FFEA3A"}`
                      : `1px solid ${palette?.pinEdge || "rgba(0,0,0,0.12)"}`,
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
                background: isHoveringTrash
                  ? "rgba(220,38,38,0.95)"
                  : "rgba(0,0,0,0.55)",
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
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none z-50">
            <div
              className="text-[11px] font-medium px-3 py-2 rounded-full"
              style={{
                background: "rgba(255,255,255,0.92)",
                border: "1px solid rgba(0,0,0,0.10)",
                color: "rgba(0,0,0,0.70)",
              }}
            >
              Tap the photo to place a pin
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
