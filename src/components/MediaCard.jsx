import React, { useMemo } from "react";
import { Trash2, Play, MapPin } from "lucide-react";

export default function MediaCard({ item, onClick, onDelete }) {
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

  return (
    <div
      onClick={onClick}
      className="aspect-square overflow-hidden relative cursor-pointer active:scale-[0.98] transition-transform group"
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

      {/* Delete (radius <= 8px) */}
      {onDelete && (
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
      <div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          borderRadius: 12,
          boxShadow:
            "inset 0 0 0 1px rgba(255,234,58,0.20), inset 0 0 0 2px rgba(58,168,255,0.10)",
        }}
      />
    </div>
  );
}