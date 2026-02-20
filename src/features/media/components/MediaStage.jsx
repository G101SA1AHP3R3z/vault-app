import React, { useMemo } from "react";

function clamp01(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

export default function MediaStage({
  isEmbedded,
  // height of the stage container
  stageHeight = null,

  stageRef,
  trashRef,

  media,

  isAddPinMode,
  isFocusMode,

  // view-only mode: no pins, no add pin
  showPins = true,

  onStagePointerDown,
  onStagePointerMove,
  onStagePointerUp,
  onStagePointerCancel,

  onClickToAddPin,

  hotspots = [],
  selectedPin,
  palette,
  draggingPinId,
  isHoveringTrash,
  getDisplayXY,
  onPinPointerDown,

  gapPx = 16,
}) {
  const currentSrc = media?.url || "";

  const resolvedHeight = useMemo(() => {
    if (stageHeight) return stageHeight;
    return isEmbedded ? "62vh" : "72vh";
  }, [isEmbedded, stageHeight]);

  return (
    <div className={isEmbedded ? "w-full relative" : "w-full relative"}>
      {/* STAGE */}
      <div
        ref={stageRef}
        className={`relative w-full overflow-hidden ${isAddPinMode && !isFocusMode ? "cursor-crosshair" : ""}`}
        // We intentionally avoid horizontal swipe here (it caused jank).
        style={{ touchAction: "pan-y", height: resolvedHeight, background: "transparent" }}
        onClick={onClickToAddPin}
        onPointerDown={onStagePointerDown}
        onPointerMove={onStagePointerMove}
        onPointerUp={onStagePointerUp}
        onPointerCancel={onStagePointerCancel}
      >
        {/* Photo */}
        {currentSrc && (
          <img
            src={currentSrc}
            decoding="async"
            loading="eager"
            className={`absolute inset-0 w-full h-full object-contain ${isAddPinMode ? "opacity-90" : "opacity-100"}`}
            alt=""
            draggable={false}
          />
        )}

        {/* Pins (only when enabled) */}
        {showPins &&
          !isFocusMode &&
          hotspots.map((h, idx) => {
            const { x, y } = getDisplayXY ? getDisplayXY(h) : { x: clamp01(h.x), y: clamp01(h.y) };
            const left = `${x * 100}%`;
            const top = `${y * 100}%`;
            const number = idx + 1;
            const isSelected = (selectedPin?.id || null) === h.id;

            return (
              <button
                key={h.id}
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onPinPointerDown?.(e, h);
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 select-none touch-none
                  transition-transform duration-150 ease-out
                  ${isAddPinMode ? "pointer-events-none opacity-25 scale-90" : "pointer-events-auto"}
                  ${draggingPinId === h.id ? "scale-[1.10] z-50" : "z-10 hover:scale-[1.03]"}
                `}
                style={{
                  left,
                  top,
                  WebkitTouchCallout: "none",
                  WebkitUserSelect: "none",
                  userSelect: "none",
                }}
                aria-label="Annotation"
              >
                <div
                  className="w-9 h-9 rounded-full text-xs font-semibold flex items-center justify-center shadow-[0_12px_30px_-18px_rgba(0,0,0,0.35)]"
                  style={{
                    pointerEvents: "none",
                    background: "rgba(255,255,255,0.95)",
                    color: "rgba(0,0,0,0.75)",
                    border: isSelected
                      ? `2px solid ${palette?.accent || "rgba(255,77,46,0.95)"}`
                      : `1px solid ${palette?.pinEdge || "rgba(0,0,0,0.12)"}`,
                  }}
                >
                  {number}
                </div>
              </button>
            );
          })}

        {/* Trash drop zone (kept in case you re-enable pin drag later) */}
        {!isFocusMode && (
          <div
            ref={trashRef}
            className={`absolute bottom-6 left-1/2 -translate-x-1/2 transition-all duration-200 ease-out z-50 ${
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
              <div className="w-6 h-6" style={{ borderRadius: 6, background: "rgba(255,255,255,0.65)" }} />
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
              Tap the photo to place an annotation
            </div>
          </div>
        )}
      </div>
    </div>
  );
}