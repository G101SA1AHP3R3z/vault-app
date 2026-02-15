import React from "react";
import { Library, Search, Archive, Layers } from "lucide-react";

export default function Navigation({ currentTab, setTab }) {
  const tabs = [
    { id: "library", label: "Library", icon: Library },
    { id: "search", label: "Search", icon: Search },
    { id: "graveyard", label: "Graveyard", icon: Archive },
  ];

  const palette = {
    ink: "#0B0B0C",
    paper: "#FFFEFA",
    line: "rgba(0,0,0,0.08)",
    sky: "#3AA8FF",
    sun: "#FFEA3A",
    breeze: "#54E6C1",
  };

  return (
    <>
      {/* --- MOBILE: FLOATING PILL (Bottom Center) --- */}
      <div className="md:hidden fixed bottom-7 left-1/2 -translate-x-1/2 z-50">
        <div
          className="flex items-center p-1"
          style={{
            borderRadius: 999,
            background: "rgba(255,255,255,0.62)",
            border: `1px solid ${palette.line}`,
            backdropFilter: "blur(14px)",
            boxShadow: "0 18px 45px -38px rgba(0,0,0,0.35)",
          }}
        >
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className="relative flex items-center justify-center w-14 h-12 transition-all duration-200"
                style={{
                  borderRadius: 999,
                  color: isActive ? palette.ink : "rgba(0,0,0,0.55)",
                  background: isActive
                    ? `linear-gradient(135deg, ${palette.sun} 0%, rgba(255,234,58,0.75) 45%, rgba(58,168,255,0.18) 100%)`
                    : "transparent",
                  boxShadow: isActive ? "0 10px 25px -18px rgba(0,0,0,0.35)" : "none",
                }}
                aria-label={tab.label}
              >
                <Icon className="w-5 h-5" />
              </button>
            );
          })}
        </div>
      </div>

      {/* --- DESKTOP: SIDEBAR (Fixed Left) --- */}
      <div
        className="hidden md:flex fixed top-0 left-0 bottom-0 w-64 border-r flex-col p-6 z-40"
        style={{
          background: "rgba(255,255,255,0.55)",
          borderColor: palette.line,
          backdropFilter: "blur(14px)",
        }}
      >
        {/* Brand */}
        <div className="mb-8 flex items-center gap-3 px-1">
          <div
            className="w-9 h-9 grid place-items-center"
            style={{
              borderRadius: 8,
              background: "rgba(255,255,255,0.62)",
              border: `1px solid ${palette.line}`,
              boxShadow: "0 18px 45px -38px rgba(0,0,0,0.35)",
              color: palette.ink,
            }}
          >
            <Layers className="w-5 h-5" />
          </div>

          <div className="leading-tight">
            <div className="text-[18px] font-semibold tracking-tight" style={{ color: palette.ink }}>
              <span style={{ color: palette.sky }}>[</span>
              <span style={{ letterSpacing: "0.06em" }}>Index</span>
              <span style={{ color: palette.sun }}>]</span>
            </div>
            <div className="text-[11px] font-semibold text-black/45">
              Photos, but temporary
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="space-y-2">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold transition-all"
                style={{
                  borderRadius: 8,
                  border: `1px solid ${palette.line}`,
                  background: isActive ? "rgba(255,255,255,0.70)" : "rgba(255,255,255,0.40)",
                  color: isActive ? palette.ink : "rgba(0,0,0,0.60)",
                  boxShadow: isActive ? "0 14px 40px -34px rgba(0,0,0,0.45)" : "none",
                }}
              >
                <Icon className="w-4 h-4" />
                {tab.label}

                {/* tiny accent dots for active */}
                {isActive && (
                  <span className="ml-auto flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: palette.sun }} />
                    <span className="w-2 h-2 rounded-full" style={{ background: palette.sky, opacity: 0.6 }} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-auto px-1">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-black/35">
            INDEX v1.0
          </div>
          <div className="text-[11px] text-black/40 mt-1">
            Projects that last weeks → months (up to ~1 year)
          </div>
        </div>
      </div>
    </>
  );
}
