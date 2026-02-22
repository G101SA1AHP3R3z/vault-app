import React from "react";
import { Archive, Settings, Search } from "lucide-react";

function LibraryMark({ active }) {
  const color = active ? "rgba(0,0,0,0.82)" : "rgba(0,0,0,0.38)";
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <rect x="4" y="4" width="2.6" height="12" rx="1.3" fill={color} />
      <rect x="8.7" y="4" width="2.6" height="12" rx="1.3" fill={color} opacity="0.78" />
      <rect x="13.4" y="4" width="2.6" height="12" rx="1.3" fill={color} opacity="0.60" />
    </svg>
  );
}

function Btn({ active, label, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="w-9 h-9 grid place-items-center rounded-full"
      aria-label={label}
      title={label}
      style={{
        background: active ? "rgba(0,0,0,0.08)" : "transparent",
        transition: "background 180ms cubic-bezier(.16,1,.3,1), transform 180ms cubic-bezier(.16,1,.3,1)",
      }}
    >
      {children}
    </button>
  );
}

export default function FloatingNavPill({ currentTab, setTab }) {
  const isActive = (id) => currentTab === id;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 pb-6 flex justify-center pointer-events-none">
      <div
        className="pointer-events-auto h-12 px-5 rounded-[999px] flex items-center gap-7"
        style={{
          background: "rgba(255,255,255,0.95)",
          border: "1px solid rgba(0,0,0,0.10)",
          backdropFilter: "blur(14px)",
          boxShadow: "0 18px 45px -40px rgba(0,0,0,0.35)",
        }}
      >
        <Btn active={isActive("library")} label="Projects" onClick={() => setTab?.("library")}>
          <LibraryMark active={isActive("library")} />
        </Btn>

        <Btn active={isActive("search")} label="Search" onClick={() => setTab?.("search")}>
          <Search className="w-5 h-5" style={{ color: isActive("search") ? "rgba(0,0,0,0.82)" : "rgba(0,0,0,0.38)" }} />
        </Btn>

        <Btn active={isActive("graveyard")} label="Archive" onClick={() => setTab?.("graveyard")}>
          <Archive className="w-5 h-5" style={{ color: isActive("graveyard") ? "rgba(0,0,0,0.82)" : "rgba(0,0,0,0.38)" }} />
        </Btn>

        <Btn active={isActive("vault")} label="Settings" onClick={() => setTab?.("vault")}>
          <Settings className="w-5 h-5" style={{ color: isActive("vault") ? "rgba(0,0,0,0.82)" : "rgba(0,0,0,0.38)" }} />
        </Btn>
      </div>
    </div>
  );
}