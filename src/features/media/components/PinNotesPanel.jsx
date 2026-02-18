import React, { useMemo } from "react";
import { Pencil } from "lucide-react";
import SessionStrip from "./SessionStrip";

export default function PinNotesPanel({
  headerFont,
  palette,

  hotspots = [],
  selectedPin,
  setSelectedPinId,

  isAddPinMode,
  toggleAddPinMode,

  openPinEditor,

  // session strip
  media,
  moreFromSession,
  onSelectMedia,
}) {
  // show only pins that have at least label/note text
  const pinNotes = useMemo(() => {
    return hotspots
      .map((h, idx) => {
        const text = (h.note || h.label || "").trim();
        return { ...h, _index: idx + 1, _text: text };
      })
      .filter((p) => p._text);
  }, [hotspots]);

  return (
    <div className="px-5 pt-4 pb-8">
      <div className="flex items-center justify-between">
        <div className="text-[12px] font-semibold tracking-[0.18em] text-black/70">
          PIN NOTES
        </div>

        <button
          onClick={toggleAddPinMode}
          className="text-[12px] font-semibold tracking-[0.12em]"
          style={{ color: isAddPinMode ? "rgba(0,0,0,0.65)" : palette?.accent || "#FF4D2E" }}
          aria-label="Add pin"
        >
          {isAddPinMode ? "CANCEL" : "ADD PIN"}
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {pinNotes.length === 0 ? (
          <div className="text-[13px] text-black/55">No pin notes yet.</div>
        ) : (
          pinNotes.map((p) => {
            const isSelected = p.id === selectedPin?.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPinId?.(p.id)}
                className="w-full flex items-start gap-3 text-left"
                style={{ WebkitTapHighlightColor: "transparent" }}
                aria-label={`Pin ${p._index}`}
              >
                <div
                  className="mt-[2px] w-6 h-6 rounded-full grid place-items-center text-[12px] font-semibold"
                  style={{
                    background: "rgba(255,255,255,0.95)",
                    border: isSelected
                      ? `2px solid ${palette?.sun || "#FFEA3A"}`
                      : "1px solid rgba(0,0,0,0.18)",
                    color: "rgba(0,0,0,0.70)",
                  }}
                >
                  {p._index}
                </div>

                <div className="flex-1 text-[13px] leading-relaxed text-black/75">
                  {p._text}
                </div>

                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openPinEditor?.(p);
                  }}
                  className="mt-[1px] w-8 h-8 rounded-full grid place-items-center"
                  style={{
                    border: "1px solid rgba(0,0,0,0.10)",
                    background: "rgba(255,255,255,0.9)",
                  }}
                  aria-label="Edit pin"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4 text-black/55" />
                </button>
              </button>
            );
          })
        )}
      </div>

      <SessionStrip
        headerFont={headerFont}
        media={media}
        moreFromSession={moreFromSession}
        onSelectMedia={onSelectMedia}
      />
    </div>
  );
}
