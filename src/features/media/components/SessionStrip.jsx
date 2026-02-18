import React from "react";

export default function SessionStrip({
  headerFont,
  media,
  moreFromSession = [],
  onSelectMedia,
}) {
  if (!Array.isArray(moreFromSession) || moreFromSession.length === 0) return null;

  return (
    <>
      <div className="mt-10 text-[18px] font-medium text-black/85" style={{ fontFamily: headerFont }}>
        More photos from session
      </div>

      <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
        {moreFromSession
          .filter((m) => m?.url)
          .map((m) => {
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
                    border: active ? "2px solid rgba(0,0,0,0.35)" : "1px solid rgba(0,0,0,0.08)",
                    background: "rgba(0,0,0,0.04)",
                  }}
                >
                  <img
                    src={m.url}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
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
