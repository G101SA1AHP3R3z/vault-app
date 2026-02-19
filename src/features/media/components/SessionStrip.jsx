import React, { useMemo } from "react";

export default function SessionStrip({
  headerFont,
  media,
  moreFromSession = [],
  onSelectMedia,
}) {
  // We shove the filter INSIDE the memo so it doesn't create a brand new 
  // array reference every frame and destroy the cache.
  const windowed = useMemo(() => {
    const list = Array.isArray(moreFromSession)
      ? moreFromSession.filter((m) => m?.url)
      : [];

    if (list.length === 0) return [];

    const activeIdx = list.findIndex((m) => m.id === media?.id);
    if (activeIdx < 0) return list.slice(0, 12);

    // show a small strip around the active item
    const before = 6;
    const after = 8;
    let s = Math.max(0, activeIdx - before);
    let e = Math.min(list.length, activeIdx + after);

    // ensure at least ~12 items if possible
    while (e - s < 12 && (s > 0 || e < list.length)) {
      if (s > 0) s--;
      if (e < list.length) e++;
    }
    return list.slice(s, e);
  }, [moreFromSession, media?.id]);

  if (windowed.length === 0) return null;

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
              className="shrink-0 hover:opacity-80 transition-opacity"
              aria-label="Open photo"
              title="Open photo"
            >
              <div
                className="w-[86px] h-[86px] overflow-hidden"
                style={{
                  borderRadius: 0,
                  border: active
                    ? "2px solid rgba(0,0,0,0.65)" // Darkened slightly so it pops
                    : "1px solid rgba(0,0,0,0.08)",
                  background: "rgba(0,0,0,0.04)",
                }}
              >
                <img
                  // Bro, if these aren't thumbnails, your phone is going to melt.
                  // Use a thumbnail URL if you have one, fallback to the main url.
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