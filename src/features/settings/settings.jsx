// /src/features/settings/settings.jsx
import React, { useMemo } from "react";
import { LogOut, User, Info } from "lucide-react";
import { useVault } from "../../context/VaultContext";

export default function Settings({ headerFont, palette }) {
  const { user, signOutUser } = useVault();

  const email = user?.email || "";
  const name = user?.displayName || "Account";

  const initials = useMemo(() => {
    const s = (user?.displayName || user?.email || "U").trim();
    const parts = s.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (s[0] || "U").toUpperCase();
  }, [user?.displayName, user?.email]);

  const paper = palette?.paper || "#FFFEFA";
  const line = palette?.line || "rgba(0,0,0,0.10)";

  return (
    <div className="w-full pb-32 animate-in fade-in duration-300" style={{ background: paper }}>
      {/* Header — match LibraryGrid */}
      <div className="px-6 pt-3 pb-3 flex items-center justify-between">
        <div
          className="text-[32px] font-semibold"
          style={{
            color: "rgba(0,0,0,0.86)",
            letterSpacing: "-0.01em",
          }}
        >
          Settings
        </div>
        <div className="w-12" />
      </div>

      {/* Content */}
      <div className="px-6">
        {/* Account card */}
        <div
          className="p-4"
          style={{
            borderRadius: 8,
            background: "rgba(0,0,0,0.04)",
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <div className="text-[12px] font-semibold tracking-[0.18em]" style={{ color: "rgba(0,0,0,0.45)" }}>
            ACCOUNT
          </div>

          <div className="mt-3 flex items-center gap-3">
            <div
              className="w-11 h-11 flex items-center justify-center text-[12px] font-bold"
              style={{
                borderRadius: 999,
                background: "rgba(255,255,255,0.92)",
                border: `1px solid ${line}`,
                color: "rgba(0,0,0,0.75)",
              }}
            >
              {initials}
            </div>

            <div className="min-w-0">
              <div className="text-[14px] font-semibold flex items-center gap-2" style={{ color: "rgba(0,0,0,0.80)" }}>
                <User className="w-4 h-4" style={{ color: "rgba(0,0,0,0.45)" }} />
                <span className="truncate">{name}</span>
              </div>
              {email ? (
                <div className="mt-0.5 text-[12px] truncate" style={{ color: "rgba(0,0,0,0.45)" }}>
                  {email}
                </div>
              ) : null}
            </div>
          </div>

          {/* Sign out */}
          <button
            onClick={() => signOutUser?.()}
            className="mt-4 inline-flex items-center gap-2 px-4 py-3 text-[12px] font-semibold tracking-[0.12em]"
            style={{
              borderRadius: 8,
              border: `1px solid ${line}`,
              color: "rgba(0,0,0,0.78)",
              background: "rgba(255,255,255,0.78)",
            }}
          >
            <LogOut className="w-4 h-4" />
            SIGN OUT
          </button>
        </div>

        {/* App info */}
        <div
          className="mt-6 p-4"
          style={{
            borderRadius: 8,
            background: "rgba(0,0,0,0.04)",
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <div className="text-[12px] font-semibold tracking-[0.18em]" style={{ color: "rgba(0,0,0,0.45)" }}>
            APP
          </div>

          <div className="mt-3 flex items-start gap-2 text-[12px]" style={{ color: "rgba(0,0,0,0.55)" }}>
            <Info className="w-4 h-4 mt-[2px]" />
            <div>
              <div>
                Version: <span style={{ color: "rgba(0,0,0,0.70)" }}>0.1</span>
              </div>
              <div className="mt-1">More settings coming soon (theme, grid size, export).</div>
            </div>
          </div>
        </div>

        {/* optional helper text */}
        <div className="mt-4 text-[12px]" style={{ color: "rgba(0,0,0,0.35)" }}>
          Tip: Keep Settings minimal — you’re building a pro tool.
        </div>
      </div>
    </div>
  );
}