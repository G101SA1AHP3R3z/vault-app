import React from "react";
import { Archive, Settings, Search } from "lucide-react";

function LibraryMark({ active }) {
  // 3 vertical bars icon (like your screenshot)
  const color = active ? "rgba(255,77,46,0.95)" : "rgba(0,0,0,0.45)";
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <rect x="4" y="4" width="2.6" height="12" rx="1.3" fill={color} />
      <rect x="8.7" y="4" width="2.6" height="12" rx="1.3" fill={color} opacity="0.75" />
      <rect x="13.4" y="4" width="2.6" height="12" rx="1.3" fill={color} opacity="0.55" />
    </svg>
  );
}

function IconBtn({ active, onClick, children, label }) {
  return (
    <button
      onClick={onClick}
      className="w-11 h-11 grid place-items-center rounded-[12px] active:scale-[0.98] transition-transform"
      style={{ background: active ? "rgba(0,0,0,0.04)" : "transparent" }}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

export default function Navigation({ currentTab, setTab }) {
  const palette = {
    line: "rgba(0,0,0,0.10)",
    ink: "#0B0B0C",
  };

  const isActive = (id) => currentTab === id;

  return (
    <>
      {/* MOBILE FLOATING NAV (matches screenshot) */}
      <div className="md:hidden fixed bottom-8 inset-x-0 z-50 pointer-events-none">
        <div className="max-w-md mx-auto px-6 flex items-end justify-between">
          {/* Left pill */}
          <div
            className="pointer-events-auto flex items-center gap-1 px-2 py-2"
            style={{
              borderRadius: 14,
              background: "rgba(255,255,255,0.92)",
              border: `1px solid ${palette.line}`,
              boxShadow: "0 18px 45px -40px rgba(0,0,0,0.35)",
              backdropFilter: "blur(18px)",
            }}
          >
            {/* Library */}
            <IconBtn active={isActive("library")} onClick={() => setTab("library")} label="Library">
              <LibraryMark active={isActive("library")} />
            </IconBtn>

            {/* Archive (maps to your existing 'graveyard' tab) */}
            <IconBtn active={isActive("graveyard")} onClick={() => setTab("graveyard")} label="Archive">
              <Archive
                className="w-5 h-5"
                style={{ color: isActive("graveyard") ? palette.ink : "rgba(0,0,0,0.45)" }}
              />
            </IconBtn>

            {/* Settings (keeping tab id as 'vault' so your app doesn't break) */}
            <IconBtn active={isActive("vault")} onClick={() => setTab("vault")} label="Settings">
              <Settings
                className="w-5 h-5"
                style={{ color: isActive("vault") ? palette.ink : "rgba(0,0,0,0.45)" }}
              />
            </IconBtn>
          </div>

          {/* Right floating search button */}
          <button
            onClick={() => setTab("search")}
            className="pointer-events-auto w-12 h-12 grid place-items-center rounded-[14px] active:scale-[0.98] transition-transform"
            style={{
              background: "rgba(255,255,255,0.92)",
              border: `1px solid ${palette.line}`,
              boxShadow: "0 18px 45px -40px rgba(0,0,0,0.35)",
              backdropFilter: "blur(18px)",
            }}
            aria-label="Search"
            title="Search"
          >
            <Search
              className="w-5 h-5"
              style={{ color: isActive("search") ? palette.ink : "rgba(0,0,0,0.45)" }}
            />
          </button>
        </div>
      </div>
    </>
  );
}
