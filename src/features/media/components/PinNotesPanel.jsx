import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Plus, X } from "lucide-react";
import SessionStrip from "./SessionStrip";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function safeText(v) {
  return (v == null ? "" : String(v)).trim();
}

/**
 * Photo work surface
 * - Notes: general notes for the whole photo (optional)
 * - Annotations: optional markers (hotspots) on the photo
 *   - UI stays tucked until at least one annotation exists
 *   - Adding an annotation is done via a small + Add menu
 */
export default function PinNotesPanel({
  headerFont,
  palette,

  projectId,

  hotspots = [],
  selectedPin,
  setSelectedPinId,

  isAddPinMode,
  toggleAddPinMode,

  openPinEditor,
  onUpdateMediaNote,

  media,
  moreFromSession,
  onSelectMedia,
}) {
  const accent = palette?.accent || "rgba(255,77,46,0.95)";
  const line = palette?.line || "rgba(0,0,0,0.08)";

  // ---- General Notes (per-photo) ----
  const initialNote = useMemo(() => {
    return safeText(media?.note || media?.notes || media?.caption || "");
  }, [media?.note, media?.notes, media?.caption]);

  const [note, setNote] = useState(initialNote);
  const [noteDirty, setNoteDirty] = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    setNote(initialNote);
    setNoteDirty(false);
  }, [initialNote, media?.id]);

  const scheduleSave = (next) => {
    if (!onUpdateMediaNote || !media?.id) return;
    setNoteDirty(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await onUpdateMediaNote?.(projectId, media?.sessionId, media?.id, next);
      } catch (e) {
        console.error("Failed to save media note", e);
      } finally {
        setNoteDirty(false);
      }
    }, 450);
  };

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  // ---- Annotations (hotspots) ----
  const hasAnyAnnotations = Array.isArray(hotspots) && hotspots.length > 0;

  const annotationNotes = useMemo(() => {
    const list = (hotspots || []).map((h, idx) => {
      const text = safeText(h?.note || h?.label || "");
      return { ...h, _index: idx + 1, _text: text };
    });
    return {
      all: list,
      withText: list.filter((a) => a._text),
    };
  }, [hotspots]);

  const [showAnnotationsPanel, setShowAnnotationsPanel] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addWrapRef = useRef(null);

  useEffect(() => {
    if (!addMenuOpen) return;
    const onDown = (e) => {
      const root = addWrapRef.current;
      const target = e.target;
      if (!root || !target) return;
      if (!root.contains(target)) setAddMenuOpen(false);
    };
    window.addEventListener("pointerdown", onDown, { capture: true });
    return () => window.removeEventListener("pointerdown", onDown, { capture: true });
  }, [addMenuOpen]);

  useEffect(() => {
    // If user is in “tap to place” mode, keep the annotations panel closed.
    if (isAddPinMode) setShowAnnotationsPanel(false);
  }, [isAddPinMode]);

  useEffect(() => {
    // Close tucked panel if annotations disappear (edge case)
    if (!hasAnyAnnotations) setShowAnnotationsPanel(false);
  }, [hasAnyAnnotations]);

  return (
    <div className="px-5 pt-4 pb-8">
      {/* Header row: Notes + small Add */}
      <div className="flex items-center justify-between">
        <div
          className="text-[12px] font-semibold tracking-[0.18em]"
          style={{ color: "rgba(0,0,0,0.62)", fontFamily: headerFont }}
        >
          NOTES
        </div>

        <div className="relative" ref={addWrapRef}>
          <button
            onClick={() => setAddMenuOpen((v) => !v)}
            className="inline-flex items-center gap-2 text-[12px] font-semibold tracking-[0.12em]"
            style={{ color: accent, WebkitTapHighlightColor: "transparent" }}
            aria-label="Add"
          >
            <Plus className="w-4 h-4" />
            ADD
          </button>

          {/* Add menu */}
          {addMenuOpen && (
            <div className="absolute right-0 mt-2 w-[210px]" style={{ zIndex: 50 }}>
              <div
                className="p-1"
                style={{
                  background: "rgba(255,255,255,0.92)",
                  border: `1px solid ${line}`,
                  borderRadius: 8,
                  boxShadow: "0 18px 36px -28px rgba(0,0,0,0.35)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <button
                  onClick={() => {
                    setAddMenuOpen(false);
                    if (!isAddPinMode) toggleAddPinMode?.();
                  }}
                  className="w-full text-left px-3 py-2 text-[13px] font-semibold"
                  style={{ color: "rgba(0,0,0,0.78)" }}
                >
                  Add annotation
                  <div className="text-[11px] mt-0.5" style={{ color: "rgba(0,0,0,0.45)" }}>
                    Optional — tap the photo to place it
                  </div>
                </button>

                <div style={{ height: 1, background: "rgba(0,0,0,0.06)" }} />

                <button
                  onClick={() => {
                    setAddMenuOpen(false);
                    document.getElementById("index-photo-notes")?.focus?.();
                  }}
                  className="w-full text-left px-3 py-2 text-[13px] font-semibold"
                  style={{ color: "rgba(0,0,0,0.78)" }}
                >
                  Add note
                  <div className="text-[11px] mt-0.5" style={{ color: "rgba(0,0,0,0.45)" }}>
                    General notes for the whole photo
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notes box */}
      <div
        className="mt-3"
        style={{
          borderRadius: 8,
          border: `1px solid ${line}`,
          background: "rgba(255,255,255,0.78)",
        }}
      >
        <textarea
          id="index-photo-notes"
          value={note}
          onChange={(e) => {
            const next = e.target.value;
            setNote(next);
            scheduleSave(next);
          }}
          rows={note ? 3 : 2}
          placeholder="Add general notes for this photo (optional)…"
          className="w-full bg-transparent outline-none resize-none px-3 py-3 text-[13px] leading-relaxed"
          style={{ color: "rgba(0,0,0,0.78)" }}
        />

        {/* Helper line */}
        <div className="px-3 pb-3 text-[11px]" style={{ color: "rgba(0,0,0,0.40)" }}>
          {noteDirty ? "Saving…" : "Optional — you can keep notes without annotations."}
        </div>
      </div>

      {/* Annotation placement hint (only when in add mode) */}
      {isAddPinMode && (
        <div
          className="mt-3 flex items-center justify-between"
          style={{
            borderRadius: 8,
            border: `1px solid ${line}`,
            background: "rgba(0,0,0,0.03)",
            padding: "10px 12px",
          }}
        >
          <div className="text-[12px] font-semibold" style={{ color: "rgba(0,0,0,0.72)" }}>
            Tap anywhere on the photo to place an annotation.
          </div>
          <button
            onClick={() => toggleAddPinMode?.()}
            className="w-9 h-9 grid place-items-center"
            style={{
              borderRadius: 8,
              border: `1px solid ${line}`,
              background: "rgba(255,255,255,0.85)",
            }}
            aria-label="Cancel"
            title="Cancel"
          >
            <X className="w-4 h-4" style={{ color: "rgba(0,0,0,0.55)" }} />
          </button>
        </div>
      )}

      {/* Tucked Annotations row (appears only if there are annotations) */}
      {hasAnyAnnotations && !isAddPinMode && (
        <div className="mt-5">
          <button
            onClick={() => setShowAnnotationsPanel((v) => !v)}
            className="w-full flex items-center justify-between"
            style={{ WebkitTapHighlightColor: "transparent" }}
            aria-label="Toggle annotations"
          >
            <div
              className="text-[12px] font-semibold tracking-[0.18em]"
              style={{ color: "rgba(0,0,0,0.62)", fontFamily: headerFont }}
            >
              ANNOTATIONS · {hotspots.length}
            </div>
            <div className="text-[12px] font-semibold" style={{ color: "rgba(0,0,0,0.55)" }}>
              {showAnnotationsPanel ? "HIDE" : "SHOW"}
            </div>
          </button>

          {/* chips */}
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {annotationNotes.all.map((a) => {
              const active = a.id === selectedPin?.id;
              return (
                <button
                  key={a.id}
                  onClick={() => {
                    setShowAnnotationsPanel(true);
                    setSelectedPinId?.(a.id);
                  }}
                  className={cx(
                    "shrink-0 h-8 px-3 rounded-[8px] text-[12px] font-semibold transition-colors duration-200 ease-out"
                  )}
                  style={{
                    background: active ? (palette?.sun || "#FFEA3A") : "rgba(255,255,255,0.75)",
                    color: "rgba(0,0,0,0.78)",
                    border: `1px solid ${line}`,
                  }}
                  aria-label={`Annotation ${a._index}`}
                >
                  {a._index}
                </button>
              );
            })}
          </div>

          {/* Panel (tucked details) */}
          {showAnnotationsPanel && (
            <div className="mt-3 space-y-2">
              {annotationNotes.withText.length === 0 ? (
                <div className="text-[13px]" style={{ color: "rgba(0,0,0,0.55)" }}>
                  Annotations are optional — add a note to any marker if you want.
                </div>
              ) : (
                annotationNotes.all.map((a) => {
                  const isSelected = a.id === selectedPin?.id;

                  return (
                    <div
                      key={a.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedPinId?.(a.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedPinId?.(a.id);
                        }
                      }}
                      className="w-full flex items-start gap-3 text-left cursor-pointer select-none"
                      style={{ WebkitTapHighlightColor: "transparent" }}
                      aria-label={`Annotation ${a._index}`}
                    >
                      <div
                        className="mt-[2px] w-6 h-6 rounded-full grid place-items-center text-[12px] font-semibold"
                        style={{
                          background: "rgba(255,255,255,0.95)",
                          border: isSelected
                            ? `2px solid ${palette?.sun || "#FFEA3A"}`
                            : `1px solid ${line}`,
                          color: "rgba(0,0,0,0.70)",
                        }}
                      >
                        {a._index}
                      </div>

                      <div className="flex-1 text-[13px] leading-relaxed" style={{ color: "rgba(0,0,0,0.75)" }}>
                        {a._text ? (
                          a._text
                        ) : (
                          <span style={{ color: "rgba(0,0,0,0.35)" }}>No annotation note.</span>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openPinEditor?.(a);
                        }}
                        className="mt-[1px] w-8 h-8 rounded-[8px] grid place-items-center"
                        style={{
                          border: `1px solid ${line}`,
                          background: "rgba(255,255,255,0.9)",
                        }}
                        aria-label="Edit annotation"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" style={{ color: "rgba(0,0,0,0.55)" }} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* Session strip */}
      <SessionStrip
        headerFont={headerFont}
        media={media}
        moreFromSession={moreFromSession}
        onSelectMedia={onSelectMedia}
      />
    </div>
  );
}