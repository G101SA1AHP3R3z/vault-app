import React, { useMemo } from "react";
import { MapPin } from "lucide-react";

export default function MediaCard({ item, onClick }) {
  const src = useMemo(() => {
    if (!item) return "";

    // Case 1: this is a media item (photo/video)
    if (typeof item.url === "string" && item.url.trim()) return item.url;

    // Case 2: this is a project card
    if (typeof item.coverPhoto === "string" && item.coverPhoto.trim()) return item.coverPhoto;

    // Common fallbacks (depends on how you named arrays)
    const firstFromMedia = item.media?.find?.(m => m?.url)?.url;
    if (typeof firstFromMedia === "string" && firstFromMedia.trim()) return firstFromMedia;

    const firstFromItems = item.items?.find?.(m => m?.url)?.url;
    if (typeof firstFromItems === "string" && firstFromItems.trim()) return firstFromItems;

    const firstFromSessions =
      item.sessions?.flatMap?.(s => s?.media || s?.items || [])?.find?.(m => m?.url)?.url;
    if (typeof firstFromSessions === "string" && firstFromSessions.trim()) return firstFromSessions;

    return "";
  }, [item]);

  const isVideo =
    item?.type === "video" || item?.kind === "video" || item?.mediaType === "video";

  const hotspotsCount = item?.hotspots?.length || 0;

  return (
    <div
      onClick={onClick}
      className="aspect-square bg-gray-200 rounded overflow-hidden relative cursor-pointer active:scale-95 transition-all shadow-sm border border-gray-100 group"
    >
      {src ? (
        <img
          src={src}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          alt={item?.title ? `${item.title}` : "Media"}
          loading="lazy"
          onError={(e) => {
            // Prevent broken-image icon
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
          No cover
        </div>
      )}

      {/* Video Indicator */}
      {isVideo && (
        <>
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
          {item?.duration && (
            <div className="absolute bottom-1 right-1 text-white text-[10px] font-bold tracking-wider z-10">
              {item.duration}
            </div>
          )}
        </>
      )}

      {/* Hotspot Indicator (only if item is a photo media item) */}
      {item?.type === "photo" && hotspotsCount > 0 && (
        <div className="absolute top-1 right-1 bg-black/60 backdrop-blur-md text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm">
          <MapPin className="w-2.5 h-2.5" /> {hotspotsCount}
        </div>
      )}
    </div>
  );
}
