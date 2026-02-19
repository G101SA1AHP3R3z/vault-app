import React, { useMemo } from "react";

export default function SessionStrip({
  headerFont,
  media,
  moreFromSession = [],
  onSelectMedia,
}) {
  const list = Array.isArray(moreFromSession) ? moreFromSession.filter((m) => m?.url) : [];
  if (list.length === 0) return null;

  const windowed = useMemo(() => {
    const activeIdx = list.findIndex((m) => m.id === media?.id);
    if (activeIdx < 0) return list.slice(0, 12);

    // show a small strip around the active item
    const before = 6;
    const after = 8;
    const start = Math.max(0, activeIdx - before);
    const end = Math.min(list.length, activeIdx + after);

    // ensure at least ~12 items if possible
    let s = start;
    let e = end;
    while (e - s < 12 && (s > 0 || e < list.length)) {
      if (s > 0) s--;
      if (e < list.length) e++;
    }
    return list.slice(s, e);
  }, [list, media?.id]);

  return (
    <>
      <div
        className="mt-10 text-[18px] font-medium text-black/85"
        style={{ fontFamily: headerFont }}
      >
        More photos from session
      </div>

      <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
        {windowed.map((m) => {
          const active = m.id === media?.id;
          return (
            <button
              key={m.id}
              onClick={() => onSelectMedia?.(m)}
              className="shrink-0"
              aria-label="Open photo"
              title="Open photo"
            >
              <div
                className="w-[86px] h-[86px] overflow-hidden"
                style={{
                  borderRadius: 0,
                  border: active
                    ? "2px solid rgba(0,0,0,0.35)"
                    : "1px solid rgba(0,0,0,0.08)",
                  background: "rgba(0,0,0,0.04)",
                }}
              >
                <img
                  src={m.url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                  // Hint browser that these are not important compared to main image
                  fetchPriority="low"
                  draggable={false}
                />
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}
