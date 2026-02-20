import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Info, Share2, Trash2 } from "lucide-react";

import MediaStage from "./components/MediaStage";
import PinNotesPanel from "./components/PinNotesPanel";
import PinEditorModal from "../../components/PinEditorModal";

const EASE = "cubic-bezier(.22,.61,.36,1)";

function clamp01(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

export default function MediaViewer({
  mode = "modal", // "modal" | "embedded"
  project,
  media,
  headerFont,
  palette,

  moreFromSession = [],
  onSelectMedia,

  onBack,
  onDeleteMedia,

  // annotations (hotspots)
  onAddHotspot,
  onUpdateHotspot,
  onDeleteHotspot,

  // general photo notes
  onUpdateMediaNote,
}) {
  const isEmbedded = mode === "embedded";

  /**
   * iOS Photos-like states:
   * - immersive: black bg, no chrome
   * - controls: light bg, nav + filmstrip + bottom bar, NO photo shift/scale
   * - info: light bg, nav stays, filmstrip/bottom hidden, photo moves up + subtle scale, notes below
   */
  const [viewMode, setViewMode] = useState("immersive"); // "immersive" | "controls" | "info"

  const [isAddPinMode, setIsAddPinMode] = useState(false);
  const [selectedPinId, setSelectedPinId] = useState(null);

  const [pinOpen, setPinOpen] = useState(false);
  const [pinDraft, setPinDraft] = useState(null);

  const stageRef = useRef(null);

  const currentHotspots = useMemo(() => {
    return Array.isArray(media?.hotspots) ? media.hotspots : [];
  }, [media?.hotspots]);

  const selectedPin = useMemo(() => {
    if (!selectedPinId) return null;
    return currentHotspots.find((h) => h.id === selectedPinId) || null;
  }, [selectedPinId, currentHotspots]);

  // Reset per-media
  useEffect(() => {
    setViewMode("immersive");
    setSelectedPinId(null);
    setIsAddPinMode(false);
    setPinOpen(false);
    setPinDraft(null);
  }, [media?.id]);

  const bg = viewMode === "immersive" ? "#000000" : "#FFFEFA";

  // Photo layout rules:
  // - immersive: full height, no scale
  // - controls: full height, no scale (per your requirement)
  // - info: top half + subtle scale (Apple-like)
  const stageHeight = viewMode === "info" ? (isEmbedded ? "52vh" : "50vh") : "100vh";
  const stageScale = viewMode === "info" ? 0.975 : 1;

  const accent = palette?.accent || "rgba(255,77,46,0.95)";

  const getDisplayXY = (h) => {
    const x = clamp01(h?.x);
    const y = clamp01(h?.y);
    return { x, y };
  };

  const openPinEditor = (pin) => {
    if (!pin) return;
    setPinDraft(pin);
    setPinOpen(true);
  };

  const closePinEditor = () => {
    setPinOpen(false);
    setPinDraft(null);
  };

  const savePinEditor = async (nextText) => {
    if (!pinDraft?.id) return closePinEditor();
    try {
      await onUpdateHotspot?.(project?.id, media?.sessionId, media?.id, pinDraft.id, {
        note: nextText,
      });
    } catch (err) {
      console.error("Failed to update pin note", err);
    } finally {
      closePinEditor();
    }
  };

  const onClickToAddPin = async (e) => {
    if (viewMode !== "info") return;
    if (!isAddPinMode) return;
    if (!stageRef.current) return;

    const rect = stageRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    try {
      await onAddHotspot?.(project?.id, media?.sessionId, media?.id, {
        x: clamp01(x),
        y: clamp01(y),
      });
      setIsAddPinMode(false);
    } catch (err) {
      console.error("Failed to add hotspot", err);
    }
  };

  const handleShare = async () => {
    const url = media?.url;
    if (!url) return;

    try {
      if (navigator.share) {
        await navigator.share({ url, title: "Index" });
        return;
      }
    } catch {
      return; // cancelled
    }

    try {
      await navigator.clipboard?.writeText?.(url);
    } catch {
      window.prompt("Copy link:", url);
    }
  };

  const handleDelete = async () => {
    if (typeof onDeleteMedia !== "function") return;
    const ok = window.confirm("Delete this photo? This can’t be undone.");
    if (!ok) return;
    try {
      await onDeleteMedia();
    } catch (e) {
      console.error("Delete failed", e);
    }
  };

  // Tap anywhere toggles immersive <-> controls, but:
  // - never toggle while in info
  // - never toggle when a modal is open
  // - never toggle while add-pin is active (info only anyway)
  const handleStageTapToggle = () => {
    if (isEmbedded) return; // optional: keep embedded stable
    if (pinOpen) return;
    if (viewMode === "info") return;
    setViewMode((m) => (m === "immersive" ? "controls" : "immersive"));
  };

  // In viewer mode: ZERO pins.
  // In info mode: pins only show after user selects an annotation (and not while placing a new one).
  const showPins = viewMode === "info" && !!selectedPinId && !isAddPinMode;

  const filmstrip = useMemo(() => {
    const list = Array.isArray(moreFromSession) ? moreFromSession.filter((m) => m?.url) : [];
    return list;
  }, [moreFromSession]);

  const Outer = ({ children }) => {
    if (isEmbedded) return <div className="w-full relative">{children}</div>;
    return (
      <div className="fixed inset-0 z-[100]" style={{ background: bg, overscrollBehavior: "contain" }}>
        {children}
      </div>
    );
  };

  const showNav = !isEmbedded && (viewMode === "controls" || viewMode === "info");
  const showFilmstrip = !isEmbedded && viewMode === "controls";
  const showBottomBar = !isEmbedded && viewMode === "controls";

  return (
    <Outer>
      <div
        className={isEmbedded ? "w-full h-full relative" : "h-full w-full"}
        style={{
          background: bg,
          transition: `background 220ms ${EASE}`,
        }}
      >
        {/* NAV BAR (visible in controls + info) */}
        {showNav && (
          <div className="absolute top-0 left-0 right-0 z-[90] pointer-events-none">
            <div className="px-4 pt-4 flex items-center justify-between">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onBack?.();
                }}
                className="pointer-events-auto w-10 h-10 rounded-[10px] grid place-items-center"
                style={{
                  background: "rgba(255,255,255,0.92)",
                  border: "1px solid rgba(0,0,0,0.10)",
                }}
                aria-label="Back"
              >
                <ChevronLeft className="w-5 h-5" style={{ color: "rgba(0,0,0,0.82)" }} />
              </button>

              <div
                className="pointer-events-none text-[12px] font-semibold tracking-[0.14em]"
                style={{
                  fontFamily: headerFont,
                  color: "rgba(0,0,0,0.55)",
                }}
              >
                {project?.title || ""}
              </div>

              {viewMode === "info" ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewMode("controls");
                    setIsAddPinMode(false);
                    setSelectedPinId(null);
                  }}
                  className="pointer-events-auto px-3 h-10 rounded-[10px] text-[12px] font-semibold"
                  style={{
                    background: "rgba(255,255,255,0.92)",
                    border: "1px solid rgba(0,0,0,0.10)",
                    color: "rgba(0,0,0,0.78)",
                  }}
                >
                  Done
                </button>
              ) : (
                <div className="w-10 h-10" />
              )}
            </div>
          </div>
        )}

        {/* PHOTO STAGE (tap toggles immersive/controls) */}
        <div
          onClick={(e) => {
            // tapping UI should not toggle; UI stops propagation.
            // tapping on the photo area toggles immersive <-> controls
            if (viewMode !== "info") handleStageTapToggle();
          }}
          style={{
            height: stageHeight,
            transform: `scale(${stageScale})`,
            transformOrigin: "top center",
            transition:
              viewMode === "info"
                ? `transform 260ms ${EASE}, height 260ms ${EASE}`
                : "none",
          }}
        >
          <MediaStage
            isEmbedded={isEmbedded}
            stageHeight={stageHeight}
            stageRef={stageRef}
            trashRef={null}
            media={media}
            isAddPinMode={viewMode === "info" ? isAddPinMode : false}
            isFocusMode={false}
            onClickToAddPin={(e) => {
              // In info mode, clicking to add pin should not toggle view modes.
              e.stopPropagation();
              onClickToAddPin(e);
            }}
            hotspots={showPins ? currentHotspots : []}
            selectedPin={selectedPin}
            palette={palette}
            draggingPinId={null}
            isHoveringTrash={false}
            getDisplayXY={getDisplayXY}
            showPins={showPins}
            onPinPointerDown={(e, pin) => {
              // selecting an annotation should not toggle
              e.preventDefault();
              e.stopPropagation();
              setSelectedPinId(pin?.id || null);
            }}
          />
        </div>

        {/* FILMSTRIP (controls only) */}
        {showFilmstrip && filmstrip.length > 0 && (
          <div
            className="absolute left-0 right-0 bottom-[76px] z-[95]"
            style={{
              opacity: viewMode === "controls" ? 1 : 0,
              transition: `opacity 160ms ${EASE}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="px-4 pb-2 flex gap-2 overflow-x-auto hide-scrollbar"
              style={{
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "none",
              }}
            >
              {filmstrip.map((m) => {
                const active = m.id === media?.id;
                return (
                  <button
                    key={m.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectMedia?.(m);
                    }}
                    className="shrink-0"
                    style={{ WebkitTapHighlightColor: "transparent" }}
                    aria-label="Open photo"
                    title="Open photo"
                  >
                    <div
                      className="overflow-hidden"
                      style={{
                        width: 54,
                        height: 54,
                        borderRadius: 12,
                        border: active ? "2px solid rgba(0,0,0,0.82)" : "1px solid rgba(0,0,0,0.12)",
                        background: "rgba(0,0,0,0.04)",
                      }}
                    >
                      <img
                        src={m.thumbnailUrl || m.url}
                        alt=""
                        className="w-full h-full object-cover"
                        decoding="async"
                        draggable={false}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* BOTTOM BAR (controls only): share / info / delete */}
        {showBottomBar && (
          <div
            className="absolute left-0 right-0 bottom-0 z-[100] pb-5 flex justify-center"
            onClick={(e) => e.stopPropagation()}
            style={{
              opacity: viewMode === "controls" ? 1 : 0,
              transition: `opacity 160ms ${EASE}`,
            }}
          >
            <div
              className="h-12 px-5 rounded-[999px] flex items-center gap-7"
              style={{
                background: "rgba(255,255,255,0.92)",
                border: "1px solid rgba(0,0,0,0.10)",
                backdropFilter: "blur(14px)",
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleShare();
                }}
                className="w-9 h-9 grid place-items-center"
                aria-label="Share"
              >
                <Share2 className="w-5 h-5" style={{ color: "rgba(0,0,0,0.82)" }} />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setViewMode("info");
                  setIsAddPinMode(false);
                  setSelectedPinId(null);
                }}
                className="w-9 h-9 grid place-items-center"
                aria-label="Info"
              >
                <Info className="w-5 h-5" style={{ color: "rgba(0,0,0,0.82)" }} />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="w-9 h-9 grid place-items-center"
                aria-label="Delete"
              >
                <Trash2 className="w-5 h-5" style={{ color: "rgba(220,38,38,0.92)" }} />
              </button>
            </div>
          </div>
        )}

        {/* NOTES / INFO CONTENT (info only) */}
        {!isEmbedded && viewMode === "info" && (
          <div
            className="w-full"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#FFFEFA",
              borderTop: "1px solid rgba(0,0,0,0.08)",
              minHeight: "50vh",
              // smoother than before: opacity + translate for the sheet
              animation: "none",
            }}
          >
            <div className="px-5 pt-4">
              <div
                className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em]"
                style={{ color: "rgba(0,0,0,0.55)", fontFamily: headerFont }}
              >
                <span>DETAILS</span>
                <span style={{ width: 4, height: 4, borderRadius: 99, background: accent, opacity: 0.7 }} />
                <span style={{ letterSpacing: 0, fontWeight: 700 }}>Notes</span>
              </div>
            </div>

            <div
              style={{
                transform: "translateY(0px)",
                opacity: 1,
                transition: `transform 220ms ${EASE}, opacity 220ms ${EASE}`,
              }}
            >
              <PinNotesPanel
                headerFont={headerFont}
                palette={palette}
                projectId={project?.id}
                hotspots={currentHotspots}
                selectedPin={selectedPin}
                setSelectedPinId={(id) => {
                  // Selecting an annotation reveals pins in the photo
                  setSelectedPinId(id);
                }}
                isAddPinMode={isAddPinMode}
                toggleAddPinMode={() => {
                  setIsAddPinMode((v) => !v);
                  setSelectedPinId(null);
                }}
                openPinEditor={openPinEditor}
                onUpdateMediaNote={onUpdateMediaNote}
                media={media}
                moreFromSession={[]}
                onSelectMedia={() => {}}
                onDeleteHotspot={(pinId) => onDeleteHotspot?.(project?.id, media?.sessionId, media?.id, pinId)}
              />
            </div>
          </div>
        )}

        {/* PIN EDITOR MODAL */}
        {pinOpen && (
          <div onClick={(e) => e.stopPropagation()}>
            <PinEditorModal
              open={pinOpen}
              palette={palette}
              headerFont={headerFont}
              initialText={pinDraft?.note || ""}
              onClose={closePinEditor}
              onSave={savePinEditor}
            />
          </div>
        )}

        {/* Keyframes (local) */}
        <style>{`
          .hide-scrollbar::-webkit-scrollbar { display: none; }
        `}</style>
      </div>
    </Outer>
  );
}