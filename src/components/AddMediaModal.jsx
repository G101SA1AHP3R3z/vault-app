import React, { useEffect, useRef, useState } from "react";
import { X, Upload, Camera, Check, RefreshCw } from "lucide-react";

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

  const [sessionMode, setSessionMode] = useState("existing"); // "existing" | "new"
  const [sessionId, setSessionId] = useState("");
  const [newSessionTitle, setNewSessionTitle] = useState("");

  const [selectedFile, setSelectedFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const cameraInputRef = useRef(null);
  const uploadInputRef = useRef(null);

  const palette = {
    ink: "#0B0B0C",
    paper: "#FFFEFA",
    line: "rgba(0,0,0,0.08)",
    sky: "#3AA8FF",
    sun: "#FFEA3A",
    breeze: "#54E6C1",
  };

  useEffect(() => {
    if (OPEN) {
      setSessionMode(existingSessions.length > 0 ? "existing" : "new");
      setSessionId(existingSessions[0]?.id || "");
      setNewSessionTitle("");
      setSelectedFile(null);
      setIsSaving(false);
      // Auto-open native picker (iOS shows camera / photo library / files)
      if (autoPrompt) {
        setTimeout(() => {
          uploadInputRef.current?.click?.();
        }, 50);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [OPEN]);

  const handlePick = (file) => {
    if (!file) return;
    setSelectedFile(file);
    if (autoSubmit) {
      // Fire immediately in "quick add" mode
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
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!OPEN) return null;

  const fileLabel = selectedFile
    ? `${selectedFile.name || "Selected file"}${selectedFile.type ? ` • ${selectedFile.type}` : ""}`
    : "";

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background: "rgba(11,11,12,0.45)",
          backdropFilter: "blur(6px)",
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg overflow-hidden flex flex-col"
        style={{
          borderRadius: 8,
          background: "rgba(255,255,255,0.80)",
          border: `1px solid ${palette.line}`,
          backdropFilter: "blur(14px)",
          boxShadow: "0 28px 80px -55px rgba(0,0,0,0.55)",
        }}
      >
        {/* Subtle abstract shapes */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute -top-20 -left-24 w-[320px] h-[320px]"
            style={{
              borderRadius: 22,
              background: palette.sun,
              opacity: 0.12,
              transform: "rotate(16deg)",
            }}
          />
          <div
            className="absolute top-6 -right-28 w-[420px] h-[200px]"
            style={{
              borderRadius: 24,
              background: palette.sky,
              opacity: 0.10,
              transform: "rotate(-10deg)",
            }}
          />
          <div
            className="absolute -bottom-24 left-10 w-[420px] h-[260px]"
            style={{
              borderRadius: 26,
              background: palette.breeze,
              opacity: 0.10,
              transform: "rotate(10deg)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.62) 0%, rgba(255,255,255,0.28) 45%, rgba(255,255,255,0.62) 100%)",
              opacity: 0.55,
            }}
          />
        </div>

        {/* Header */}
        <div
          className="relative px-5 py-4 flex justify-between items-center"
          style={{ borderBottom: `1px solid ${palette.line}` }}
        >
          <div className="leading-tight">
            <h2 className="text-sm font-semibold tracking-tight" style={{ color: palette.ink }}>
              Add media
            </h2>
            <div className="text-[11px] font-medium text-black/45">
              Use the native camera or library picker.
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 grid place-items-center"
            style={{
              borderRadius: 8,
              background: "rgba(255,255,255,0.60)",
              border: `1px solid ${palette.line}`,
              color: "rgba(0,0,0,0.65)",
            }}
            aria-label="Close"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="relative p-5">
          {/* Session selector */}
          <div className="space-y-3">
            <div
              className="flex gap-2 p-1"
              style={{
                borderRadius: 8,
                background: "rgba(255,255,255,0.55)",
                border: `1px solid ${palette.line}`,
                backdropFilter: "blur(14px)",
              }}
            >
              {existingSessions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSessionMode("existing")}
                  className="flex-1 py-2 text-[11px] font-semibold uppercase tracking-widest transition"
                  style={{
                    borderRadius: 8,
                    border: `1px solid ${palette.line}`,
                    background:
                      sessionMode === "existing"
                        ? "rgba(255,255,255,0.75)"
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
                className="flex-1 py-2 text-[11px] font-semibold uppercase tracking-widest transition"
                style={{
                  borderRadius: 8,
                  border: `1px solid ${palette.line}`,
                  background:
                    sessionMode === "new"
                      ? "rgba(255,255,255,0.75)"
                      : "rgba(255,255,255,0.35)",
                  color:
                    sessionMode === "new"
                      ? "rgba(0,0,0,0.75)"
                      : "rgba(0,0,0,0.45)",
                }}
              >
                New session
              </button>
            </div>

            {sessionMode === "existing" ? (
              <select
                className="w-full p-3 text-sm font-semibold outline-none"
                style={{
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.65)",
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
                className="w-full p-3 text-sm font-semibold outline-none"
                style={{
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.65)",
                  border: `1px solid ${palette.line}`,
                  color: "rgba(0,0,0,0.75)",
                }}
                value={newSessionTitle}
                onChange={(e) => setNewSessionTitle(e.target.value)}
              />
            )}
          </div>

          {/* Actions */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="h-12 px-4 inline-flex items-center justify-center gap-2 font-semibold"
              style={{
                borderRadius: 8,
                background: palette.sun,
                color: palette.ink,
                boxShadow: "0 12px 28px -22px rgba(0,0,0,0.45)",
              }}
            >
              <Camera className="w-4 h-4" />
              Take photo / video
            </button>

            <button
              type="button"
              onClick={() => uploadInputRef.current?.click()}
              className="h-12 px-4 inline-flex items-center justify-center gap-2 font-semibold"
              style={{
                borderRadius: 8,
                background: "rgba(255,255,255,0.70)",
                border: `1px solid ${palette.line}`,
                color: "rgba(0,0,0,0.70)",
              }}
            >
              <Upload className="w-4 h-4" />
              Choose from library
            </button>
          </div>

          {/* Selected file (tiny, clean) */}
          {selectedFile && (
            <div
              className="mt-4 flex items-center justify-between gap-3 px-3 py-2"
              style={{
                borderRadius: 8,
                background: "rgba(255,255,255,0.55)",
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
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.60)",
                  border: `1px solid ${palette.line}`,
                  color: "rgba(0,0,0,0.65)",
                }}
                aria-label="Clear selection"
                title="Clear"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          )}

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

        {/* Footer */}
        <div
          className="relative p-5 flex gap-3"
          style={{
            borderTop: `1px solid ${palette.line}`,
            background: "rgba(255,255,255,0.55)",
          }}
        >
          <button
            onClick={onClose}
            className="flex-1 h-11 text-sm font-semibold"
            style={{
              borderRadius: 8,
              background: "transparent",
              border: `1px solid ${palette.line}`,
              color: "rgba(0,0,0,0.55)",
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={!selectedFile || isSaving}
            className="flex-[2] h-11 text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              borderRadius: 8,
              background: selectedFile ? palette.sun : "rgba(0,0,0,0.08)",
              color: selectedFile ? palette.ink : "rgba(0,0,0,0.45)",
              boxShadow: selectedFile ? "0 12px 28px -22px rgba(0,0,0,0.45)" : "none",
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
      </div>
    </div>
  );
}
