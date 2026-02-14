import React, { useEffect, useMemo, useState } from "react";
import { X, Tag, Plus } from "lucide-react";

export default function NewProjectModal({ open, onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [tagText, setTagText] = useState("");

  // reset when opened
  useEffect(() => {
    if (open) {
      setTitle("");
      setTagText("");
    }
  }, [open]);

  const tags = useMemo(() => {
    return tagText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 8);
  }, [tagText]);

  const canCreate = title.trim().length >= 2;

  const submit = () => {
    if (!canCreate) return;
    onCreate({ title: title.trim(), tags });
  };

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter") submit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, title, tagText]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <button
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close modal"
      />

      {/* Sheet */}
      <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center">
        <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-200 animate-in slide-in-from-bottom-6 duration-200">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-gray-400">
                Create
              </p>
              <h2 className="text-xl font-black uppercase tracking-tight">New Project</h2>
            </div>

            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center active:scale-95 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-5 py-5 space-y-4">
            <div>
              <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
                Project Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Emily - Bridal Hem"
                className="mt-2 w-full bg-gray-100 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black"
                autoFocus
              />
              <p className="mt-1 text-[11px] text-gray-400">
                Tip: client name + garment type works best.
              </p>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase tracking-widest text-gray-500 flex items-center gap-2">
                <Tag className="w-3 h-3" /> Tags (comma separated)
              </label>
              <input
                value={tagText}
                onChange={(e) => setTagText(e.target.value)}
                placeholder="bridal, lace, rush"
                className="mt-2 w-full bg-gray-100 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black"
              />

              {tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] font-mono bg-white border border-gray-200 px-2 py-1 rounded text-gray-600"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="px-5 pb-6">
            <button
              onClick={submit}
              disabled={!canCreate}
              className={`w-full py-4 rounded-xl font-black flex items-center justify-center gap-2 transition active:scale-[0.99]
                ${
                  canCreate
                    ? "bg-black text-white hover:bg-gray-900"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
            >
              <Plus className="w-5 h-5" />
              Create Project
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

