import React, { useMemo, useRef } from "react";
import { Trash2, Play, MapPin, Check } from "lucide-react";

export default function MediaCard({
  item,
  onClick,
  onDelete,

  // ✅ selection mode
  selectionMode = false,
  selected = false,
  onLongPress,
  onToggleSelect,
}) {
  const src = useMemo(() => {
    if (!item) return "";
    if (typeof item.url === "string" && item.url.trim()) return item.url;
    if (typeof item.coverPhoto === "string" && item.coverPhoto.trim()) return item.coverPhoto;
    return "";
  }, [item]);

  const isVideo =
    item?.type === "video" || item?.kind === "video" || item?.mediaType === "video";

  const hotspotsCount = Array.isArray(item?.hotspots) ? item.hotspots.length : 0;

  // Index palette (match app/login vibe)
  const palette = {
    ink: "#0B0B0C",
    paper: "#FFFEFA",
    line: "rgba(0,0,0,0.08)",
    sky: "#3AA8FF",
    sun: "#FFEA3A",
    breeze: "#54E6C1",
  };

  // ✅ Long press (activate selection mode) + swallow click after long-press
  const pressTimer = useRef(null);
  const startPt = useRef({ x: 0, y: 0 });
  const moved = useRef(false);
  const didLongPress = useRef(false);

  const clearPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
    moved.current = false;
    // note: do NOT clear didLongPress here; we need it to swallow the next click
  };

  const handlePointerDown = (e) => {
    if (!onLongPress) return;

    didLongPress.current = false;
    startPt.current = { x: e.clientX, y: e.clientY };
    moved.current = false;

    clearPress();
    pressTimer.current = setTimeout(() => {
      if (!moved.current) {
        didLongPress.current = true; // ✅ mark long-press happened
        onLongPress?.();
      }
    }, 420);
  };

  const handlePointerMove = (e) => {
    const dx = Math.abs(e.clientX - startPt.current.x);
    const dy = Math.abs(e.clientY - startPt.current.y);
    if (dx + dy > 10) {
      moved.current = true;
      clearPress();
    }
  };

  const handlePointerUp = () => clearPress();
  const handlePointerCancel = () => clearPress();

  const handleCardClick = () => {
    // ✅ If long-press just fired, ignore this click so selection stays active
    if (didLongPress.current) {
      didLongPress.current = false;
      return;
    }

    if (selectionMode) {
      onToggleSelect?.();
      return;
    }

    onClick?.();
  };

  return (
    <div
      onClick={handleCardClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      className="aspect-square overflow-hidden relative cursor-pointer active:scale-[0.98] transition-transform group select-none"
      style={{
        borderRadius: 12,
        background: "rgba(255,255,255,0.62)",
        border: `1px solid ${palette.line}`,
        backdropFilter: "blur(14px)",
        boxShadow: "0 18px 45px -38px rgba(0,0,0,0.35)",
      }}
    >
      {src ? (
        <>
          <img
            src={src}
            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
            alt="Media"
            loading="lazy"
            draggable={false}
          />

          {/* subtle unifying overlay (sun/sky) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(135deg, rgba(58,168,255,0.12) 0%, rgba(255,234,58,0.08) 52%, rgba(255,255,255,0.06) 100%)",
              mixBlendMode: "screen",
            }}
          />
          <div className="absolute inset-0 bg-white/5 pointer-events-none" />
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-black/40 text-[10px] font-semibold uppercase tracking-widest">
          No cover
        </div>
      )}

      {/* ✅ Selection UI */}
      {selectionMode && (
        <>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: selected ? "rgba(11,11,12,0.12)" : "rgba(11,11,12,0.06)",
            }}
          />

          <div
            className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center"
            style={{
              borderRadius: 999,
              background: selected ? palette.sun : "rgba(255,255,255,0.62)",
              border: `1px solid ${palette.line}`,
              backdropFilter: "blur(14px)",
              boxShadow: selected ? "0 12px 26px -22px rgba(0,0,0,0.45)" : "none",
            }}
          >
            {selected ? <Check className="w-4 h-4" style={{ color: palette.ink }} /> : null}
          </div>

          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              borderRadius: 12,
              boxShadow: selected
                ? "inset 0 0 0 2px rgba(255,234,58,0.55), inset 0 0 0 3px rgba(58,168,255,0.20)"
                : "inset 0 0 0 1px rgba(0,0,0,0.06)",
            }}
          />
        </>
      )}

      {/* Video chip */}
      {isVideo && (
        <div
          className="absolute bottom-2 left-2 inline-flex items-center gap-1 px-2 py-1"
          style={{
            borderRadius: 8,
            background: "rgba(255,255,255,0.55)",
            border: `1px solid ${palette.line}`,
            backdropFilter: "blur(14px)",
            color: "rgba(0,0,0,0.70)",
          }}
        >
          <Play className="w-3 h-3" />
          <span className="text-[10px] font-semibold uppercase tracking-wide">Video</span>
        </div>
      )}

      {/* Hotspots chip */}
      {item?.type === "photo" && hotspotsCount > 0 && (
        <div
          className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-1"
          style={{
            borderRadius: 8,
            background: "rgba(255,255,255,0.55)",
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

      {/* Delete (hidden while selecting) */}
      {!selectionMode && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm("Permanently delete this photo?")) onDelete(item);
          }}
          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            borderRadius: 8,
            background: "rgba(255,255,255,0.55)",
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

      {/* Hover accent hairline (subtle, sunny) */}
      {!selectionMode && (
        <div
          className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            borderRadius: 12,
            boxShadow:
              "inset 0 0 0 1px rgba(255,234,58,0.20), inset 0 0 0 2px rgba(58,168,255,0.10)",
          }}
        />
      )}
    </div>
  );
}
