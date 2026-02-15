import React, { useMemo, useRef, useState } from "react";

export default function MediaAnnotator({
  media,
  onAddHotspot,
  onSelectHotspot,
  pinMode,
}) {
  const wrapRef = useRef(null);
  const [draftXY, setDraftXY] = useState(null); // {x,y} in 0..1

  const hotspots = useMemo(() => media?.hotspots || [], [media]);

  const handleClick = (e) => {
    if (!pinMode) return;
    if (!wrapRef.current) return;

    const rect = wrapRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    // clamp
    const x = Math.min(0.98, Math.max(0.02, px));
    const y = Math.min(0.98, Math.max(0.02, py));

    setDraftXY({ x, y });
  };

  const confirmDraft = async () => {
    if (!draftXY) return;
    const note = window.prompt("Pin note?");
    if (!note?.trim()) {
      setDraftXY(null);
      return;
    }
    await onAddHotspot(draftXY.x, draftXY.y, note.trim());
    setDraftXY(null);
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <div
        ref={wrapRef}
        onClick={handleClick}
        className={`relative max-w-full max-h-full ${pinMode ? "cursor-crosshair" : ""}`}
        style={{
          // keeps taps consistent, prevents weird double-tap behaviors
          touchAction: pinMode ? "none" : "pan-x pan-y",
        }}
      >
        <img
          src={media.url}
          alt=""
          className="block max-w-[100vw] max-h-[75vh] object-contain select-none"
          draggable={false}
        />

        {/* Existing pins */}
        {hotspots.map((h, idx) => (
          <button
            key={h.id || idx}
            onClick={(ev) => {
              ev.stopPropagation();
              onSelectHotspot?.(h);
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${h.x * 100}%`, top: `${h.y * 100}%` }}
            title={h.note}
          >
            <div className="w-6 h-6 rounded-full bg-white text-black font-black text-[12px] flex items-center justify-center shadow-lg">
              {idx + 1}
            </div>
          </button>
        ))}

        {/* Draft pin */}
        {draftXY && (
          <button
            onClick={(ev) => {
              ev.stopPropagation();
              confirmDraft();
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${draftXY.x * 100}%`, top: `${draftXY.y * 100}%` }}
            title="Tap to save"
          >
            <div className="w-7 h-7 rounded-full bg-yellow-300 text-black font-black text-[12px] flex items-center justify-center shadow-lg animate-pulse">
              +
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
