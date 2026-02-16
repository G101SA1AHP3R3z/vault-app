// /src/components/PinEditorModal.jsx
import React, { useEffect, useState } from "react";
import { Pencil, X } from "lucide-react";

/**
 * PinEditorModal
 * - Reusable modal for editing a pin (label + note)
 * - Keeps its own draft state, initialized from `initial`.
 *
 * Props:
 * - open: boolean
 * - initial: { label?: string, note?: string }  (can be null)
 * - headerFont: string (optional)
 * - palette: { sun, ink } (optional)
 * - onClose: () => void
 * - onSave: (draft: { label: string, note: string }) => void | Promise<void>
 * - onDelete: () => void | Promise<void>
 */
export default function PinEditorModal({
  open,
  initial,
  headerFont,
  palette,
  onClose,
  onSave,
  onDelete,
}) {
  const [draft, setDraft] = useState({ label: "", note: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft({
      label: initial?.label || "",
      note: initial?.note || "",
    });
  }, [open, initial?.label, initial?.note]);

  const handleSave = async () => {
    if (!onSave || busy) return;
    try {
      setBusy(true);
      await onSave({ label: draft.label || "", note: draft.note || "" });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || busy) return;
    try {
      setBusy(true);
      await onDelete();
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !busy && onClose?.()} />

      <div
        className="relative w-full max-w-lg bg-white overflow-hidden"
        style={{
          borderRadius: "14px",
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0 22px 60px -52px rgba(0,0,0,0.45)",
        }}
      >
        <div
          className="px-5 py-4 flex justify-between items-center"
          style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}
        >
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4" />
            <h3 className="text-sm font-semibold tracking-tight" style={{ fontFamily: headerFont }}>
              Edit Pin
            </h3>
          </div>

          <button
            onClick={() => !busy && onClose?.()}
            className="p-2 rounded-[8px]"
            style={{
              background: "rgba(255,255,255,0.55)",
              border: "1px solid rgba(0,0,0,0.08)",
              opacity: busy ? 0.6 : 1,
            }}
            aria-label="Close"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-black/45 mb-2">
              Label (optional)
            </label>
            <input
              value={draft.label}
              onChange={(e) => setDraft((p) => ({ ...p, label: e.target.value }))}
              className="w-full px-4 py-3 text-sm outline-none"
              style={{
                background: "rgba(255,255,255,0.60)",
                border: "1px solid rgba(0,0,0,0.10)",
                borderRadius: "8px",
              }}
              placeholder="e.g. Waistline"
              disabled={busy}
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-black/45 mb-2">
              Note
            </label>
            <textarea
              rows={4}
              value={draft.note}
              onChange={(e) => setDraft((p) => ({ ...p, note: e.target.value }))}
              className="w-full px-4 py-3 text-sm outline-none resize-none"
              style={{
                background: "rgba(255,255,255,0.60)",
                border: "1px solid rgba(0,0,0,0.10)",
                borderRadius: "8px",
              }}
              placeholder="What needs to change here?"
              disabled={busy}
            />
          </div>
        </div>

        <div
          className="p-5 flex gap-3"
          style={{
            borderTop: "1px solid rgba(0,0,0,0.08)",
            background: "rgba(255,255,255,0.55)",
          }}
        >
          <button
            onClick={handleDelete}
            className="flex-1 py-3 rounded-[8px] font-semibold text-sm"
            style={{
              background: "rgba(255,255,255,0.72)",
              border: "1px solid rgba(220,38,38,0.20)",
              color: "#DC2626",
              opacity: busy ? 0.6 : 1,
            }}
            disabled={busy}
          >
            Delete
          </button>

          <button
            onClick={handleSave}
            className="flex-[2] py-3 rounded-[8px] font-semibold text-sm"
            style={{
              background: palette?.sun || "#FFEA3A",
              color: palette?.ink || "#0B0B0C",
              border: "1px solid rgba(0,0,0,0.10)",
              opacity: busy ? 0.75 : 1,
            }}
            disabled={busy}
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
