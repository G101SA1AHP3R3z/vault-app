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

  return (
    <div className="w-full pb-32 animate-in fade-in duration-300">
      {/* Header — match LibraryGrid */}
      <div className="px-6 pt-6 pb-5 flex items-center justify-between">
        <div
          className="text-[18px] font-semibold tracking-[0.02em]"
          style={{ fontFamily: headerFont, color: "rgba(0,0,0,0.85)" }}
        >
          [ Settings ]
        </div>
      </div>

      {/* Content */}
      <div className="px-6">
        {/* Account card */}
        <div
          className="p-4"
          style={{
            borderRadius: 6,
            background: "rgba(0,0,0,0.04)",
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <div className="text-[12px] font-semibold tracking-[0.18em] text-black/45">
            ACCOUNT
          </div>

          <div className="mt-3 flex items-center gap-3">
            <div
              className="w-11 h-11 flex items-center justify-center text-[12px] font-bold"
              style={{
                borderRadius: 999,
                background: "rgba(255,255,255,0.92)",
                border: `1px solid ${palette?.line || "rgba(0,0,0,0.10)"}`,
                color: "rgba(0,0,0,0.75)",
              }}
            >
              {initials}
            </div>

            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-black/80 flex items-center gap-2">
                <User className="w-4 h-4 text-black/45" />
                <span className="truncate">{name}</span>
              </div>
              {email ? (
                <div className="mt-0.5 text-[12px] text-black/45 truncate">{email}</div>
              ) : null}
            </div>
          </div>

          {/* Sign out */}
          <button
            onClick={() => signOutUser?.()}
            className="mt-4 inline-flex items-center gap-2 px-4 py-3 text-[12px] font-semibold tracking-[0.12em]"
            style={{
              borderRadius: 6,
              border: `1px solid ${palette?.line || "rgba(0,0,0,0.10)"}`,
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
            borderRadius: 6,
            background: "rgba(0,0,0,0.04)",
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <div className="text-[12px] font-semibold tracking-[0.18em] text-black/45">
            APP
          </div>

          <div className="mt-3 flex items-start gap-2 text-[12px] text-black/55">
            <Info className="w-4 h-4 mt-[2px]" />
            <div>
              <div>
                Version: <span className="text-black/70">0.1</span>
              </div>
              <div className="mt-1">
                More settings coming soon (theme, grid size, export).
              </div>
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
