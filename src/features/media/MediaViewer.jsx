import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Info, Share2, Trash2 } from "lucide-react";

import MediaStage from "./components/MediaStage";
import PinNotesPanel from "./components/PinNotesPanel";
import PinEditorModal from "../../components/PinEditorModal";

const EASE_IOS = "cubic-bezier(.16,1,.3,1)";
const INFO_DUR = 420;

function clamp01(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function resolveMediaUrl(m) {
  if (!m) return "";
  return (
    (typeof m.url === "string" && m.url) ||
    (typeof m.downloadURL === "string" && m.downloadURL) ||
    (typeof m.coverPhoto === "string" && m.coverPhoto) ||
    (typeof m.src === "string" && m.src) ||
    (typeof m.originalUrl === "string" && m.originalUrl) ||
    ""
  );
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
   * iOS Photos-inspired:
   * - immersive: black bg, no chrome
   * - controls: light bg, nav + filmstrip + bottom bar, no photo shift
   * - info: light bg, nav + bottom bar stay (i selected), filmstrip hidden,
   *         photo "appears" top-half via clip-path + notes sheet floats up
   */
  const [viewMode, setViewMode] = useState("immersive"); // "immersive" | "controls" | "info"

  const [isAddPinMode, setIsAddPinMode] = useState(false);
  const [selectedPinId, setSelectedPinId] = useState(null);

  const [pinOpen, setPinOpen] = useState(false);
  const [pinDraft, setPinDraft] = useState(null);

  const stageRef = useRef(null);

  // Ensure MediaStage always gets a usable url
  const stageMedia = useMemo(() => {
    const url = resolveMediaUrl(media);
    return media ? { ...media, url } : media;
  }, [media]);

  const currentHotspots = useMemo(() => {
    return Array.isArray(stageMedia?.hotspots) ? stageMedia.hotspots : [];
  }, [stageMedia?.hotspots]);

  const selectedPin = useMemo(() => {
    if (!selectedPinId) return null;
    return currentHotspots.find((h) => h.id === selectedPinId) || null;
  }, [selectedPinId, currentHotspots]);

  // Do NOT reset viewMode on media change (keeps light mode while browsing filmstrip)
  useEffect(() => {
    setSelectedPinId(null);
    setIsAddPinMode(false);
    setPinOpen(false);
    setPinDraft(null);
  }, [stageMedia?.id]);

  const isInfo = viewMode === "info";
  const isControls = viewMode === "controls";
  const isImmersive = viewMode === "immersive";

  const bg = isImmersive ? "#000000" : "#FFFEFA";

  // Float illusion: clip photo bottom half + slide sheet up
  const clipBottom = isInfo ? "50vh" : "0px";
  const imgZoom = isInfo ? 1.05 : 1.0;
  const fitMode = isInfo ? "cover" : "contain";

  // Pins only in info mode and only after selecting an annotation
  const showPins = isInfo && !!selectedPinId && !isAddPinMode;

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
      await onUpdateHotspot?.(
        project?.id,
        stageMedia?.sessionId,
        stageMedia?.id,
        pinDraft.id,
        { note: nextText }
      );
    } catch (err) {
      console.error("Failed to update pin note", err);
    } finally {
      closePinEditor();
    }
  };

  const onClickToAddPin = async (e) => {
    if (!isInfo) return;
    if (!isAddPinMode) return;
    if (!stageRef.current) return;

    const rect = stageRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    try {
      await onAddHotspot?.(project?.id, stageMedia?.sessionId, stageMedia?.id, {
        x: clamp01(x),
        y: clamp01(y),
      });
      setIsAddPinMode(false);
    } catch (err) {
      console.error("Failed to add hotspot", err);
    }
  };

  const handleShare = async () => {
    const url = stageMedia?.url;
    if (!url) return;

    try {
      if (navigator.share) {
        await navigator.share({ url, title: "Index" });
        return;
      }
    } catch {
      return;
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

  // Tap anywhere toggles immersive <-> controls ONLY (not info)
  const handleStageTapToggle = () => {
    if (isEmbedded) return;
    if (pinOpen) return;
    if (isInfo) return;
    setViewMode((m) => (m === "immersive" ? "controls" : "immersive"));
  };

  const filmstrip = useMemo(() => {
    const list = Array.isArray(moreFromSession)
      ? moreFromSession.filter((m) => resolveMediaUrl(m))
      : [];
    return list;
  }, [moreFromSession]);

  const Outer = ({ children }) => {
    if (isEmbedded) return <div className="w-full relative">{children}</div>;
    return (
      <div
        className="fixed inset-0 z-[100]"
        style={{ background: bg, overscrollBehavior: "contain" }}
      >
        {children}
      </div>
    );
  };

  const showNav = !isEmbedded && (isControls || isInfo);
  const showFilmstrip = !isEmbedded && isControls;
  const showBottomBar = !isEmbedded && (isControls || isInfo);

  return (
    <Outer>
      <div
        className={isEmbedded ? "w-full h-full relative" : "h-full w-full relative"}
        style={{
          background: bg,
          transition: `background 220ms ${EASE_IOS}`,
        }}
      >
        {/* NAV BAR (controls + info) — CENTER INTENTIONALLY EMPTY (no random project title overlay) */}
        {showNav && (
          <div className="absolute top-0 left-0 right-0 z-[220] pointer-events-none">
            <div className="px-4 pt-4 flex items-center justify-between gap-3">
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
                <ChevronLeft
                  className="w-5 h-5"
                  style={{ color: "rgba(0,0,0,0.82)" }}
                />
              </button>

              {/* center spacer */}
              <div className="flex-1" />

              {/* right spacer */}
              <div className="w-10 h-10" />
            </div>
          </div>
        )}

        {/* PHOTO AREA — ALWAYS 100vh. Float illusion via clip-path + sheet translate. */}
        <div
          className="relative w-full"
          style={{ height: "100vh" }}
          onClick={() => !isInfo && handleStageTapToggle()}
        >
          <MediaStage
            isEmbedded={isEmbedded}
            stageRef={stageRef}
            media={stageMedia}
            fit={fitMode}
            imgZoom={imgZoom}
            clipBottom={clipBottom}
            isAddPinMode={isInfo ? isAddPinMode : false}
            isFocusMode={false}
            onClickToAddPin={(e) => {
              // Only consume tap if actively placing a pin in info mode
              if (isInfo && isAddPinMode) {
                e.stopPropagation();
                onClickToAddPin(e);
              }
            }}
            hotspots={showPins ? currentHotspots : []}
            selectedPin={selectedPin}
            palette={palette}
            getDisplayXY={getDisplayXY}
            showPins={showPins}
            onPinPointerDown={(e, pin) => {
              e.preventDefault();
              e.stopPropagation();
              setSelectedPinId(pin?.id || null);
            }}
          />

          {/* FILMSTRIP (controls only) */}
          {showFilmstrip && filmstrip.length > 0 && (
            <div
              className="absolute left-0 right-0 bottom-[76px] z-[160]"
              onClick={(e) => e.stopPropagation()}
              style={{ opacity: 1, transition: `opacity 160ms ${EASE_IOS}` }}
            >
              <div
                className="px-4 pb-2 flex gap-2 overflow-x-auto hide-scrollbar"
                style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}
              >
                {filmstrip.map((m) => {
                  const mUrl = resolveMediaUrl(m);
                  const active = m.id === stageMedia?.id;
                  return (
                    <button
                      key={m.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectMedia?.({ ...m, url: mUrl });
                        // If invoked while immersive, keep it light after selection
                        if (viewMode === "immersive") setViewMode("controls");
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
                          border: active
                            ? "2px solid rgba(0,0,0,0.82)"
                            : "1px solid rgba(0,0,0,0.12)",
                          background: "rgba(0,0,0,0.04)",
                        }}
                      >
                        <img
                          src={m.thumbnailUrl || mUrl}
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

          {/* BOTTOM BAR (controls + info): share / info / delete */}
          {showBottomBar && (
            <div
              className="absolute left-0 right-0 bottom-0 z-[180] pb-5 flex justify-center"
              onClick={(e) => e.stopPropagation()}
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
                  <Share2
                    className="w-5 h-5"
                    style={{ color: "rgba(0,0,0,0.82)" }}
                  />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewMode((m) => (m === "info" ? "controls" : "info"));
                    setIsAddPinMode(false);
                    setSelectedPinId(null);
                  }}
                  className="w-9 h-9 grid place-items-center rounded-full"
                  aria-label="Info"
                  style={{ background: isInfo ? "rgba(0,0,0,0.08)" : "transparent" }}
                >
                  <Info
                    className="w-5 h-5"
                    style={{ color: "rgba(0,0,0,0.82)" }}
                  />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  className="w-9 h-9 grid place-items-center"
                  aria-label="Delete"
                >
                  <Trash2
                    className="w-5 h-5"
                    style={{ color: "rgba(220,38,38,0.92)" }}
                  />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* NOTES SHEET — always mounted; floats up via transform */}
        {!isEmbedded && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 170,
              background: "#FFFEFA",
              borderTop: "1px solid rgba(0,0,0,0.08)",
              minHeight: "50vh",
              transform: isInfo ? "translateY(0%)" : "translateY(100%)",
              opacity: isInfo ? 1 : 0,
              transition: `transform ${INFO_DUR}ms ${EASE_IOS}, opacity 220ms ${EASE_IOS}`,
              willChange: "transform, opacity",
              pointerEvents: isInfo ? "auto" : "none",
            }}
          >
            <div className="px-5 pt-4">
              <div
                className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em]"
                style={{ color: "rgba(0,0,0,0.55)", fontFamily: headerFont }}
              >
                <span>DETAILS</span>
                <span
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 99,
                    background: accent,
                    opacity: 0.7,
                  }}
                />
                <span style={{ letterSpacing: 0, fontWeight: 700 }}>Notes</span>
              </div>
            </div>

            <PinNotesPanel
              headerFont={headerFont}
              palette={palette}
              projectId={project?.id}
              hotspots={currentHotspots}
              selectedPin={selectedPin}
              setSelectedPinId={(id) => setSelectedPinId(id)}
              isAddPinMode={isAddPinMode}
              toggleAddPinMode={() => {
                setIsAddPinMode((v) => !v);
                setSelectedPinId(null);
              }}
              openPinEditor={openPinEditor}
              onUpdateMediaNote={onUpdateMediaNote}
              media={stageMedia}
              moreFromSession={[]}
              onSelectMedia={() => {}}
              onDeleteHotspot={(pinId) =>
                onDeleteHotspot?.(project?.id, stageMedia?.sessionId, stageMedia?.id, pinId)
              }
            />
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

        <style>{`
          .hide-scrollbar::-webkit-scrollbar { display: none; }
        `}</style>
      </div>
    </Outer>
  );
}