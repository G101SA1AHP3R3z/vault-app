import React, { useEffect, useRef, useState } from "react";
import { X, Upload, Camera, Check, RefreshCw } from "lucide-react";

export default function AddMediaModal({
  open,
  isOpen,
  onClose,
  onAddMedia,
  existingSessions = [],
}) {
  const OPEN = typeof isOpen === "boolean" ? isOpen : Boolean(open);

  const [sessionMode, setSessionMode] = useState("existing"); // "existing" | "new"
  const [sessionId, setSessionId] = useState("");
  const [newSessionTitle, setNewSessionTitle] = useState("");

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const cameraInputRef = useRef(null);
  const uploadInputRef = useRef(null);

  useEffect(() => {
    if (OPEN) {
      setSessionMode(existingSessions.length > 0 ? "existing" : "new");
      setSessionId(existingSessions[0]?.id || "");
      setNewSessionTitle("");
      setSelectedFile(null);
      setPreviewUrl("");
      setIsSaving(false);
    } else {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [OPEN]);

  const handleFileSelect = (file) => {
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleCameraPick = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    e.target.value = "";
  };

  const handleUploadPick = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    e.target.value = "";
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    setIsSaving(true);
    try {
      await onAddMedia({
        file: selectedFile,
        sessionId: sessionMode === "existing" ? sessionId : null,
        sessionTitle: sessionMode === "new" ? newSessionTitle : "",
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!OPEN) return null;

  const isVideo = selectedFile?.type?.startsWith("video");

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 flex justify-between items-center border-b border-gray-100">
          <h2 className="text-lg font-black uppercase tracking-tight">Add Media</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto">
          {/* Session selector */}
          <div className="mb-6 space-y-3">
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
              {existingSessions.length > 0 && (
                <button
                  onClick={() => setSessionMode("existing")}
                  className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${
                    sessionMode === "existing" ? "bg-white shadow-sm text-black" : "text-gray-400"
                  }`}
                >
                  Existing Session
                </button>
              )}
              <button
                onClick={() => setSessionMode("new")}
                className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${
                  sessionMode === "new" ? "bg-white shadow-sm text-black" : "text-gray-400"
                }`}
              >
                New Session
              </button>
            </div>

            {sessionMode === "existing" ? (
              <select
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 ring-black outline-none"
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
                placeholder="Session Name (e.g. Second Fitting)"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 ring-black outline-none"
                value={newSessionTitle}
                onChange={(e) => setNewSessionTitle(e.target.value)}
              />
            )}
          </div>

          {/* Preview / chooser */}
          <div className="relative aspect-[4/3] bg-black rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
            {previewUrl ? (
              <>
                {isVideo ? (
                  <video src={previewUrl} className="w-full h-full object-contain" controls />
                ) : (
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                )}

                <button
                  onClick={() => {
                    if (previewUrl) URL.revokeObjectURL(previewUrl);
                    setPreviewUrl("");
                    setSelectedFile(null);
                  }}
                  className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full backdrop-blur-md hover:bg-black"
                  aria-label="Clear"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 p-6 text-center">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center gap-2 px-5 py-3 bg-white text-black rounded-xl font-bold text-sm shadow-lg active:scale-95"
                >
                  <Camera className="w-4 h-4" /> Take Photo / Video
                </button>

                <span className="text-gray-500 text-xs font-mono uppercase">OR</span>

                <button
                  onClick={() => uploadInputRef.current?.click()}
                  className="flex items-center gap-2 px-5 py-3 bg-gray-800 text-white rounded-xl font-bold text-sm shadow-lg active:scale-95"
                >
                  <Upload className="w-4 h-4" /> Choose From Files
                </button>

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
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 text-sm font-bold text-gray-500 hover:text-black">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedFile || isSaving}
            className="flex-[2] py-3 bg-black text-white rounded-xl font-bold text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving ? "Saving..." : (
              <>
                <Check className="w-4 h-4" /> Save Media
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
