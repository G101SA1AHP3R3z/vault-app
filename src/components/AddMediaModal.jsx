// /src/components/AddMediaModal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Camera, Plus, ChevronDown, Loader2, Upload, Mic, Square, AudioLines } from "lucide-react";

function pickAudioMimeType() {
  if (typeof window === "undefined") return "audio/webm";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const c of candidates) {
    try {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported?.(c)) return c;
    } catch {}
  }
  return "audio/webm";
}

async function startAudioRecording({ onTick }) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = pickAudioMimeType();
  const recorder = new MediaRecorder(stream, { mimeType });

  const chunks = [];
  let t = 0;

  const interval = setInterval(() => {
    t += 1;
    onTick?.(t);
  }, 1000);

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const stop = () =>
    new Promise((resolve) => {
      recorder.onstop = () => {
        clearInterval(interval);
        stream.getTracks().forEach((tr) => tr.stop());

        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });

        const ext = blob.type.includes("mp4") ? "m4a" : "webm";
        const file = new File([blob], `audio_${Date.now()}.${ext}`, { type: blob.type });
        resolve(file);
      };
      recorder.stop();
    });

  recorder.start();
  return { stop };
}

export default function AddMediaModal({
  open,
  isOpen,
  onClose,
  onAddMedia, // ({ files: File[], sessionId, sessionTitle }) => Promise
  existingSessions = [],

  // behavior
  autoPrompt = false,
  autoSubmit = true,

  // prefill from App.jsx
  defaultSessionId = null,
  defaultSessionTitle = "",
}) {
  const OPEN = typeof isOpen === "boolean" ? isOpen : Boolean(open);

  const palette = {
    ink: "#0B0B0C",
    paper: "#FFFEFA",
    line: "rgba(0,0,0,0.08)",
    accent: "rgba(255,77,46,0.95)",
    sky: "#3AA8FF",
  };

  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  const [sessionMode, setSessionMode] = useState("existing"); // existing | new
  const [sessionId, setSessionId] = useState("");
  const [newSessionTitle, setNewSessionTitle] = useState("");

  const [files, setFiles] = useState([]); // up to 5
  const [previews, setPreviews] = useState([]); // object URLs (for images/videos only)

  const [isUploading, setIsUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const [showSessionPicker, setShowSessionPicker] = useState(false);

  // Audio recording
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef(null);

  const cameraInputRef = useRef(null);
  const uploadInputRef = useRef(null);

  const recentThumbs = useMemo(() => {
    const all = [];
    (existingSessions || []).forEach((s) => {
      (s?.media || []).forEach((m) => {
        // Skip audio in thumbnails
        if (m?.type === "audio") return;

        const url =
          (typeof m?.url === "string" && m.url.trim()) ||
          (typeof m?.coverPhoto === "string" && m.coverPhoto.trim()) ||
          "";
        if (url) all.push({ id: m.id, url });
      });
    });
    return all.reverse().slice(0, 12);
  }, [existingSessions]);

  // Reset on open
  useEffect(() => {
    if (OPEN) {
      setMounted(true);
      setUploaded(false);
      setIsUploading(false);

      // stop recording if modal reopened weirdly
      setRecording(false);
      setSeconds(0);
      recorderRef.current = null;

      const hasSessions = (existingSessions || []).length > 0;

      if (defaultSessionId && hasSessions) {
        setSessionMode("existing");
        setSessionId(defaultSessionId);
        setNewSessionTitle("");
      } else if ((defaultSessionTitle || "").trim()) {
        setSessionMode("new");
        setSessionId(existingSessions?.[0]?.id || "");
        setNewSessionTitle(defaultSessionTitle.trim());
      } else {
        setSessionMode(hasSessions ? "existing" : "new");
        setSessionId(existingSessions?.[0]?.id || "");
        setNewSessionTitle("");
      }

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

  // cleanup URLs
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

  const canClose = !isUploading && !recording;

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

    // Only create object URLs for images/videos (audio gets a clean tile)
    const urls = nextFiles.map((f) => {
      const t = f?.type || "";
      if (t.startsWith("audio")) return "";
      try {
        return URL.createObjectURL(f);
      } catch {
        return "";
      }
    });
    setPreviews(urls);
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

  // Audio record handlers
  const startRec = async () => {
    if (isUploading) return;
    if (files.length >= 5) {
      alert("You can add up to 5 items.");
      return;
    }
    try {
      setSeconds(0);
      setRecording(true);
      recorderRef.current = await startAudioRecording({ onTick: setSeconds });
    } catch (e) {
      console.error(e);
      setRecording(false);
      recorderRef.current = null;
      alert("Microphone permission denied (or not available).");
    }
  };

  const stopRec = async () => {
    if (!recorderRef.current) return;
    try {
      const file = await recorderRef.current.stop();
      recorderRef.current = null;
      setRecording(false);
      setSeconds(0);

      pushFiles([file]); // reuse the existing pipeline
    } catch (e) {
      console.error(e);
      recorderRef.current = null;
      setRecording(false);
      setSeconds(0);
      alert("Recording failed. Check console.");
    }
  };

  // Auto upload
  useEffect(() => {
    if (!OPEN) return;
    if (!autoSubmit) return;
    if (isUploading) return;
    if (uploaded) return;
    if (recording) return;
    if (files.length === 0) return;

    const run = async () => {
      setIsUploading(true);
      try {
        const sid = sessionMode === "existing" ? sessionId : null;
        const title = sessionMode === "new" ? (newSessionTitle || "New Session").trim() : "";

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

    const t = setTimeout(run, 180);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files.length, autoSubmit, recording]);

  if (!mounted) return null;

  const currentSessionLabel =
    sessionMode === "existing"
      ? existingSessions.find((s) => s.id === sessionId)?.title || "Session"
      : newSessionTitle || "New session";

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        onClick={() => {
          if (canClose) close();
        }}
        style={{
          background: "rgba(11,11,12,0.45)",
          backdropFilter: "blur(8px)",
          opacity: visible ? 1 : 0,
          transition: "opacity 200ms ease-out",
        }}
      />

      {/* Sheet */}
      <div
        className="absolute left-0 right-0 bottom-0 w-full"
        style={{
          transform: visible ? "translateY(0px)" : "translateY(16px)",
          opacity: visible ? 1 : 0,
          transition: "transform 220ms ease-out, opacity 220ms ease-out",
        }}
      >
        <div
          className="mx-auto w-full max-w-md overflow-hidden"
          style={{
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
            background: "rgba(255,254,250,0.96)",
            border: `1px solid ${palette.line}`,
            boxShadow: "0 -24px 70px -52px rgba(0,0,0,0.55)",
          }}
        >
          {/* Grabber */}
          <div className="pt-3 pb-2 flex justify-center">
            <div
              style={{
                width: 44,
                height: 4,
                borderRadius: 999,
                background: "rgba(0,0,0,0.14)",
              }}
            />
          </div>

          {/* Header */}
          <div className="px-6 pb-4 flex items-center justify-between">
            <div>
              <div
                className="text-[18px] font-semibold tracking-[0.02em]"
                style={{ color: "rgba(0,0,0,0.85)" }}
              >
                [ Add Media ]
              </div>
              <div className="mt-1 text-[12px]" style={{ color: "rgba(0,0,0,0.40)" }}>
                Select up to 5. Auto-saves.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                className="h-9 px-3 inline-flex items-center gap-2 text-[12px] font-semibold"
                style={{
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.70)",
                  border: `1px solid ${palette.line}`,
                  color: "rgba(0,0,0,0.72)",
                  opacity: isUploading ? 0.6 : 1,
                }}
                disabled={isUploading}
              >
                <Plus className="w-4 h-4" />
                Add
              </button>

              <button
                onClick={() => {
                  if (canClose) close();
                }}
                className="w-9 h-9 grid place-items-center"
                style={{
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.70)",
                  border: `1px solid ${palette.line}`,
                  color: "rgba(0,0,0,0.65)",
                  opacity: canClose ? 1 : 0.5,
                }}
                aria-label="Close"
                title={canClose ? "Close" : recording ? "Recording…" : "Uploading…"}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick pick */}
          <div className="px-6 pb-4">
            <div className="text-[11px] font-semibold tracking-[0.18em] text-black/45">
              QUICK PICK
            </div>

            <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
              {/* Camera */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="shrink-0 grid place-items-center"
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 12,
                  background: "rgba(0,0,0,0.04)",
                  border: `1px solid ${palette.line}`,
                }}
                aria-label="Camera"
                title="Camera"
                disabled={isUploading || recording}
              >
                <Camera className="w-5 h-5" style={{ color: "rgba(0,0,0,0.55)" }} />
              </button>

              {/* Record audio */}
              <button
                type="button"
                onClick={recording ? stopRec : startRec}
                className="shrink-0 grid place-items-center"
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 12,
                  background: recording ? "rgba(255,77,46,0.12)" : "rgba(0,0,0,0.04)",
                  border: `1px solid ${palette.line}`,
                  opacity: isUploading ? 0.6 : 1,
                }}
                aria-label={recording ? "Stop recording" : "Record audio"}
                title={recording ? `Stop (${seconds}s)` : "Record audio"}
                disabled={isUploading}
              >
                {recording ? (
                  <div className="flex flex-col items-center">
                    <Square className="w-5 h-5" style={{ color: "rgba(255,77,46,0.95)" }} />
                    <div className="mt-1 text-[10px] font-semibold" style={{ color: "rgba(0,0,0,0.55)" }}>
                      {seconds}s
                    </div>
                  </div>
                ) : (
                  <Mic className="w-5 h-5" style={{ color: "rgba(0,0,0,0.55)" }} />
                )}
              </button>

              {recentThumbs.length === 0 ? (
                <div
                  className="shrink-0 flex items-center"
                  style={{ color: "rgba(0,0,0,0.35)", fontSize: 12 }}
                >
                  No recent uploads yet.
                </div>
              ) : (
                recentThumbs.map((t) => (
                  <div
                    key={t.id}
                    className="shrink-0 overflow-hidden"
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 12,
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

          {/* Session picker */}
          <div className="px-6 pb-4">
            <button
              type="button"
              onClick={() => setShowSessionPicker((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-3"
              style={{
                borderRadius: 12,
                background: "rgba(255,255,255,0.70)",
                border: `1px solid ${palette.line}`,
                color: "rgba(0,0,0,0.75)",
              }}
              disabled={isUploading || recording}
            >
              <div className="text-[12px] font-semibold">
                Add to{" "}
                <span style={{ color: "rgba(0,0,0,0.45)", fontWeight: 600 }}>
                  {currentSessionLabel}
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
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.62)",
                  border: `1px solid ${palette.line}`,
                }}
              >
                <div className="flex gap-2 mb-2">
                  {existingSessions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSessionMode("existing")}
                      className="flex-1 py-2 text-[11px] font-semibold tracking-[0.18em]"
                      disabled={isUploading || recording}
                      style={{
                        borderRadius: 10,
                        border: `1px solid ${palette.line}`,
                        background:
                          sessionMode === "existing"
                            ? "rgba(255,255,255,0.82)"
                            : "rgba(255,255,255,0.40)",
                        color:
                          sessionMode === "existing"
                            ? "rgba(0,0,0,0.80)"
                            : "rgba(0,0,0,0.45)",
                        textTransform: "uppercase",
                      }}
                    >
                      Existing
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSessionMode("new")}
                    className="flex-1 py-2 text-[11px] font-semibold tracking-[0.18em]"
                    disabled={isUploading || recording}
                    style={{
                      borderRadius: 10,
                      border: `1px solid ${palette.line}`,
                      background:
                        sessionMode === "new"
                          ? "rgba(255,255,255,0.82)"
                          : "rgba(255,255,255,0.40)",
                      color:
                        sessionMode === "new"
                          ? "rgba(0,0,0,0.80)"
                          : "rgba(0,0,0,0.45)",
                      textTransform: "uppercase",
                    }}
                  >
                    New
                  </button>
                </div>

                {sessionMode === "existing" ? (
                  <select
                    className="w-full px-3 py-3 text-sm font-semibold outline-none"
                    disabled={isUploading || recording || existingSessions.length === 0}
                    style={{
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.70)",
                      border: `1px solid ${palette.line}`,
                      color: "rgba(0,0,0,0.78)",
                      opacity: isUploading ? 0.6 : 1,
                    }}
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                  >
                    {existingSessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Session name (e.g. Second fitting)"
                    className="w-full px-3 py-3 text-sm font-semibold outline-none"
                    disabled={isUploading || recording}
                    style={{
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.70)",
                      border: `1px solid ${palette.line}`,
                      color: "rgba(0,0,0,0.78)",
                      opacity: isUploading ? 0.6 : 1,
                    }}
                    value={newSessionTitle}
                    onChange={(e) => setNewSessionTitle(e.target.value)}
                  />
                )}
              </div>
            )}
          </div>

          {/* Selected strip */}
          <div className="px-6 pb-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-semibold tracking-[0.18em] text-black/45">
                SELECTED ({files.length}/5)
              </div>

              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                disabled={isUploading || recording || files.length >= 5}
                className="h-8 px-3 inline-flex items-center gap-2 text-[11px] font-semibold"
                style={{
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.70)",
                  border: `1px solid ${palette.line}`,
                  color: "rgba(0,0,0,0.72)",
                  opacity: isUploading || recording || files.length >= 5 ? 0.5 : 1,
                }}
              >
                <Plus className="w-4 h-4" /> Add more
              </button>
            </div>

            {files.length === 0 ? (
              <div
                className="px-3 py-3"
                style={{
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.62)",
                  border: `1px solid ${palette.line}`,
                  color: "rgba(0,0,0,0.40)",
                  fontSize: 12,
                }}
              >
                Pick up to 5 photos/videos/audio. They’ll upload automatically.
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {files.map((f, idx) => {
                  const isAudio = (f?.type || "").startsWith("audio");
                  const url = previews[idx] || "";

                  return (
                    <div
                      key={`${f.name}-${idx}`}
                      className="shrink-0 relative overflow-hidden"
                      style={{
                        width: 88,
                        height: 88,
                        borderRadius: 12,
                        border: `1px solid ${palette.line}`,
                        background: "rgba(255,255,255,0.55)",
                      }}
                    >
                      {isAudio ? (
                        <div className="w-full h-full flex flex-col items-center justify-center">
                          <AudioLines className="w-5 h-5" style={{ color: "rgba(0,0,0,0.55)" }} />
                          <div
                            className="mt-2 px-2 text-[10px] font-semibold text-center"
                            style={{ color: "rgba(0,0,0,0.55)" }}
                          >
                            Audio
                          </div>
                        </div>
                      ) : (
                        <img
                          src={url}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          draggable={false}
                        />
                      )}

                      {!isUploading && !uploaded && (
                        <button
                          type="button"
                          onClick={() => removeAt(idx)}
                          className="absolute top-2 right-2 w-7 h-7 grid place-items-center"
                          style={{
                            borderRadius: 999,
                            background: "rgba(255,255,255,0.82)",
                            border: `1px solid ${palette.line}`,
                            color: "rgba(0,0,0,0.70)",
                            backdropFilter: "blur(10px)",
                          }}
                          aria-label="Remove"
                          title="Remove"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer status */}
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{
              borderTop: `1px solid ${palette.line}`,
              background: "rgba(255,255,255,0.55)",
            }}
          >
            <div className="text-xs font-semibold" style={{ color: "rgba(0,0,0,0.55)" }}>
              {recording
                ? "Recording…"
                : isUploading
                ? "Uploading…"
                : uploaded
                ? "Uploaded. Tap outside to close."
                : files.length
                ? "Ready to upload."
                : ""}
            </div>

            <div
              className="h-10 px-4 inline-flex items-center gap-2"
              style={{
                borderRadius: 12,
                background: recording
                  ? "rgba(255,77,46,0.14)"
                  : isUploading
                  ? "rgba(0,0,0,0.06)"
                  : uploaded
                  ? "rgba(84,230,193,0.16)"
                  : "rgba(255,234,58,0.18)",
                border: `1px solid ${palette.line}`,
                color: "rgba(0,0,0,0.70)",
              }}
            >
              {recording ? (
                <Mic className="w-4 h-4" />
              ) : isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span
                className="text-[11px] font-semibold tracking-[0.18em]"
                style={{ textTransform: "uppercase" }}
              >
                {recording ? "Recording" : isUploading ? "Saving" : uploaded ? "Saved" : "Ready"}
              </span>
            </div>
          </div>

          {/* Inputs */}
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
            accept="image/*,video/*,audio/*"
            multiple
            className="hidden"
            onChange={handleUploadPick}
          />
        </div>
      </div>
    </div>
  );
}
