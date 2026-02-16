// /src/features/media/NotesPanel.jsx
import React, { useMemo } from "react";
import { StickyNote, MapPin, Pencil, Edit3 } from "lucide-react";

/**
 * NotesPanel
 * - Pure UI for the bottom panel in Media view.
 * - No Firebase / no context calls inside.
 *
 * Props:
 * - hotspots: array of pins on the photo
 * - selectedPinId / setSelectedPinId: controls which pin is "active" for preview
 * - isAddPinMode / onToggleAddPin: controls pin drop mode
 * - onEditPin: (hotspot) => void
 *
 * Optional:
 * - headerFont, palette
 */
export default function NotesPanel({
  hotspots = [],
  selectedPinId,
  setSelectedPinId,
  isAddPinMode,
  onToggleAddPin,
  onEditPin,
  headerFont,
  palette,
}) {
  const safeHotspots = Array.isArray(hotspots) ? hotspots : [];

  const selectedPin = useMemo(() => {
    if (!safeHotspots.length) return null;
    const found = selectedPinId ? safeHotspots.find((h) => h.id === selectedPinId) : null;
    return found || safeHotspots[0] || null;
  }, [safeHotspots, selectedPinId]);

  const selectedIndex = useMemo(() => {
    if (!selectedPin?.id) return 0;
    const idx = safeHotspots.findIndex((h) => h.id === selectedPin.id);
    return Math.max(0, idx);
  }, [safeHotspots, selectedPin?.id]);

  return (
    <div
      className="w-full px-4 pb-4 sm:px-6"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,254,250,0.00) 0%, rgba(255,254,250,0.65) 22%, rgba(255,254,250,0.92) 100%)",
      }}
    >
      <div
        className="mx-auto max-w-6xl rounded-[14px] overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.82)",
          border: "1px solid rgba(0,0,0,0.10)",
          backdropFilter: "blur(18px)",
          boxShadow: "0 22px 60px -52px rgba(0,0,0,0.55)",
        }}
      >
        {/* Panel header row */}
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}
        >
          <div className="flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-black/60" />
            <div className="text-sm font-semibold" style={{ fontFamily: headerFont }}>
              Notes
            </div>
          </div>

          <button
            onClick={onToggleAddPin}
            className="h-9 px-3 rounded-[8px] inline-flex items-center gap-2 transition-transform duration-200 ease-out active:scale-[0.98]"
            style={{
              background: isAddPinMode ? palette?.sun : "rgba(255,255,255,0.70)",
              color: palette?.ink || "#0B0B0C",
              border: "1px solid rgba(0,0,0,0.10)",
            }}
            aria-label="Add pin"
            title="Add pin"
          >
            <MapPin className="w-4 h-4" />
            <span className="text-xs font-semibold">{isAddPinMode ? "Cancel" : "Add Pin"}</span>
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Photo notes (placeholder) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-black/45">
                Photo notes
              </div>
              <button
                onClick={() => alert("Wire per-photo notes later.")}
                className="w-9 h-9 rounded-[8px] inline-flex items-center justify-center"
                style={{
                  background: "rgba(255,255,255,0.70)",
                  border: "1px solid rgba(0,0,0,0.10)",
                }}
                title="Add note"
                aria-label="Add note"
              >
                <Edit3 className="w-4 h-4 text-black/60" />
              </button>
            </div>

            <div
              className="text-sm text-black/70 leading-relaxed"
              style={{
                background: "rgba(255,255,255,0.58)",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 8,
                padding: 12,
              }}
            >
              No photo notes yet.
            </div>
          </div>

          {/* Pins */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-black/45">
                Pins
              </div>
              <div className="text-[11px] text-black/45">
                {safeHotspots.length ? `${safeHotspots.length} total` : "None"}
              </div>
            </div>

            {safeHotspots.length === 0 ? (
              <div
                className="text-sm text-black/60"
                style={{
                  background: "rgba(255,255,255,0.58)",
                  border: "1px dashed rgba(0,0,0,0.18)",
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                No pins yet. Tap <b>Add Pin</b>, then tap the photo.
              </div>
            ) : (
              <>
                {/* Selected pin preview */}
                <div
                  className="mb-3"
                  style={{
                    background: "rgba(255,255,255,0.58)",
                    border: "1px solid rgba(0,0,0,0.08)",
                    borderRadius: 8,
                    padding: 12,
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full grid place-items-center text-xs font-bold"
                          style={{
                            background: palette?.sun,
                            color: palette?.ink || "#0B0B0C",
                            border: "1px solid rgba(0,0,0,0.12)",
                          }}
                        >
                          {selectedIndex + 1}
                        </div>
                        <div className="text-sm font-semibold truncate" style={{ fontFamily: headerFont }}>
                          {selectedPin?.label?.trim() ? selectedPin.label : "Untitled pin"}
                        </div>
                      </div>

                      <div className="mt-2 text-sm text-black/70 leading-relaxed">
                        {selectedPin?.note?.trim()
                          ? selectedPin.note
                          : "No note yet. Hit Edit to add one."}
                      </div>
                    </div>

                    <button
                      onClick={() => selectedPin && onEditPin?.(selectedPin)}
                      className="h-9 px-3 rounded-[8px] inline-flex items-center gap-2"
                      style={{
                        background: "rgba(255,255,255,0.70)",
                        border: "1px solid rgba(0,0,0,0.10)",
                        color: palette?.ink || "#0B0B0C",
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                      <span className="text-xs font-semibold">Edit</span>
                    </button>
                  </div>
                </div>

                {/* Quick pin list */}
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {safeHotspots.map((h, i) => {
                    const active = h.id === selectedPin?.id;
                    return (
                      <button
                        key={h.id}
                        onClick={() => setSelectedPinId?.(h.id)}
                        className="shrink-0 h-9 px-3 rounded-[999px] text-xs font-semibold transition-colors duration-200 ease-out"
                        style={{
                          background: active ? palette?.sky : "rgba(255,255,255,0.65)",
                          color: active ? "#fff" : "rgba(0,0,0,0.70)",
                          border: "1px solid rgba(0,0,0,0.10)",
                        }}
                      >
                        #{i + 1}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
