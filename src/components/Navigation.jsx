import React from "react";
import { Library, Search, Archive, Layers } from "lucide-react";

export default function Navigation({ currentTab, setTab }) {
  const tabs = [
    { id: "library", label: "Library", icon: Library },
    { id: "search", label: "Search", icon: Search },
    { id: "vault", label: "Vault", icon: Archive },
    { id: "sessions", label: "Sessions", icon: Layers },
  ];

  const palette = {
    ink: "#0B0B0C",
    line: "rgba(0,0,0,0.08)",
    sun: "#FFEA3A",
  };

  return (
    <>
      {/* --- MOBILE: APP-STORE-STYLE TAB BAR (Bottom Full Width) --- */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-50">
        <div
          className="px-2 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+10px)]"
          style={{
            background: "rgba(255,255,255,0.78)",
            borderTop: `1px solid ${palette.line}`,
            backdropFilter: "blur(18px)",
            boxShadow: "0 -18px 40px -34px rgba(0,0,0,0.35)",
          }}
        >
          <div className="max-w-xl mx-auto flex items-end justify-around">
            {tabs.map((tab) => {
              const isActive = currentTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setTab(tab.id)}
                  className="flex flex-col items-center justify-center gap-1 w-[92px] py-2 rounded-[12px] active:scale-[0.99] transition-transform"
                  style={{
                    background: isActive ? "rgba(0,0,0,0.04)" : "transparent",
                    color: isActive ? palette.ink : "rgba(0,0,0,0.55)",
                  }}
                  aria-label={tab.label}
                >
                  <div
                    className="w-8 h-8 rounded-[10px] grid place-items-center"
                    style={{
                      background: isActive ? "rgba(255,234,58,0.55)" : "rgba(0,0,0,0.04)",
                      border: `1px solid ${palette.line}`,
                    }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-[10px] font-semibold" style={{ letterSpacing: "0.03em" }}>
                    {tab.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Desktop can stay as-is in your app (if you had one). */}
    </>
  );
}
