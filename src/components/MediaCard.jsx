import React, { useEffect, useMemo, useRef } from "react";
import { Trash2, Play, MapPin, Check } from "lucide-react";

/**
 * MediaCard
 * - Used inside session grids and horizontal "more to explore" rails.
 * - Supports long-press to enter selection mode (Pinterest / iOS Photos vibe).
 */
export default function MediaCard({
  item,
  onClick,
  onDelete,

  // Selection mode
  selectionMode = false,
  selected = false,
  onLongPress,
  onToggleSelect,

  // Layout
  variant = "square", // "square" | "tall"
}) {
  const pressRef = useRef({ timer: null, longPressed: false });

  const src = useMemo(() => {
    if (!item) return "";
    if (typeof item.url === "string" && item.url.trim()) return item.url;
    if (typeof item.coverPhoto === "string" && item.coverPhoto.trim()) return item.coverPhoto;
    return "";
  }, [item]);

  const isVideo = item?.type === "video" || item?.kind === "video" || item?.mediaType === "video";
  const hotspotsCount = Array.isArray(item?.hotspots) ? item.hotspots.length : 0;

  const palette = {
    ink: "#0B0B0C",
    line: "rgba(0,0,0,0.08)",
    sky: "#3AA8FF",
    sun: "#FFEA3A",
  };

  useEffect(() => {
    return () => {
      if (pressRef.current.timer) clearTimeout(pressRef.current.timer);
      pressRef.current.timer = null;
    };
  }, []);

  const clearTimer = () => {
    if (pressRef.current.timer) clearTimeout(pressRef.current.timer);
    pressRef.current.timer = null;
  };

  const onPointerDown = () => {
    pressRef.current.longPressed = false;
    clearTimer();
    if (!onLongPress) return;
    pressRef.current.timer = setTimeout(() => {
      pressRef.current.longPressed = true;
      onLongPress?.();
    }, 420);
  };

  const onPointerUp = () => clearTimer();

  const handleClick = () => {
    if (pressRef.current.longPressed) {
      pressRef.current.longPressed = false;
      return;
    }
    if (selectionMode) onToggleSelect?.();
    else onClick?.();
  };

  const aspect = variant === "tall" ? "aspect-[3/4]" : "aspect-square";

  return (
    <div
      onClick={handleClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerUp}
      className={`${aspect} overflow-hidden relative cursor-pointer group active:scale-[0.985] transition-transform`}
      style={{
        borderRadius: 14,
        background: "rgba(255,255,255,0.70)",
        border: `1px solid ${palette.line}`,
        backdropFilter: "blur(14px)",
        boxShadow: "0 18px 45px -38px rgba(0,0,0,0.30)",
      }}
      role="button"
      tabIndex={0}
    >
      {src ? (
        <>
          <img
            src={src}
            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
            alt=""
            loading="lazy"
            draggable={false}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(135deg, rgba(58,168,255,0.10) 0%, rgba(255,234,58,0.06) 55%, rgba(255,255,255,0.04) 100%)",
              mixBlendMode: "screen",
            }}
          />
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-black/40 text-[10px] font-semibold uppercase tracking-widest">
          No media
        </div>
      )}

      {selectionMode && (
        <>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: selected ? "rgba(58,168,255,0.10)" : "rgba(0,0,0,0.02)" }}
          />
          <div
            className="absolute top-2 right-2 w-8 h-8 rounded-full grid place-items-center"
            style={{
              background: selected ? palette.sky : "rgba(255,255,255,0.82)",
              color: selected ? "#fff" : "rgba(0,0,0,0.55)",
              border: `1px solid ${palette.line}`,
              backdropFilter: "blur(14px)",
            }}
          >
            <Check className="w-4 h-4" />
          </div>
        </>
      )}

      {isVideo && !selectionMode && (
        <div
          className="absolute bottom-2 left-2 inline-flex items-center gap-1 px-2 py-1"
          style={{
            borderRadius: 10,
            background: "rgba(255,255,255,0.68)",
            border: `1px solid ${palette.line}`,
            backdropFilter: "blur(14px)",
            color: "rgba(0,0,0,0.70)",
          }}
        >
          <Play className="w-3 h-3" />
          <span className="text-[10px] font-semibold uppercase tracking-wide">Video</span>
        </div>
      )}

      {item?.type === "photo" && hotspotsCount > 0 && !selectionMode && (
        <div
          className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-1"
          style={{
            borderRadius: 10,
            background: "rgba(255,255,255,0.68)",
            border: `1px solid ${palette.line}`,
            backdropFilter: "blur(14px)",
            color: "rgba(0,0,0,0.70)",
          }}
          title={`${hotspotsCount} pin(s)`}
        >
          <MapPin className="w-3 h-3" />
          <span className="text-[10px] font-semibold">{hotspotsCount}</span>
        </div>
      )}

      {onDelete && !selectionMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm("Permanently delete this photo?")) onDelete(item);
          }}
          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            borderRadius: 12,
            background: "rgba(255,255,255,0.68)",
            border: `1px solid ${palette.line}`,
            backdropFilter: "blur(14px)",
            color: "rgba(0,0,0,0.60)",
          }}
          aria-label="Delete media"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
