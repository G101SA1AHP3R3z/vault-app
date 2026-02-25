import React, { useMemo } from "react";

const EASE_IOS = "cubic-bezier(.16,1,.3,1)";
const INFO_DUR = 420;

function clamp01(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function inferIsVideo(media) {
  const t = (media?.type || media?.mime || "").toString().toLowerCase();
  const url = (media?.url || "").toString().toLowerCase();
  if (t.includes("video")) return true;
  return url.endsWith(".mp4") || url.endsWith(".mov") || url.endsWith(".webm") || url.includes("video");
}

export default function MediaStage({
  isEmbedded,
  stageRef,
  media,

  // viewer-driven
  fit = "contain", // "contain" | "cover"
  imgZoom = 1.0, // 1.0 -> 1.06
  clipBottom = "0px",

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
  const src = media?.url || "";
  const isVideo = useMemo(() => inferIsVideo(media), [media]);

  const pinEdge = palette?.pinEdge || "rgba(0,0,0,0.12)";
  const selectedEdge = "rgba(0,0,0,0.78)";

  return (
    <div className="w-full h-full relative">
      <div
        ref={stageRef}
        className={`relative w-full h-full ${isAddPinMode && !isFocusMode ? "cursor-crosshair" : ""}`}
        style={{
          touchAction: "none",
          background: "transparent",
          overflow: "hidden",
          borderRadius: 0,
          WebkitTapHighlightColor: "transparent",
        }}
        onClick={onClickToAddPin}
      >
        {/* Image/Video wrapper that can clip when notes sheet is open */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: `inset(0px 0px ${clipBottom} 0px)`,
            transition: `clip-path ${INFO_DUR}ms ${EASE_IOS}`,
            willChange: "clip-path",
          }}
        >
          {/* Media */}
          {src ? (
            isVideo ? (
              <video
                src={src}
                className="absolute inset-0"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: fit,
                  transform: `scale(${imgZoom})`,
                  transformOrigin: "center center",
                  transition: `transform ${INFO_DUR}ms ${EASE_IOS}`,
                  willChange: "transform",
                  display: "block",
                }}
                controls={false}
                muted
                playsInline
                autoPlay={false}
              />
            ) : (
              <img
                src={src}
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
                  transform: `scale(${imgZoom})`,
                  transformOrigin: "center center",
                  transition: `transform ${INFO_DUR}ms ${EASE_IOS}`,
                  willChange: "transform",
                  display: "block",
                }}
              />
            )
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: "rgba(0,0,0,0.06)",
              }}
            />
          )}

          {/* Pins (optional) */}
          {showPins &&
            !isFocusMode &&
            Array.isArray(hotspots) &&
            hotspots.map((h, idx) => {
              const raw = getDisplayXY ? getDisplayXY(h) : { x: h?.x, y: h?.y };
              const x = clamp01(raw?.x);
              const y = clamp01(raw?.y);
              const left = `${x * 100}%`;
              const top = `${y * 100}%`;
              const number = idx + 1;
              const isSelected = (selectedPin?.id || null) === h?.id;

              return (
                <button
                  key={h?.id || `${idx}`}
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onPinPointerDown?.(e, h);
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 select-none touch-none transition-transform duration-150 ease-out ${
                    isAddPinMode ? "pointer-events-none opacity-25 scale-90" : "pointer-events-auto"
                  } ${isSelected ? "z-50" : "z-10"}`}
                  style={{ left, top, userSelect: "none", WebkitTapHighlightColor: "transparent" }}
                  aria-label={`Annotation ${number}`}
                  title={`Annotation ${number}`}
                >
                  <div
                    className="w-9 h-9 rounded-full text-xs font-semibold grid place-items-center"
                    style={{
                      pointerEvents: "none",
                      background: "rgba(255,255,255,0.95)",
                      color: "rgba(0,0,0,0.72)",
                      border: isSelected ? `2px solid ${selectedEdge}` : `1px solid ${pinEdge}`,
                      boxShadow: "0 12px 30px -18px rgba(0,0,0,0.35)",
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