// /src/features/media/components/SessionStrip.jsx
import React, { useEffect, useMemo, useRef } from "react";

const EASE_IOS = "cubic-bezier(.16,1,.3,1)";

export default function SessionStrip({
  headerFont, // kept for compatibility (not required anymore)
  media,
  moreFromSession = [],
  onSelectMedia,
}) {
  const scrollRef = useRef(null);

  const list = useMemo(() => {
    return Array.isArray(moreFromSession) ? moreFromSession.filter((m) => m?.url) : [];
  }, [moreFromSession]);

  // Center active thumb (no jank)
  useEffect(() => {
    if (!media?.id || !scrollRef.current) return;

    const container = scrollRef.current;
    const activeEl = container.querySelector(`[data-media-id="${media.id}"]`);
    if (!activeEl) return;

    const left =
      activeEl.offsetLeft - container.clientWidth / 2 + activeEl.clientWidth / 2;

    container.scrollTo({
      left: Math.max(0, left),
      behavior: "smooth",
    });
  }, [media?.id]);

  if (list.length === 0) return null;

  return (
    <div className="mt-7">
      {/* Small, tucked label (no big header) */}
      <div className="label-caps">More from session</div>

      <div className="relative mt-3">
        {/* subtle fade edges */}
        <div
          className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 z-10"
          style={{
            background: "linear-gradient(90deg, rgba(255,254,250,1) 0%, rgba(255,254,250,0) 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 z-10"
          style={{
            background: "linear-gradient(270deg, rgba(255,254,250,1) 0%, rgba(255,254,250,0) 100%)",
          }}
        />

        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar"
          style={{
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
            scrollBehavior: "smooth",
          }}
        >
          {list.map((m) => {
            const active = m.id === media?.id;

            return (
              <button
                key={m.id}
                data-media-id={m.id}
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()} // avoid focus-scroll jump
                onPointerDown={(e) => e.stopPropagation()} // avoid swipe handler hijack
                onClick={() => onSelectMedia?.(m)}
                className="shrink-0 outline-none active:scale-[0.99] transition-transform"
                style={{
                  WebkitTapHighlightColor: "transparent",
                  transitionTimingFunction: EASE_IOS,
                }}
                aria-label="Open photo"
                title="Open photo"
              >
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 12,
                    overflow: "hidden",
                    background: "rgba(0,0,0,0.04)",
                    border: active
                      ? "2px solid rgba(0,0,0,0.78)"
                      : "1px solid rgba(0,0,0,0.10)",
                    boxShadow: active ? "0 18px 40px -34px rgba(0,0,0,0.55)" : "none",
                    transform: active ? "scale(1)" : "scale(0.98)",
                    transition: `transform 220ms ${EASE_IOS}, box-shadow 220ms ${EASE_IOS}, border-color 220ms ${EASE_IOS}`,
                  }}
                >
                  <img
                    src={m.thumbnailUrl || m.url}
                    alt=""
                    draggable={false}
                    decoding="async"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}