// /src/components/Navigation.jsx
import React, { useEffect, useRef, useState } from "react";
import { Menu, X, Archive, Settings, Search } from "lucide-react";

function TopBar({ onOpenMenu }) {
  return (
    <div
      className="sticky top-0 z-40"
      style={{
        background: "rgba(255,254,250,0.88)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      <div className="px-6 pt-4 pb-3 flex items-center justify-between">
        <div className="min-w-0">
          <div
            className="text-[12px] font-semibold tracking-[0.16em] uppercase"
            style={{ color: "rgba(0,0,0,0.55)" }}
          >
            [ Index ]
          </div>
        </div>

        <button
          onClick={onOpenMenu}
          className="w-9 h-9 grid place-items-center rounded-[12px] active:scale-[0.98] transition-transform"
          style={{
            background: "rgba(255,255,255,0.72)",
            border: "1px solid rgba(0,0,0,0.10)",
            WebkitTapHighlightColor: "transparent",
          }}
          aria-label="Menu"
          title="Menu"
        >
          <Menu className="w-5 h-5" style={{ color: "rgba(0,0,0,0.78)" }} />
        </button>
      </div>
    </div>
  );
}

function BackRow({ onBack, rightSlot }) {
  if (!onBack && !rightSlot) return null;

  return (
    <div className="px-6 pt-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        {onBack ? (
          <button
            onClick={onBack}
            className="h-9 px-3 rounded-[999px] inline-flex items-center gap-2 active:scale-[0.99] transition-transform"
            style={{
              background: "rgba(255,255,255,0.76)",
              border: "1px solid rgba(0,0,0,0.10)",
              color: "rgba(0,0,0,0.70)",
              WebkitTapHighlightColor: "transparent",
            }}
            aria-label="Back"
            title="Back"
          >
            <span className="text-[12px] font-semibold uppercase" style={{ letterSpacing: "0.16em" }}>
              ← Back
            </span>
          </button>
        ) : (
          <div />
        )}
      </div>

      {rightSlot ? <div className="shrink-0">{rightSlot}</div> : <div />}
    </div>
  );
}

function DrawerItem({ label, active, onClick }) {
  return (
    <button onClick={onClick} className="w-full text-left py-2.5" style={{ WebkitTapHighlightColor: "transparent" }}>
      <div className="flex items-center gap-2">
        <div
          className="text-[13px] font-semibold uppercase"
          style={{
            color: active ? "rgba(0,0,0,0.86)" : "rgba(0,0,0,0.72)",
            letterSpacing: "0.18em",
          }}
        >
          {label}
        </div>
        {active ? <div className="w-1.5 h-1.5 rounded-full" style={{ background: "rgba(0,0,0,0.60)" }} /> : null}
      </div>
    </button>
  );
}

function MobilePillNav({ tab, onTabChange }) {
  const isActive = (id) => tab === id;

  const IconBtn = ({ id, label, children }) => (
    <button
      onClick={() => onTabChange?.(id)}
      className="w-11 h-11 grid place-items-center rounded-[12px] active:scale-[0.98] transition-transform"
      style={{ background: isActive(id) ? "rgba(0,0,0,0.04)" : "transparent" }}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );

  return (
    <div className="md:hidden fixed bottom-8 inset-x-0 z-50 pointer-events-none">
      <div className="max-w-md mx-auto px-6 flex items-end justify-between">
        <div
          className="pointer-events-auto flex items-center gap-1 px-2 py-2"
          style={{
            borderRadius: 14,
            background: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(0,0,0,0.10)",
            boxShadow: "0 18px 45px -40px rgba(0,0,0,0.35)",
            backdropFilter: "blur(18px)",
          }}
        >
          <IconBtn id="library" label="Projects">
            <div
              className="text-[11px] font-semibold tracking-[0.16em] uppercase"
              style={{ color: isActive("library") ? "rgba(0,0,0,0.82)" : "rgba(0,0,0,0.45)" }}
            >
              P
            </div>
          </IconBtn>

          <IconBtn id="graveyard" label="Archive">
            <Archive className="w-5 h-5" style={{ color: isActive("graveyard") ? "rgba(0,0,0,0.82)" : "rgba(0,0,0,0.45)" }} />
          </IconBtn>

          <IconBtn id="vault" label="Settings">
            <Settings className="w-5 h-5" style={{ color: isActive("vault") ? "rgba(0,0,0,0.82)" : "rgba(0,0,0,0.45)" }} />
          </IconBtn>
        </div>

        <button
          onClick={() => onTabChange?.("search")}
          className="pointer-events-auto w-12 h-12 grid place-items-center rounded-[14px] active:scale-[0.98] transition-transform"
          style={{
            background: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(0,0,0,0.10)",
            boxShadow: "0 18px 45px -40px rgba(0,0,0,0.35)",
            backdropFilter: "blur(18px)",
          }}
          aria-label="Search"
          title="Search"
        >
          <Search className="w-5 h-5" style={{ color: "rgba(0,0,0,0.55)" }} />
        </button>
      </div>
    </div>
  );
}

export default function Navigation(props) {
  const tab = props.tab ?? props.currentTab ?? "library";
  const onTabChange = props.onTabChange ?? props.setTab;
  const onBack = props.onBack ?? null;

  // ✅ NEW: action aligned with Back row (for session/project)
  const belowHeaderRight = props.belowHeaderRight ?? null;

  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  const go = (nextTab) => {
    onTabChange?.(nextTab);
    setOpen(false);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  return (
    <>
      <TopBar onOpenMenu={() => setOpen(true)} />
      <BackRow onBack={onBack} rightSlot={belowHeaderRight} />

      {open ? (
        <div className="fixed inset-0 z-[80]">
          <div
            className="absolute inset-0"
            style={{
              background: "rgba(255,255,255,0.60)",
              backdropFilter: "blur(18px)",
            }}
          />

          <div
            ref={panelRef}
            className="absolute top-0 right-0 h-full"
            style={{
              width: "min(360px, 78vw)",
              background: "rgba(255,255,255,0.92)",
              borderLeft: "1px solid rgba(0,0,0,0.08)",
              boxShadow: "-30px 0 80px -70px rgba(0,0,0,0.55)",
              backdropFilter: "blur(18px)",
            }}
          >
            <div className="px-6 pt-5 pb-6">
              <div className="flex items-center justify-between">
                <div className="text-[12px] font-semibold tracking-[0.16em] uppercase" style={{ color: "rgba(0,0,0,0.45)" }}>
                  Menu
                </div>

                <button
                  onClick={() => setOpen(false)}
                  className="w-10 h-10 grid place-items-center rounded-[12px] active:scale-[0.98] transition-transform"
                  style={{
                    background: "rgba(255,255,255,0.70)",
                    border: "1px solid rgba(0,0,0,0.10)",
                    WebkitTapHighlightColor: "transparent",
                  }}
                  aria-label="Close menu"
                  title="Close"
                >
                  <X className="w-5 h-5" style={{ color: "rgba(0,0,0,0.72)" }} />
                </button>
              </div>

              <div className="mt-10 flex flex-col gap-1">
                <DrawerItem label="Projects" active={tab === "library"} onClick={() => go("library")} />
                <DrawerItem label="Archive" active={tab === "graveyard"} onClick={() => go("graveyard")} />
                <DrawerItem label="Settings" active={tab === "vault"} onClick={() => go("vault")} />

                <div className="mt-3" style={{ height: 1, background: "rgba(0,0,0,0.06)" }} />
                <DrawerItem label="Search" active={tab === "search"} onClick={() => go("search")} />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <MobilePillNav tab={tab} onTabChange={onTabChange} />
    </>
  );
}