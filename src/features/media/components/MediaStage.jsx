import React from "react";

const EASE_IOS = "cubic-bezier(.16,1,.3,1)";
const INFO_DUR = 420; // a little longer feels floaty

export default function MediaStage({
  isEmbedded,

  stageRef,

  media,

  // NEW
  fit = "contain",     // "contain" | "cover"
  imgZoom = 1.0,       // 1.0 -> 1.06
  clipBottom = "0px",  // e.g. "0px" or "50vh" (how much to hide from bottom)

  isAddPinMode,
  isFocusMode,

  showPins = true,
  onClickToAddPin,

  hotspots = [],
  selectedPin,
  palette,
  getDisplayXY,
  onPinPointerDown,
}) {
  const currentSrc = media?.url || "";

  return (
    <div className="w-full h-full relative">
      {/* Stage ALWAYS full height of its parent, no layout animation */}
      <div
        ref={stageRef}
        className={`relative w-full h-full ${isAddPinMode && !isFocusMode ? "cursor-crosshair" : ""}`}
        style={{
          touchAction: "pan-y",
          background: "transparent",
          overflow: "hidden",
          borderRadius: 0,
          WebkitTapHighlightColor: "transparent",
        }}
        onClick={onClickToAddPin}
      >
        {/* Image wrapper: clip-path animates (this is the floaty part) */}
        <div
          className="absolute inset-0"
          style={{
            borderRadius: 0,
            // Hide bottom portion smoothly when info opens
            clipPath: `inset(0px 0px ${clipBottom} 0px)`,
            transition: `clip-path ${INFO_DUR}ms ${EASE_IOS}`,
            willChange: "clip-path",
          }}
        >
          {currentSrc && (
            <img
              src={currentSrc}
              decoding="async"
              loading="eager"
              alt=""
              draggable={false}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: fit,
                borderRadius: 0,

                transform: `scale(${imgZoom})`,
                transformOrigin: "center center",
                transition: `transform ${INFO_DUR}ms ${EASE_IOS}`,
                willChange: "transform",
              }}
            />
          )}

          {/* Pins */}
          {showPins &&
            !isFocusMode &&
            hotspots.map((h, idx) => {
              const { x, y } = getDisplayXY ? getDisplayXY(h) : { x: h.x, y: h.y };
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
                  className={`absolute -translate-x-1/2 -translate-y-1/2 select-none touch-none transition-transform duration-150 ease-out ${
                    isAddPinMode ? "pointer-events-none opacity-25 scale-90" : "pointer-events-auto"
                  } ${isSelected ? "z-50" : "z-10"}`}
                  style={{ left, top, userSelect: "none" }}
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
        </div>
      </div>
    </div>
  );
}