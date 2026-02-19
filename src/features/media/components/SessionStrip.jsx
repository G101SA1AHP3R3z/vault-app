import React, { useEffect, useRef, useMemo } from "react";

export default function SessionStrip({
  headerFont,
  media,
  moreFromSession = [],
  onSelectMedia,
}) {
  const scrollRef = useRef(null);

  const list = useMemo(() => {
    return Array.isArray(moreFromSession) ? moreFromSession.filter((m) => m?.url) : [];
  }, [moreFromSession]);

  // FIX: Smoothly glide the scrollbar to keep the active thumbnail visible, 
  // instead of destroying and recreating DOM nodes to fake a window.
  useEffect(() => {
    if (!media?.id || !scrollRef.current) return;
    
    const activeEl = scrollRef.current.querySelector(`[data-media-id="${media.id}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [media?.id]);

  if (list.length === 0) return null;

  return (
    <>
      <div
        className="mt-10 text-[18px] font-medium text-black/85"
        style={{ fontFamily: headerFont }}
      >
        More photos from session
      </div>

      <div 
        ref={scrollRef}
        className="mt-3 flex gap-3 overflow-x-auto pb-4 scroll-smooth hide-scrollbar" 
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
      >
        {list.map((m) => {
          const active = m.id === media?.id;
          return (
            <button
              key={m.id}
              data-media-id={m.id}
              onClick={() => onSelectMedia?.(m)}
              className="shrink-0 outline-none"
              aria-label="Open photo"
              title="Open photo"
            >
              <div
                className={`w-[86px] h-[86px] overflow-hidden transition-all duration-300 ease-out ${
                  active ? "opacity-100 scale-100 shadow-md" : "opacity-60 scale-95 hover:opacity-100"
                }`}
                style={{
                  borderRadius: 0,
                  border: active
                    ? "2px solid rgba(0,0,0,0.8)"
                    : "1px solid rgba(0,0,0,0.1)",
                  background: "rgba(0,0,0,0.04)",
                }}
              >
                <img
                  src={m.thumbnailUrl || m.url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}