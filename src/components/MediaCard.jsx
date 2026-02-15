import React, { useMemo } from "react";
import { Trash2 } from "lucide-react";

export default function MediaCard({ item, onClick, onDelete }) {
  const src = useMemo(() => {
    if (!item) return "";
    if (typeof item.url === "string" && item.url.trim()) return item.url;
    if (typeof item.coverPhoto === "string" && item.coverPhoto.trim()) return item.coverPhoto;
    return "";
  }, [item]);

  const isVideo = item?.type === "video" || item?.kind === "video" || item?.mediaType === "video";
  const hotspotsCount = Array.isArray(item?.hotspots) ? item.hotspots.length : 0;

  return (
    <div 
      onClick={onClick}
      className="aspect-square bg-gray-200 rounded-xl overflow-hidden relative cursor-pointer active:scale-95 transition-all shadow-sm border border-gray-100 group"
    >
      {src ? (
        <img
          src={src}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          alt="Media"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px] font-bold uppercase tracking-widest">
          No cover
        </div>
      )}

      {isVideo && (
        <div className="absolute bottom-1 left-1 text-white text-[9px] font-black uppercase tracking-wider z-10 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded">
          VIDEO
        </div>
      )}

      {item?.type === "photo" && hotspotsCount > 0 && (
        <div className="absolute top-1 left-1 flex items-center justify-center w-5 h-5 bg-black/70 backdrop-blur-md rounded-full border border-white/20">
          <span className="text-white text-[9px] font-black">{hotspotsCount}</span>
        </div>
      )}

      {/* The Execution Button */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevents the photo from opening
            if (confirm("Permanently delete this photo?")) {
              onDelete(item);
            }
          }}
          className="absolute top-1 right-1 w-6 h-6 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white/70 hover:bg-red-500 hover:text-white transition-all z-20"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}