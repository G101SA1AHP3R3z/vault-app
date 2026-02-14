// src/components/AddMediaModal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Camera, Upload, Image as ImageIcon, Video } from "lucide-react";

export default function AddMediaModal({
  // Support BOTH prop names so App.jsx can't "miss" it
  open,
  isOpen,
  onClose,
  onAddMedia,
  mode = "upload", // "upload" | "camera"
  existingSessions = [],
}) {
  const OPEN = typeof isOpen === "boolean" ? isOpen : Boolean(open);

  const [sessionMode, setSessionMode] = useState("existing"); // "existing" | "new"
  const [sessionId, setSessionId] = useState("");
  const [newSessionTitle, setNewSessionTitle] = useState("");

  // Selected file state (works for upload AND camera capture)
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Camera state
  const [camOn, setCamOn] = useState(false);
  const [camError, setCamError] = useState("");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Reset whenever modal opens
  useEffect(() => {
    if (!OPEN) return;

    setSessionMode(existingSessions?.length ? "existing" : "new");
    setSessionId(existingSessions?.[0]?.id || "");
    setNewSessionTitle("");

    setCamOn(false);
    setCamError("");
    setIsSaving(false);

    // clear file + preview
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [OPEN, existingSessions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stop camera when modal closes
  useEffect(() => {
    if (!OPEN) stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [OPEN]);

  // Auto-start camera when opening in camera mode
  useEffect(() => {
    if (!OPEN) return;
    if (mode !== "camera") return;

    const t = setTimeout(() => {
      startCamera();
    }, 50);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [OPEN, mode]);

  const canSubmit = useMemo(() => {
    if (!selectedFile) return false;
    if (sessionMode === "existing") return Boolean(sessionId);
    return newSessionTitle.trim().length > 0;
  }, [selectedFile, sessionMode, sessionId, newSessionTitle]);

  const stopCamera = () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    } catch (e) {
      // ignore
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamOn(false);
  };

  const startCamera = async () => {
    setCamError("");

    // If user already picked a file, keep it (don’t clear)
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API not supported in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCamOn(true);
    } catch (e) {
      console.error(e);
      setCamOn(false);

      const msg =
        e?.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access in your browser."
          : e?.name === "NotFoundError"
          ? "No camera device found."
          : e?.name === "NotReadableError"
          ? "Camera is already in use by another app."
          : "Camera failed to start. Make sure you’re on HTTPS (or localhost) and allowed camera access.";

      setCamError(msg);
    }
  };

  const snapPhoto = async () => {
    setCamError("");
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;

    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, w, h);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) {
      setCamError("Snap failed. Try again.");
      return;
    }

    const f = new File([blob], `capture_${Date.now()}.jpg`, { type: "image/jpeg" });

    // Stop camera after capture
    stopCamera();

    // Preview
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(f);
    setSelectedFile(f);
    setPreviewUrl(url);
  };

  const onPickFile = (file) => {
    if (!file) return;

    stopCamera(); // if uploading, don’t keep camera running

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);

    setSelectedFile(file);
    setPreviewUrl(url);
    setCamError("");
  };

  const handleSubmit = async () => {
    if (!canSubmit || isSaving) return;

    setIsSaving(true);
    try {
      await onAddMedia({
        file: selectedFile,
        sessionId: sessionMode === "existing" ? sessionId : null,
        createNewSessionTitle: sessionMode === "new" ? newSessionTitle.trim() : null,
      });
      onClose?.();
    } catch (e) {
      console.error("AddMediaModal submit error:", e);
      setIsSaving(false);
      alert(e?.message || "Save failed. Check console.");
    }
  };

  if (!OPEN) return null;

  const isVideo = selectedFile?.type?.startsWith("video/");

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      {/* Backdrop */}
      <button className="absolute inset-0 bg-black/60" onClick={onClose} aria-label="Close" />

      {/* Modal */}
      <div className="relative w-[92vw] max-w-xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-tight text-gray-500">
              Add Media
            </p>
            <h3 className="text-lg font-black tracking-tight text-gray-900">
              {mode === "camera" ? "Camera Capture" : "Upload Files"}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl border border-gray-200 hover:bg-gray-50 flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Session selection */}
          <div className="space-y-2">
            <p className="text-xs font-black uppercase tracking-tight text-gray-500">
              Session
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSessionMode("existing")}
                className={`flex-1 px-3 py-2 rounded-xl border text-sm font-black uppercase tracking-tight transition ${
                  sessionMode === "existing"
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50"
                }`}
                disabled={!existingSessions?.length}
              >
                Existing
              </button>

              <button
                type="button"
                onClick={() => setSessionMode("new")}
                className={`flex-1 px-3 py-2 rounded-xl border text-sm font-black uppercase tracking-tight transition ${
                  sessionMode === "new"
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50"
                }`}
              >
                New
              </button>
            </div>

            {sessionMode === "existing" ? (
              <select
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
                disabled={!existingSessions?.length}
              >
                {existingSessions?.length ? (
                  existingSessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title || "Untitled Session"}
                    </option>
                  ))
                ) : (
                  <option value="">No sessions yet</option>
                )}
              </select>
            ) : (
              <input
                value={newSessionTitle}
                onChange={(e) => setNewSessionTitle(e.target.value)}
                placeholder="New session title (e.g. Initial Fitting)"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black"
              />
            )}
          </div>

          {/* MODE: CAMERA */}
          {mode === "camera" && (
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-tight text-gray-500">
                Camera
              </p>

              <div className="border border-gray-200 rounded-xl overflow-hidden bg-black">
                {camOn ? (
                  <div className="relative">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="w-full max-h-72 object-contain bg-black"
                    />
                    <div className="p-3 bg-white border-t border-gray-200 flex gap-2">
                      <button
                        onClick={snapPhoto}
                        className="flex-1 px-4 py-3 rounded-xl bg-black text-white font-black uppercase text-xs tracking-tight flex items-center justify-center gap-2 active:scale-[0.99] transition"
                        type="button"
                      >
                        <Camera className="w-4 h-4" />
                        Snap Photo
                      </button>
                      <button
                        onClick={stopCamera}
                        className="px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-800 font-black uppercase text-xs tracking-tight hover:bg-gray-50"
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : previewUrl ? (
                  <div className="bg-white">
                    <img src={previewUrl} alt="Captured" className="w-full max-h-72 object-contain bg-black" />
                    <div className="p-3 border-t border-gray-200 flex gap-2">
                      <button
                        onClick={startCamera}
                        className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-800 font-black uppercase text-xs tracking-tight hover:bg-gray-50 flex items-center justify-center gap-2"
                        type="button"
                      >
                        <Camera className="w-4 h-4" />
                        Retake
                      </button>
                      <div className="px-3 py-3 rounded-xl bg-gray-50 border border-gray-200 flex items-center gap-2 text-xs font-bold text-gray-700">
                        <ImageIcon className="w-4 h-4" />
                        Ready to save
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-white space-y-3">
                    <button
                      onClick={startCamera}
                      className="w-full px-4 py-3 rounded-xl bg-black text-white font-black uppercase text-xs tracking-tight flex items-center justify-center gap-2 active:scale-[0.99] transition"
                      type="button"
                    >
                      <Camera className="w-4 h-4" />
                      Open Camera
                    </button>

                    <p className="text-[11px] text-gray-500 leading-snug">
                      Camera needs HTTPS (or localhost) and browser permission.
                    </p>

                    {camError && (
                      <div className="text-[12px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
                        {camError}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}

          {/* MODE: UPLOAD */}
          {mode === "upload" && (
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-tight text-gray-500">
                File Upload
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => onPickFile(e.target.files?.[0])}
              />

              {!previewUrl ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-3 rounded-xl bg-black text-white font-black uppercase text-xs tracking-tight flex items-center justify-center gap-2 active:scale-[0.99] transition"
                >
                  <Upload className="w-4 h-4" />
                  Choose File
                </button>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-black">
                  {isVideo ? (
                    <video src={previewUrl} controls className="w-full max-h-72 object-contain bg-black" />
                  ) : (
                    <img src={previewUrl} alt="Preview" className="w-full max-h-72 object-contain bg-black" />
                  )}

                  <div className="p-3 bg-white border-t border-gray-200 flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-800 font-black uppercase text-xs tracking-tight hover:bg-gray-50 flex items-center justify-center gap-2"
                    >
                      {isVideo ? <Video className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                      Choose Different
                    </button>
                    <div className="px-3 py-3 rounded-xl bg-gray-50 border border-gray-200 flex items-center gap-2 text-xs font-bold text-gray-700">
                      <Upload className="w-4 h-4" />
                      Ready to save
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-800 font-black uppercase text-xs tracking-tight hover:bg-gray-50"
            type="button"
          >
            Close
          </button>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isSaving}
            className={`px-5 py-3 rounded-xl font-black uppercase text-xs tracking-tight transition ${
              canSubmit && !isSaving
                ? "bg-black text-white hover:opacity-90 active:scale-[0.99]"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
            type="button"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
