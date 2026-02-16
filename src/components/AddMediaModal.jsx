// /src/components/AddMediaModal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Camera, Upload, Check, RefreshCw, ChevronDown } from "lucide-react";

export default function AddMediaModal({
  open,
  isOpen,
  onClose,
  onAddMedia,
  existingSessions = [],
  autoPrompt = false,
  autoSubmit = false,
}) {
  const OPEN = typeof isOpen === "boolean" ? isOpen : Boolean(open);

  const palette = {
    ink: "#0B0B0C",
    paper: "#FFFEFA",
    line: "rgba(0,0,0,0.08)",
    sky: "#3AA8FF",
    sun: "#FFEA3A",
    breeze: "#54E6C1",
  };

  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  const [sessionMode, setSessionMode] = useState("existing"); // "existing" | "new"
  const [sessionId, setSessionId] = useState("");
  const [newSessionTitle, setNewSessionTitle] = useState("");

  const [selectedFile, setSelectedFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [showSessionPicker, setShowSessionPicker] = useState(true);

  const cameraInputRef = useRef(null);
  const uploadInputRef = useRef(null);

  // Build “recent uploads” from your existingSessions media
  const recentThumbs = useMemo(() => {
    const all = [];
    (existingSessions || []).forEach((s) => {
      (s?.media || []).forEach((m) => {
        const url =
          (typeof m?.url === "string" && m.url.trim()) ||
          (typeof m?.coverPhoto === "string" && m.coverPhoto.trim()) ||
          "";
        if (url) all.push({ id: m.id, url, type: m.type || m.kind || m.mediaType });
      });
    });
    // newest first (best-effort: assumes later sessions/media are newer)
    return all.reverse().slice(0, 18);
  }, [existingSessions]);

  useEffect(() => {
    if (OPEN) {
      setMounted(true);
      // reset form
      setSessionMode(existingSessions.length > 0 ? "existing" : "new");
      setSessionId(existingSessions[0]?.id || "");
      setNewSessionTitle("");
      setSelectedFile(null);
      setIsSaving(false);

      // animate in next tick
      requestAnimationFrame(() => setVisible(true));

      // auto-open picker if requested
      if (autoPrompt) {
        setTimeout(() => uploadInputRef.current?.click?.(), 120);
      }
    } else if (mounted) {
      // animate out
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 220);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [OPEN]);

  const close = () => {
    setVisible(false);
    setTimeout(() => onClose?.(), 200);
  };

  const handlePick = (file) => {
    if (!file) return;
    setSelectedFile(file);
    if (autoSubmit) {
      setTimeout(() => handleSubmit(file), 0);
    }
  };

  const handleCameraPick = (e) => {
    const file = e.target.files?.[0];
    if (file) handlePick(file);
    e.target.value = "";
  };

  const handleUploadPick = (e) => {
    const file = e.target.files?.[0];
    if (file) handlePick(file);
    e.target.value = "";
  };

  const handleSubmit = async (fileOverride) => {
    const effectiveFile = fileOverride || selectedFile;
    if (!effectiveFile) return;

    setIsSaving(true);
    try {
      await onAddMedia({
        file: effectiveFile,
        sessionId: sessionMode === "existing" ? sessionId : null,
        sessionTitle: sessionMode === "new" ? newSessionTitle : "",
      });
      close();
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted) return null;

  const fileLabel = selectedFile
    ? `${selectedFile.name || "Selected file"}${selectedFile.type ? ` • ${selectedFile.type}` : ""}`
    : "";

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        onClick={close}
        style={{
          background: "rgba(11,11,12,0.45)",
          backdropFilter: "blur(6px)",
          opacity: visible ? 1 : 0,
          transition: "opacity 200ms ease-out",
        }}
      />

      {/* Bottom Sheet */}
      <div
        className="absolute left-0 right-0 bottom-0 w-full"
        style={{
          transform: visible ? "translateY(0px)" : "translateY(18px)",
          opacity: visible ? 1 : 0,
          transition: "transform 220ms ease-out, opacity 220ms ease-out",
        }}
      >
        <div
          className="mx-auto w-full max-w-lg overflow-hidden"
          style={{
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            background: "rgba(255,255,255,0.86)",
            border: `1px solid ${palette.line}`,
            backdropFilter: "blur(18px)",
            boxShadow: "0 -24px 70px -52px rgba(0,0,0,0.55)",
          }}
        >
          {/* Grab handle */}
          <div className="pt-3 pb-2 flex justify-center">
            <div
              style={{
                width: 46,
                height: 5,
                borderRadius: 999,
                background: "rgba(0,0,0,0.14)",
              }}
            />
          </div>

          {/* Header row */}
          <div className="px-4 pb-3 flex items-center justify-between">
            <div className="text-[16px] font-semibold" style={{ color: palette.ink }}>
              Add Media
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                className="text-[14px] font-semibold"
                style={{ color: palette.sky }}
              >
                All Photos
              </button>

              <button
                onClick={close}
                className="w-9 h-9 grid place-items-center"
                style={{
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.70)",
                  border: `1px solid ${palette.line}`,
                  color: "rgba(0,0,0,0.65)",
                }}
                aria-label="Close"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Recents strip (your uploads) */}
          <div className="px-4 pb-3">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-black/45 mb-2">
              Recent uploads
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2">
              {/* Camera tile (like iOS) */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="shrink-0"
                style={{
                  width: 86,
                  height: 86,
                  borderRadius: 16,
                  background: "rgba(0,0,0,0.04)",
                  border: `1px solid ${palette.line}`,
                  display: "grid",
                  placeItems: "center",
                }}
                aria-label="Camera"
                title="Camera"
              >
                <Camera className="w-6 h-6" style={{ color: "rgba(0,0,0,0.55)" }} />
              </button>

              {recentThumbs.length === 0 ? (
                <div
                  className="shrink-0 flex items-center"
                  style={{ color: "rgba(0,0,0,0.35)", fontSize: 12 }}
                >
                  No uploads yet.
                </div>
              ) : (
                recentThumbs.map((t) => (
                  <div
                    key={t.id}
                    className="shrink-0 overflow-hidden"
                    style={{
                      width: 86,
                      height: 86,
                      borderRadius: 16,
                      border: `1px solid ${palette.line}`,
                      background: "rgba(255,255,255,0.55)",
                    }}
                    title="Recent upload"
                  >
                    <img
                      src={t.url}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      draggable={false}
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Session picker (kept, but styled + collapsible) */}
          <div className="px-4 pb-3">
            <button
              type="button"
              onClick={() => setShowSessionPicker((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-3"
              style={{
                borderRadius: 16,
                background: "rgba(255,255,255,0.70)",
                border: `1px solid ${palette.line}`,
                color: "rgba(0,0,0,0.70)",
              }}
            >
              <div className="text-[12px] font-semibold">
                Session{" "}
                <span style={{ color: "rgba(0,0,0,0.45)", fontWeight: 600 }}>
                  {sessionMode === "existing"
                    ? existingSessions.find((s) => s.id === sessionId)?.title || "Existing"
                    : newSessionTitle || "New session"}
                </span>
              </div>
              <ChevronDown
                className="w-4 h-4"
                style={{
                  transform: showSessionPicker ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 180ms ease-out",
                  color: "rgba(0,0,0,0.45)",
                }}
              />
            </button>

            {showSessionPicker && (
              <div
                className="mt-2 p-2"
                style={{
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.62)",
                  border: `1px solid ${palette.line}`,
                }}
              >
                <div className="flex gap-2 mb-2">
                  {existingSessions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSessionMode("existing")}
                      className="flex-1 py-2 text-[11px] font-semibold uppercase tracking-widest"
                      style={{
                        borderRadius: 14,
                        border: `1px solid ${palette.line}`,
                        background:
                          sessionMode === "existing"
                            ? "rgba(255,255,255,0.80)"
                            : "rgba(255,255,255,0.35)",
                        color:
                          sessionMode === "existing"
                            ? "rgba(0,0,0,0.75)"
                            : "rgba(0,0,0,0.45)",
                      }}
                    >
                      Existing
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSessionMode("new")}
                    className="flex-1 py-2 text-[11px] font-semibold uppercase tracking-widest"
                    style={{
                      borderRadius: 14,
                      border: `1px solid ${palette.line}`,
                      background:
                        sessionMode === "new"
                          ? "rgba(255,255,255,0.80)"
                          : "rgba(255,255,255,0.35)",
                      color:
                        sessionMode === "new"
                          ? "rgba(0,0,0,0.75)"
                          : "rgba(0,0,0,0.45)",
                    }}
                  >
                    New
                  </button>
                </div>

                {sessionMode === "existing" ? (
                  <select
                    className="w-full px-3 py-3 text-sm font-semibold outline-none"
                    style={{
                      borderRadius: 14,
                      background: "rgba(255,255,255,0.70)",
                      border: `1px solid ${palette.line}`,
                      color: "rgba(0,0,0,0.75)",
                    }}
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                  >
                    {existingSessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title} ({s.date})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Session name (e.g. Second fitting)"
                    className="w-full px-3 py-3 text-sm font-semibold outline-none"
                    style={{
                      borderRadius: 14,
                      background: "rgba(255,255,255,0.70)",
                      border: `1px solid ${palette.line}`,
                      color: "rgba(0,0,0,0.75)",
                    }}
                    value={newSessionTitle}
                    onChange={(e) => setNewSessionTitle(e.target.value)}
                  />
                )}
              </div>
            )}
          </div>

          {/* Selected file (minimal) */}
          {selectedFile && (
            <div className="px-4 pb-3">
              <div
                className="flex items-center justify-between gap-3 px-3 py-2"
                style={{
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.62)",
                  border: `1px solid ${palette.line}`,
                }}
              >
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-black/45">
                    Selected
                  </div>
                  <div className="text-[12px] font-semibold text-black/70 truncate">
                    {fileLabel}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="w-9 h-9 grid place-items-center"
                  style={{
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.70)",
                    border: `1px solid ${palette.line}`,
                    color: "rgba(0,0,0,0.65)",
                  }}
                  aria-label="Clear selection"
                  title="Clear"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div
            className="px-4 pt-2 pb-5 flex gap-3"
            style={{
              borderTop: `1px solid ${palette.line}`,
              background: "rgba(255,255,255,0.55)",
            }}
          >
            <button
              onClick={close}
              className="flex-1 h-11 text-sm font-semibold"
              style={{
                borderRadius: 16,
                background: "transparent",
                border: `1px solid ${palette.line}`,
                color: "rgba(0,0,0,0.55)",
              }}
            >
              Cancel
            </button>

            <button
              onClick={() => handleSubmit()}
              disabled={!selectedFile || isSaving}
              className="flex-[2] h-11 text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                borderRadius: 16,
                background: selectedFile ? palette.sun : "rgba(0,0,0,0.08)",
                color: selectedFile ? palette.ink : "rgba(0,0,0,0.45)",
                boxShadow: selectedFile
                  ? "0 12px 28px -22px rgba(0,0,0,0.45)"
                  : "none",
              }}
            >
              {isSaving ? (
                "Saving…"
              ) : (
                <>
                  <Check className="w-4 h-4" /> Save
                </>
              )}
            </button>
          </div>

          {/* Hidden inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*,video/*"
            capture="environment"
            className="hidden"
            onChange={handleCameraPick}
          />
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleUploadPick}
          />
        </div>
      </div>
    </div>
  );
}
