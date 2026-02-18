import React from "react";
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

  // chrome actions
  onBack,
  onDeleteMedia,

  // modes
  isAddPinMode,
  isFocusMode,

  // swipe / drag handlers
  onStagePointerDown,
  onStagePointerMove,
  onStagePointerUp, // should already call swipe end if you want
  onStagePointerEnd, // optional if you want to call separately

  onTouchStart,
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
  return (
    <div className={isEmbedded ? "w-full" : "w-full"}>
      <div
        ref={stageRef}
        className={`relative w-full ${isAddPinMode && !isFocusMode ? "cursor-crosshair" : ""}`}
        style={{ touchAction: "pan-y" }}
        onClick={onClickToAddPin}
        onPointerDown={onStagePointerDown}
        onPointerMove={onStagePointerMove}
        onPointerUp={(e) => {
          onStagePointerUp?.(e);
          onStagePointerEnd?.(e);
        }}
        onPointerLeave={(e) => {
          onStagePointerUp?.(e);
          onStagePointerEnd?.(e);
        }}
        onTouchStart={onTouchStart}
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

        <img
          src={media?.url}
          decoding="async"
          loading="lazy"
          className={`w-full object-cover transition-opacity duration-200 ease-out ${
            isAddPinMode ? "opacity-90" : "opacity-100"
          }`}
          style={{
            pointerEvents: "none",
            maxHeight: isEmbedded ? "62vh" : headerHeightMax,
          }}
          alt=""
          draggable={false}
        />

        {/* Pins */}
        {!isFocusMode &&
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
                onPointerDown={(e) => onPinPointerDown?.(e, h)}
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
