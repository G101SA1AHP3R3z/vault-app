import React, { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Search } from "lucide-react";

function Menu({ palette, items = [] }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-10 h-10 grid place-items-center rounded-[12px] active:scale-[0.98] transition-transform"
        style={{
          background: "rgba(255,255,255,0.85)",
          border: `1px solid ${palette.line}`,
          color: "rgba(0,0,0,0.70)",
          WebkitTapHighlightColor: "transparent",
        }}
        aria-label="More"
        title="More"
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-56 overflow-hidden z-50"
          style={{
            borderRadius: 12,
            background: "rgba(255,255,255,0.95)",
            border: `1px solid ${palette.line}`,
            boxShadow: "0 18px 45px -38px rgba(0,0,0,0.45)",
            backdropFilter: "blur(18px)",
          }}
        >
          {items
            .filter(Boolean)
            .map((it, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setOpen(false);
                  it?.onClick?.();
                }}
                className="w-full px-4 py-3 flex items-center gap-3 text-sm font-semibold text-left hover:bg-black/5"
                style={{
                  color: it?.danger ? "rgba(220,38,38,0.95)" : "rgba(0,0,0,0.78)",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {it?.icon ? <it.icon className="w-4 h-4" /> : null}
                {it?.label}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

/**
 * Web-only friendly header.
 * - Left: Index (home)
 * - Center: Search
 * - Right: Primary action + kebab menu
 */
export default function Navigation({
  title = "Index",
  showSearch = true,
  searchValue = "",
  onSearchChange,
  primaryLabel,
  onPrimary,
  onHome,
  menuItems = [],
}) {
  const palette = {
    line: "rgba(0,0,0,0.10)",
    paper: "rgba(255,255,255,0.72)",
  };

  return (
    <div className="sticky top-0 z-40">
      <div
        className="mx-auto max-w-6xl"
        style={{
          background: palette.paper,
          borderBottom: `1px solid ${palette.line}`,
          backdropFilter: "blur(18px)",
        }}
      >
        <div className="px-6 py-4 flex items-center gap-3">
          <button
            onClick={onHome}
            className="text-left"
            style={{ WebkitTapHighlightColor: "transparent" }}
            aria-label="Go to Library"
            title="Library"
          >
            <div
              className="text-[14px] font-semibold"
              style={{ color: "rgba(0,0,0,0.86)", letterSpacing: "0.02em" }}
            >
              {title}
            </div>
          </button>

          <div className="flex-1">
            {showSearch ? (
              <div
                className="w-full px-4 py-2.5 rounded-[12px] flex items-center gap-3"
                style={{
                  background: "rgba(255,255,255,0.70)",
                  border: `1px solid ${palette.line}`,
                }}
              >
                <Search className="w-4 h-4" style={{ color: "rgba(0,0,0,0.45)" }} />
                <input
                  value={searchValue}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  placeholder="Search projects or tags…"
                  className="w-full bg-transparent outline-none text-sm"
                  style={{ color: "rgba(0,0,0,0.78)" }}
                />
              </div>
            ) : null}
          </div>

          {primaryLabel ? (
            <button
              onClick={onPrimary}
              className="h-10 px-4 rounded-[12px] text-[12px] font-semibold tracking-[0.12em] uppercase active:scale-[0.99] transition-transform"
              style={{
                background: "rgba(255,77,46,0.95)",
                color: "rgba(0,0,0,0.86)",
                border: "1px solid rgba(0,0,0,0.10)",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {primaryLabel}
            </button>
          ) : null}

          <Menu palette={palette} items={menuItems} />
        </div>
      </div>
    </div>
  );
}