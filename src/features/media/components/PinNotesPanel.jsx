import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";

function safeText(v) {
  return (v == null ? "" : String(v)).trim();
}

export default function PinNotesPanel({
  headerFont,
  palette,
  projectId,

  media,
  hotspots = [],
  selectedPin,
  setSelectedPinId,

  isAddPinMode,
  toggleAddPinMode,

  openPinEditor,
  onUpdateMediaNote,
  onDeleteHotspot,

  // optional
  moreFromSession,
  onSelectMedia,
}) {
  const fontSans = "var(--font-sans)";
  const line = "rgba(0,0,0,0.10)";
  const hair = "rgba(0,0,0,0.06)";
  const danger = palette?.danger || "rgba(255,77,46,0.92)";

  const initialNote = useMemo(() => {
    // support multiple legacy fields
    return safeText(media?.generalNote || media?.note || media?.notes || media?.caption || "");
  }, [media?.generalNote, media?.note, media?.notes, media?.caption, media?.id]);

  const [note, setNote] = useState(initialNote);
  const [dirty, setDirty] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    setNote(initialNote);
    setDirty(false);
  }, [initialNote, media?.id]);

  const scheduleSave = (next) => {
    if (!onUpdateMediaNote || !media?.id) return;
    setDirty(true);
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        await onUpdateMediaNote?.(projectId, media?.sessionId, media?.id, next);
      } catch (e) {
        console.error("Failed to save media note", e);
      } finally {
        setDirty(false);
      }
    }, 520);
  };

  useEffect(() => {
    return () => timerRef.current && clearTimeout(timerRef.current);
  }, []);

  const annotations = useMemo(() => {
    const list = (Array.isArray(hotspots) ? hotspots : []).map((h, idx) => ({
      ...h,
      _index: idx + 1,
      _text: safeText(h?.note || h?.label || ""),
    }));
    return list;
  }, [hotspots]);

  const selected = useMemo(() => {
    if (!selectedPin?.id) return null;
    return annotations.find((a) => a.id === selectedPin.id) || null;
  }, [selectedPin?.id, annotations]);

  const hasPins = annotations.length > 0;

  return (
    <div className="px-5 pt-4 pb-8">
      {/* GENERAL NOTES */}
      <div className="label-caps">General notes</div>

      <div
        className="mt-3"
        style={{
          borderRadius: 14,
          border: `1px solid ${hair}`,
          background: "rgba(255,255,255,0.78)",
        }}
      >
        <textarea
          value={note}
          onChange={(e) => {
            const next = e.target.value;
            setNote(next);
            scheduleSave(next);
          }}
          onBlur={() => {
            // flush-ish
            if (onUpdateMediaNote && media?.id) {
              scheduleSave(note);
            }
          }}
          rows={note ? 4 : 3}
          placeholder="Optional — add a general note for this photo."
          className="w-full bg-transparent outline-none resize-none text-[13px]"
          style={{
            color: "rgba(0,0,0,0.78)",
            padding: 14,
            lineHeight: 1.55,
            fontFamily: fontSans,
          }}
        />

        <div className="px-4 pb-3 text-[11px]" style={{ color: "rgba(0,0,0,0.38)", fontFamily: fontSans }}>
          {dirty ? "Saving…" : "You can keep notes without annotations."}
        </div>
      </div>

      {/* ANNOTATIONS HEADER */}
      <div className="mt-7 flex items-center justify-between">
        <div className="label-caps">Annotations {hasPins ? `· ${annotations.length}` : ""}</div>

        {!isAddPinMode ? (
          <button
            onClick={() => {
              toggleAddPinMode?.();
              setSelectedPinId?.(null);
            }}
            className="h-9 px-3 rounded-[999px] inline-flex items-center gap-2 active:scale-[0.99] transition-transform"
            style={{
              background: "rgba(255,255,255,0.76)",
              border: `1px solid ${line}`,
              color: "rgba(0,0,0,0.70)",
              WebkitTapHighlightColor: "transparent",
              fontFamily: fontSans,
            }}
            aria-label="Add annotation"
            title="Add annotation"
          >
            <Plus className="w-4 h-4" />
            <span className="text-[12px] font-semibold uppercase" style={{ letterSpacing: "0.16em" }}>
              Add
            </span>
          </button>
        ) : (
          <button
            onClick={() => toggleAddPinMode?.()}
            className="w-10 h-10 grid place-items-center rounded-[12px] active:scale-[0.98] transition-transform"
            style={{
              background: "rgba(255,255,255,0.76)",
              border: `1px solid ${line}`,
              WebkitTapHighlightColor: "transparent",
            }}
            aria-label="Cancel add annotation"
            title="Cancel"
          >
            <X className="w-5 h-5" style={{ color: "rgba(0,0,0,0.70)" }} />
          </button>
        )}
      </div>

      {/* Add mode hint */}
      {isAddPinMode ? (
        <div
          className="mt-3"
          style={{
            borderRadius: 14,
            border: `1px solid ${hair}`,
            background: "rgba(0,0,0,0.03)",
            padding: "12px 14px",
            color: "rgba(0,0,0,0.70)",
            fontFamily: fontSans,
            fontSize: 13,
            lineHeight: 1.45,
          }}
        >
          Tap anywhere on the photo to place an annotation. (Optional)
        </div>
      ) : null}

      {/* Pins list */}
      {!hasPins ? (
        <div className="mt-3 text-[13px]" style={{ color: "rgba(0,0,0,0.45)", fontFamily: fontSans }}>
          No annotations yet.
        </div>
      ) : (
        <>
          {/* quick chips */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            <style>{`.hide-scroll::-webkit-scrollbar{ display:none; }`}</style>
            <div className="flex gap-2 hide-scroll">
              {annotations.map((a) => {
                const active = a.id === selectedPin?.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => setSelectedPinId?.(a.id)}
                    className="shrink-0 h-9 px-3 rounded-[999px] text-[12px] font-semibold transition-colors"
                    style={{
                      background: active ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.78)",
                      color: "rgba(0,0,0,0.72)",
                      border: `1px solid ${active ? "rgba(0,0,0,0.18)" : hair}`,
                      WebkitTapHighlightColor: "transparent",
                      fontFamily: fontSans,
                      letterSpacing: "0.10em",
                    }}
                    aria-label={`Annotation ${a._index}`}
                    title={`Annotation ${a._index}`}
                  >
                    #{a._index}
                  </button>
                );
              })}
            </div>
          </div>

          {/* selected detail */}
          {selected ? (
            <div
              className="mt-4"
              style={{
                borderRadius: 14,
                border: `1px solid ${hair}`,
                background: "rgba(255,255,255,0.78)",
                padding: 14,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div
                    className="text-[12px] font-semibold uppercase"
                    style={{ color: "rgba(0,0,0,0.45)", letterSpacing: "0.18em", fontFamily: fontSans }}
                  >
                    Annotation #{selected._index}
                  </div>

                  <div className="mt-2 text-[13px]" style={{ color: "rgba(0,0,0,0.78)", fontFamily: fontSans, lineHeight: 1.55 }}>
                    {selected._text ? (
                      selected._text
                    ) : (
                      <span style={{ color: "rgba(0,0,0,0.35)" }}>No note yet. (Optional)</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openPinEditor?.(selected)}
                    className="w-10 h-10 grid place-items-center rounded-[12px] active:scale-[0.98] transition-transform"
                    style={{
                      background: "rgba(255,255,255,0.82)",
                      border: `1px solid ${line}`,
                      WebkitTapHighlightColor: "transparent",
                    }}
                    aria-label="Edit annotation"
                    title="Edit"
                  >
                    <Pencil className="w-5 h-5" style={{ color: "rgba(0,0,0,0.70)" }} />
                  </button>

                  <button
                    onClick={() => {
                      if (!selected?.id) return;
                      const ok = window.confirm("Delete this annotation?");
                      if (!ok) return;
                      onDeleteHotspot?.(selected.id);
                      setSelectedPinId?.(null);
                    }}
                    className="w-10 h-10 grid place-items-center rounded-[12px] active:scale-[0.98] transition-transform"
                    style={{
                      background: "rgba(255,255,255,0.82)",
                      border: `1px solid ${line}`,
                      WebkitTapHighlightColor: "transparent",
                    }}
                    aria-label="Delete annotation"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" style={{ color: danger }} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-3 text-[13px]" style={{ color: "rgba(0,0,0,0.45)", fontFamily: fontSans }}>
              Select an annotation to view or edit its note.
            </div>
          )}
        </>
      )}

      {/* (Optional) future: session strip / related thumbnails
          Keep the props here so nothing breaks, but we won’t render it yet. */}
      {Array.isArray(moreFromSession) && moreFromSession.length > 0 && typeof onSelectMedia === "function" ? (
        <div className="mt-8" />
      ) : null}
    </div>
  );
}