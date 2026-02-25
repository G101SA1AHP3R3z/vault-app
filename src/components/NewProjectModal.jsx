import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, Menu, MoreHorizontal, Plus } from "lucide-react";

export default function NewProjectModal({ open, onClose, onCreate }) {
  const fontSerif = "Literata, serif";
  const fontSans =
    "Raleway, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial";

  const [title, setTitle] = useState("");
  const [weddingDate, setWeddingDate] = useState(""); // YYYY-MM-DD
  const [notesOpen, setNotesOpen] = useState(false);
  const [note, setNote] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const titleRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTitle("");
      setWeddingDate("");
      setNotesOpen(false);
      setNote("");
      setIsSubmitting(false);

      setTimeout(() => titleRef.current?.focus?.(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const line = "rgba(0,0,0,0.10)";

  const submit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onCreate?.({
        title: (title || "Untitled").trim(),
        note: note.trim(),
        weddingDate: weddingDate || null,
        // optional: caller can interpret this as “create + immediately start first session”
        startNewSession: true,
      });
    } finally {
      setTimeout(() => setIsSubmitting(false), 250);
    }
  };

  return (
    <div className="fixed inset-0 z-[120]" style={{ background: "#FFFEFA" }}>
      {/* Top bar */}
      <div className="px-6 pt-6 flex items-center justify-between">
        <div
          className="text-[14px] tracking-[0.06em]"
          style={{ color: "rgba(0,0,0,0.70)", fontFamily: fontSans }}
        >
          [ Index ]
        </div>

        {/* Keep the icon for vibe — it can just close for now */}
        <button
          onClick={() => onClose?.()}
          className="w-10 h-10 rounded-full inline-flex items-center justify-center"
          style={{
            background: "rgba(255,255,255,0.92)",
            border: `1px solid ${line}`,
            color: "rgba(0,0,0,0.75)",
            WebkitTapHighlightColor: "transparent",
          }}
          aria-label="Close"
          title="Close"
          disabled={isSubmitting}
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="px-6 pb-28">
        {/* Back + kebab */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => onClose?.()}
            className="inline-flex items-center gap-2 text-[12px] font-medium"
            style={{
              color: "rgba(0,0,0,0.45)",
              fontFamily: fontSans,
              WebkitTapHighlightColor: "transparent",
            }}
            disabled={isSubmitting}
          >
            <span
              className="w-6 h-6 rounded-full inline-flex items-center justify-center"
              style={{
                border: `1px solid ${line}`,
                background: "rgba(255,255,255,0.85)",
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </span>
            All Projects
          </button>

          <button
            className="w-9 h-9 rounded-full inline-flex items-center justify-center"
            style={{
              background: "rgba(255,255,255,0.92)",
              border: `1px solid ${line}`,
              color: "rgba(0,0,0,0.75)",
              opacity: 0.55,
              cursor: "default",
            }}
            aria-label="More"
            title="More"
            onClick={(e) => e.preventDefault()}
            disabled
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Title */}
        <div className="mt-6">
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="UNTITLED"
            className="w-full bg-transparent outline-none uppercase"
            style={{
              fontFamily: fontSerif,
              fontSize: 38,
              lineHeight: 1.05,
              letterSpacing: "0.06em",
              color: "rgba(0,0,0,0.88)",
              fontWeight: 500,
            }}
            disabled={isSubmitting}
          />
        </div>

        {/* Wedding date */}
        <div className="mt-7">
          <div
            className="text-[11px] font-semibold tracking-[0.18em] uppercase"
            style={{ color: "rgba(0,0,0,0.45)", fontFamily: fontSans }}
          >
            WEDDING DATE
          </div>

          <div className="mt-2">
            <input
              type="date"
              value={weddingDate}
              onChange={(e) => setWeddingDate(e.target.value)}
              className="h-7 px-2 rounded-[6px] outline-none"
              style={{
                fontFamily: fontSans,
                fontSize: 12,
                color: weddingDate ? "rgba(0,0,0,0.70)" : "rgba(0,0,0,0.45)",
                background: "rgba(0,0,0,0.05)",
                border: `1px solid rgba(0,0,0,0.06)`,
                width: 120,
              }}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Consult Call Notes (collapsed -> expands) */}
        <div className="mt-7">
          {!notesOpen ? (
            <button
              onClick={() => setNotesOpen(true)}
              className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] uppercase"
              style={{
                color: "rgba(0,0,0,0.55)",
                fontFamily: fontSans,
                WebkitTapHighlightColor: "transparent",
              }}
              disabled={isSubmitting}
            >
              <Plus className="w-4 h-4" />
              ADD CONSULT CALL NOTES
            </button>
          ) : (
            <>
              <div
                className="text-[11px] font-semibold tracking-[0.18em] uppercase"
                style={{ color: "rgba(0,0,0,0.45)", fontFamily: fontSans }}
              >
                CONSULT CALL NOTES
              </div>
              <div
                className="mt-3"
                style={{
                  borderRadius: 10,
                  border: `1px solid ${line}`,
                  background: "rgba(255,255,255,0.80)",
                }}
              >
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-transparent outline-none text-[13px]"
                  rows={4}
                  placeholder="Add a note."
                  style={{
                    color: "rgba(0,0,0,0.80)",
                    padding: 14,
                    resize: "none",
                    fontFamily: fontSans,
                  }}
                  disabled={isSubmitting}
                />
              </div>

              <button
                onClick={() => setNotesOpen(false)}
                className="mt-3 text-[11px] font-semibold tracking-[0.18em] uppercase"
                style={{
                  color: "rgba(0,0,0,0.45)",
                  fontFamily: fontSans,
                  WebkitTapHighlightColor: "transparent",
                }}
                disabled={isSubmitting}
              >
                HIDE NOTES
              </button>
            </>
          )}
        </div>

        {/* Sessions */}
        <div className="mt-8">
          <div
            className="text-[11px] font-semibold tracking-[0.18em] uppercase"
            style={{ color: "rgba(0,0,0,0.45)", fontFamily: fontSans }}
          >
            SESSIONS
          </div>

          <button
            onClick={submit}
            disabled={isSubmitting}
            className="mt-4 inline-flex items-center gap-2 px-4 h-11 text-[12px] font-semibold tracking-[0.12em] uppercase"
            style={{
              borderRadius: 10,
              border: `1px solid ${line}`,
              color: "rgba(0,0,0,0.78)",
              background: "rgba(255,255,255,0.75)",
              fontFamily: fontSans,
              WebkitTapHighlightColor: "transparent",
              opacity: isSubmitting ? 0.6 : 1,
            }}
          >
            <Plus className="w-4 h-4" />
            {isSubmitting ? "STARTING…" : "START A NEW SESSION"}
          </button>
        </div>
      </div>
    </div>
  );
}