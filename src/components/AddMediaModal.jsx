// /src/components/AddMediaModal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Camera, Upload, ChevronDown, Loader2, Plus } from "lucide-react";

export default function AddMediaModal({
  open,
  isOpen,
  onClose,
  onAddMedia, // expects: ({ files: File[], sessionId, sessionTitle }) => Promise
  existingSessions = [],
  autoPrompt = false,
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

  const [sessionMode, setSessionMode] = useState("existing"); // existing | new
  const [sessionId, setSessionId] = useState("");
  const [newSessionTitle, setNewSessionTitle] = useState("");

  const [files, setFiles] = useState([]); // up to 5
  const [previews, setPreviews] = useState([]); // object URLs

  const [isUploading, setIsUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const [showSessionPicker, setShowSessionPicker] = useState(true);

  const cameraInputRef = useRef(null);
  const uploadInputRef = useRef(null);

  const recentThumbs = useMemo(() => {
    const all = [];
    (existingSessions || []).forEach((s) => {
      (s?.media || []).forEach((m) => {
        const url =
          (typeof m?.url === "string" && m.url.trim()) ||
          (typeof m?.coverPhoto === "string" && m.coverPhoto.trim()) ||
          "";
        if (url) all.push({ id: m.id, url });
      });
    });
    return all.reverse().slice(0, 18);
  }, [existingSessions]);

  useEffect(() => {
    if (OPEN) {
      setMounted(true);
      setUploaded(false);
      setIsUploading(false);

      const hasSessions = existingSessions.length > 0;
      setSessionMode(hasSessions ? "existing" : "new");
      setSessionId(existingSessions[0]?.id || "");
      setNewSessionTitle("");

      setFiles([]);
      setPreviews([]);

      requestAnimationFrame(() => setVisible(true));

      if (autoPrompt) {
        setTimeout(() => uploadInputRef.current?.click?.(), 120);
      }
    } else if (mounted) {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 220);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [OPEN]);

  useEffect(() => {
    return () => {
      previews.forEach((u) => {
        try {
          URL.revokeObjectURL(u);
        } catch {}
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    setVisible(false);
    setTimeout(() => onClose?.(), 200);
  };

  const hydratePreviews = (nextFiles) => {
    previews.forEach((u) => {
      try {
        URL.revokeObjectURL(u);
      } catch {}
    });
    setPreviews(nextFiles.map((f) => URL.createObjectURL(f)));
  };

  const pushFiles = (picked) => {
    const incoming = Array.isArray(picked) ? picked.filter(Boolean) : [];
    if (incoming.length === 0) return;

    setFiles((prev) => {
      const next = [...prev, ...incoming].slice(0, 5);
      hydratePreviews(next);
      return next;
    });
  };

  const handleCameraPick = (e) => {
    const f = e.target.files?.[0];
    if (f) pushFiles([f]);
    e.target.value = "";
  };

  const handleUploadPick = (e) => {
    const list = Array.from(e.target.files || []);
    if (list.length) pushFiles(list);
    e.target.value = "";
  };

  const removeAt = (idx) => {
    setFiles((prev) => {
      const next = prev.slice();
      next.splice(idx, 1);
      hydratePreviews(next);
      return next;
    });
  };

  // ✅ Auto-upload when files goes from empty -> non-empty
  useEffect(() => {
    if (!OPEN) return;
    if (isUploading) return;
    if (uploaded) return;
    if (files.length === 0) return;

    const run = async () => {
      setIsUploading(true);
      try {
        const sid = sessionMode === "existing" ? sessionId : null;
        const title = sessionMode === "new" ? (newSessionTitle || "New Session") : "";

        await onAddMedia?.({
          files,
          sessionId: sid,
          sessionTitle: title,
        });

        setUploaded(true);
      } catch (err) {
        console.error("Upload failed:", err);
        alert(err?.message || "Upload failed. Check console.");
      } finally {
        setIsUploading(false);
      }
    };

    const t = setTimeout(run, 180); // tiny grace period for “oops” removals
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files.length]);

  if (!mounted) return null;

  const canClose = !isUploading;

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0"
        onClick={() => {
          if (canClose) close();
        }}
        style={{
          background: "rgba(11,11,12,0.45)",
          backdropFilter: "blur(6px)",
          opacity: visible ? 1 : 0,
          transition: "opacity 200ms ease-out",
        }}
      />

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
                onClick={() => {
                  if (canClose) close();
                }}
                className="w-9 h-9 grid place-items-center"
                style={{
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.70)",
                  border: `1px solid ${palette.line}`,
                  color: "rgba(0,0,0,0.65)",
                  opacity: canClose ? 1 : 0.5,
                }}
                aria-label="Close"
                title={canClose ? "Close" : "Uploading…"}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="px-4 pb-3">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-black/45 mb-2">
              Recent uploads
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2">
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
                Add to{" "}
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
                      disabled={isUploading}
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
                        opacity: isUploading ? 0.6 : 1,
                      }}
                    >
                      Existing
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSessionMode("new")}
                    className="flex-1 py-2 text-[11px] font-semibold uppercase tracking-widest"
                    disabled={isUploading}
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
                      opacity: isUploading ? 0.6 : 1,
                    }}
                  >
                    New
                  </button>
                </div>

                {sessionMode === "existing" ? (
                  <select
                    className="w-full px-3 py-3 text-sm font-semibold outline-none"
                    disabled={isUploading}
                    style={{
                      borderRadius: 14,
                      background: "rgba(255,255,255,0.70)",
                      border: `1px solid ${palette.line}`,
                      color: "rgba(0,0,0,0.75)",
                      opacity: isUploading ? 0.6 : 1,
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
                    disabled={isUploading}
                    style={{
                      borderRadius: 14,
                      background: "rgba(255,255,255,0.70)",
                      border: `1px solid ${palette.line}`,
                      color: "rgba(0,0,0,0.75)",
                      opacity: isUploading ? 0.6 : 1,
                    }}
                    value={newSessionTitle}
                    onChange={(e) => setNewSessionTitle(e.target.value)}
                  />
                )}
              </div>
            )}
          </div>

          <div className="px-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-black/45">
                Selected (up to 5)
              </div>

              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                disabled={isUploading || files.length >= 5}
                className="h-8 px-3 inline-flex items-center gap-2 text-[11px] font-semibold"
                style={{
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.70)",
                  border: `1px solid ${palette.line}`,
                  color: "rgba(0,0,0,0.70)",
                  opacity: isUploading || files.length >= 5 ? 0.5 : 1,
                }}
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            {files.length === 0 ? (
              <div
                className="px-3 py-3"
                style={{
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.62)",
                  border: `1px solid ${palette.line}`,
                  color: "rgba(0,0,0,0.40)",
                  fontSize: 12,
                }}
              >
                Pick up to 5 photos/videos. They’ll upload automatically.
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {previews.map((u, idx) => (
                  <div
                    key={u}
                    className="shrink-0 relative overflow-hidden"
                    style={{
                      width: 92,
                      height: 92,
                      borderRadius: 18,
                      border: `1px solid ${palette.line}`,
                      background: "rgba(255,255,255,0.55)",
                    }}
                  >
                    <img
                      src={u}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      draggable={false}
                    />

                    {!isUploading && !uploaded && (
                      <button
                        type="button"
                        onClick={() => removeAt(idx)}
                        className="absolute top-2 right-2 w-7 h-7 grid place-items-center"
                        style={{
                          borderRadius: 999,
                          background: "rgba(255,255,255,0.78)",
                          border: `1px solid ${palette.line}`,
                          color: "rgba(0,0,0,0.70)",
                          backdropFilter: "blur(12px)",
                        }}
                        aria-label="Remove"
                        title="Remove"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            className="px-4 pt-3 pb-5 flex items-center justify-between"
            style={{
              borderTop: `1px solid ${palette.line}`,
              background: "rgba(255,255,255,0.55)",
            }}
          >
            <div className="text-xs font-semibold" style={{ color: "rgba(0,0,0,0.55)" }}>
              {isUploading ? "Uploading…" : uploaded ? "Uploaded. Tap outside to close." : ""}
            </div>

            <div
              className="h-10 px-4 inline-flex items-center gap-2"
              style={{
                borderRadius: 14,
                background: isUploading
                  ? "rgba(0,0,0,0.06)"
                  : uploaded
                  ? "rgba(84,230,193,0.18)"
                  : "rgba(255,234,58,0.30)",
                border: `1px solid ${palette.line}`,
                color: "rgba(0,0,0,0.70)",
              }}
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span className="text-[11px] font-semibold uppercase tracking-widest">
                {isUploading ? "Saving" : uploaded ? "Saved" : "Ready"}
              </span>
            </div>
          </div>

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
            multiple
            className="hidden"
            onChange={handleUploadPick}
          />
        </div>
      </div>
    </div>
  );
}
