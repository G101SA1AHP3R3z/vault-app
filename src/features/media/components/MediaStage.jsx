import React, { useMemo } from "react";
import { ChevronLeft, Trash2 } from "lucide-react";

function clamp01(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

export default function MediaStage({
  isEmbedded,
  headerHeightMax = "72vh",

  stageRef,
  carouselRef,
  trashRef,

  media,
  prevSrc = "",
  nextSrc = "",

  onBack,
  onDeleteMedia,

  isAddPinMode,
  isFocusMode,

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

  const stageHeight = useMemo(
    () => (isEmbedded ? "62vh" : headerHeightMax),
    [isEmbedded, headerHeightMax]
  );

  const showPrev = Boolean(prevSrc);
  const showNext = Boolean(nextSrc);

  return (
    <div className={isEmbedded ? "w-full relative" : "w-full relative"}>
      
      {/* CHROME UI / BUTTONS 
        These are now physically placed OUTSIDE the `stageRef` div below.
        This completely prevents the swipe pointer-capture from swallowing your clicks. 
      */}
      <div className="absolute inset-0 pointer-events-none z-[60]">
        {!isEmbedded && (
          <button
            onClick={onBack}
            onPointerDown={(e) => e.stopPropagation()}
            className="pointer-events-auto absolute top-4 left-4 w-10 h-10 rounded-full bg-white/90 border border-black/10 grid place-items-center shadow-sm hover:scale-105 active:scale-95 transition-transform"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5 text-black/80" />
          </button>
        )}

        {!isEmbedded && typeof onDeleteMedia === "function" && (
          <button
            onClick={onDeleteMedia}
            onPointerDown={(e) => e.stopPropagation()}
            className="pointer-events-auto absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 border border-black/10 grid place-items-center shadow-sm hover:scale-105 active:scale-95 transition-transform"
            aria-label="Delete"
            title="Delete"
          >
            <Trash2 className="w-5 h-5 text-red-600" />
          </button>
        )}
      </div>

      {/* SWIPE STAGE */}
      <div
        ref={stageRef}
        className={`relative w-full overflow-hidden bg-black/5 ${
          isAddPinMode && !isFocusMode ? "cursor-crosshair" : ""
        }`}
        style={{ touchAction: "pan-y", height: stageHeight }}
        onClick={onClickToAddPin}
        onPointerDown={onStagePointerDown}
        onPointerMove={onStagePointerMove}
        onPointerUp={onStagePointerUp}
        onPointerCancel={onStagePointerCancel}
      >
        {/* NATIVE CAROUSEL WRAPPER */}
        <div
          ref={carouselRef}
          className="absolute inset-0 w-full h-full"
          style={{ willChange: "transform" }}
        >
          {/* Prev Photo */}
          <div 
            className="absolute inset-0 w-full h-full" 
            style={{ left: `calc(-100% - ${gapPx}px)` }}
          >
            {showPrev && (
              <img
                src={prevSrc}
                decoding="async"
                loading="lazy"
                className="w-full h-full object-cover"
                alt=""
                draggable={false}
              />
            )}
          </div>

          {/* Current Photo & Pins */}
          <div className="absolute inset-0 w-full h-full" style={{ left: "0%" }}>
            {currentSrc && (
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
            )}

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
                    onPointerDown={(e) => {
                      e.stopPropagation(); // Stop swipe from triggering if grabbing a pin
                      onPinPointerDown?.(e, h);
                    }}
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
          </div>

          {/* Next Photo */}
          <div 
            className="absolute inset-0 w-full h-full" 
            style={{ left: `calc(100% + ${gapPx}px)` }}
          >
            {showNext && (
              <img
                src={nextSrc}
                decoding="async"
                loading="lazy"
                className="w-full h-full object-cover"
                alt=""
                draggable={false}
              />
            )}
          </div>
        </div>

        {/* Trash drop zone */}
        {!isFocusMode && (
          <div
            ref={trashRef}
            className={`absolute bottom-6 left-1/2 -translate-x-1/2 transition-all duration-200 ease-out z-50 ${
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