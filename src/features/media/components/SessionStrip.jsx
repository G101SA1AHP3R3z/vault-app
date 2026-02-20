import React, { useEffect, useRef, useMemo } from "react";

export default function SessionStrip({ headerFont, media, moreFromSession = [], onSelectMedia }) {
  const scrollRef = useRef(null);

  const list = useMemo(() => {
    return Array.isArray(moreFromSession) ? moreFromSession.filter((m) => m?.url) : [];
  }, [moreFromSession]);

  useEffect(() => {
    if (!media?.id || !scrollRef.current) return;

    const container = scrollRef.current;
    const activeEl = container.querySelector(`[data-media-id="${media.id}"]`);

    if (activeEl) {
      const centerPosition = activeEl.offsetLeft - container.clientWidth / 2 + activeEl.clientWidth / 2;
      container.scrollTo({ left: centerPosition, behavior: "smooth" });
    }
  }, [media?.id]);

  if (list.length === 0) return null;

  return (
    <>
      <div className="mt-9 text-[18px] font-medium text-black/85" style={{ fontFamily: headerFont }}>
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
              onMouseDown={(e) => e.preventDefault()} // prevents focus-scroll jump
              onPointerDown={(e) => e.stopPropagation()} // don’t interfere with stage swipe
              onClick={() => onSelectMedia?.(m)}
              className="shrink-0 outline-none"
              aria-label="Open photo"
              title="Open photo"
            >
              <div
                className={`w-[86px] h-[86px] overflow-hidden transition-all duration-300 ease-out ${
                  active ? "scale-100 shadow-md" : "scale-95 hover:scale-100"
                }`}
                style={{
                  borderRadius: 0,
                  border: active ? "2px solid rgba(0,0,0,0.8)" : "1px solid rgba(0,0,0,0.1)",
                  background: "rgba(0,0,0,0.04)",
                }}
              >
                <img src={m.thumbnailUrl || m.url} alt="" className="w-full h-full object-cover" decoding="async" />
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}