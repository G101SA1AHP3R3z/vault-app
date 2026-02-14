import React from 'react';
import { MapPin } from 'lucide-react';

export default function MediaCard({ item, onClick }) {
  return (
    <div 
      onClick={onClick}
      className="aspect-square bg-gray-200 rounded overflow-hidden relative cursor-pointer active:scale-95 transition-all shadow-sm border border-gray-100 group"
    >
      <img src={item.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Media" />
      
      {/* Video Indicator */}
      {item.type === 'video' && (
        <>
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-1 right-1 text-white text-[10px] font-bold tracking-wider z-10">{item.duration}</div>
        </>
      )}

      {/* Hotspot Indicator */}
      {item.type === 'photo' && item.hotspots?.length > 0 && (
        <div className="absolute top-1 right-1 bg-black/60 backdrop-blur-md text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm">
          <MapPin className="w-2.5 h-2.5" /> {item.hotspots.length}
        </div>
      )}
    </div>
  );
}
