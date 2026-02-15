import React, { useEffect, useRef, useState } from "react";
import { X, Camera, Upload, Image as ImageIcon, Video, RefreshCw, Check } from "lucide-react";

export default function AddMediaModal({
  open,
  isOpen, // Support both prop names
  onClose,
  onAddMedia,
  mode = "upload", // "upload" | "camera"
  existingSessions = [],
}) {
  const OPEN = typeof isOpen === "boolean" ? isOpen : Boolean(open);

  const [sessionMode, setSessionMode] = useState("existing"); // "existing" | "new"
  const [sessionId, setSessionId] = useState("");
  const [newSessionTitle, setNewSessionTitle] = useState("");

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Camera State
  const [camActive, setCamActive] = useState(false);
  const [camError, setCamError] = useState("");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Reset state when opened
  useEffect(() => {
    if (OPEN) {
      setSessionMode(existingSessions.length > 0 ? "existing" : "new");
      setSessionId(existingSessions[0]?.id || "");
      setNewSessionTitle("");
      setSelectedFile(null);
      setPreviewUrl("");
      setIsSaving(false);
      setCamActive(false);
      setCamError("");

      // If opening directly in camera mode, start it
      if (mode === "camera") startCamera();
    } else {
      stopCamera();
    }
  }, [OPEN, mode, existingSessions]);

  // --- CAMERA LOGIC ---
  const startCamera = async () => {
    try {
      setCamActive(true);
      setCamError("");
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Prefer back camera
        audio: false,
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera failed", err);
      setCamError("Camera access denied. Check permissions.");
      setCamActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCamActive(false);
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const width = videoRef.current.videoWidth;
    const height = videoRef.current.videoHeight;
    const ctx = canvasRef.current.getContext("2d");

    canvasRef.current.width = width;
    canvasRef.current.height = height;
    ctx.drawImage(videoRef.current, 0, 0, width, height);

    // Convert to file
    canvasRef.current.toBlob((blob) => {
      const file = new File([blob], `cam-${Date.now()}.jpg`, { type: "image/jpeg" });
      handleFileSelect(file);
      stopCamera(); // Turn off camera after snap
    }, "image/jpeg", 0.9);
  };

  // --- FILE HANDLING ---
  const handleFileSelect = (file) => {
    if (!file) return;
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleInputCheck = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    setIsSaving(true);
    
    // Pass data back to App
    await onAddMedia({
      file: selectedFile,
      sessionId: sessionMode === "existing" ? sessionId : null,
      sessionTitle: sessionMode === "new" ? newSessionTitle : "",
    });
    
    setIsSaving(false);
    onClose();
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
          
          {/* 1. SESSION SELECTOR */}
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

          {/* 2. CAMERA / PREVIEW AREA */}
          <div className="relative aspect-[4/3] bg-black rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
            
            {/* LIVE CAMERA */}
            {camActive && !previewUrl && (
               <>
                 <video
                    ref={videoRef}
                    autoPlay
                    playsInline // <--- CRITICAL FOR IOS
                    muted
                    className="w-full h-full object-cover"
                 />
                 <button 
                    onClick={takePhoto}
                    className="absolute bottom-4 w-16 h-16 rounded-full border-4 border-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                 >
                   <div className="w-12 h-12 bg-white rounded-full" />
                 </button>
               </>
            )}

            {/* ERROR STATE */}
            {camError && !previewUrl && (
              <div className="text-white text-center p-4">
                <p className="text-sm font-bold mb-2">{camError}</p>
                <button onClick={startCamera} className="px-4 py-2 bg-white text-black text-xs font-bold rounded-lg">Try Again</button>
              </div>
            )}

            {/* CAPTURED PREVIEW */}
            {previewUrl && (
              <>
                {isVideo ? (
                  <video src={previewUrl} className="w-full h-full object-contain" controls />
                ) : (
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                )}
                <button 
                  onClick={() => { setPreviewUrl(""); setSelectedFile(null); startCamera(); }}
                  className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full backdrop-blur-md hover:bg-black"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </>
            )}

            {/* EMPTY STATE */}
            {!camActive && !previewUrl && !camError && (
               <div className="flex flex-col items-center gap-3">
                  <button 
                    onClick={startCamera}
                    className="flex items-center gap-2 px-5 py-3 bg-white text-black rounded-xl font-bold text-sm shadow-lg active:scale-95"
                  >
                    <Camera className="w-4 h-4" /> Open Camera
                  </button>
                  <span className="text-gray-500 text-xs font-mono uppercase">OR</span>
                  <label className="flex items-center gap-2 px-5 py-3 bg-gray-800 text-white rounded-xl font-bold text-sm shadow-lg active:scale-95 cursor-pointer">
                    <Upload className="w-4 h-4" /> Upload File
                    <input 
                      ref={fileInputRef} 
                      type="file" 
                      accept="image/*,video/*" 
                      className="hidden" 
                      onChange={handleInputCheck}
                    />
                  </label>
               </div>
            )}
            
            {/* Hidden Canvas for capture */}
            <canvas ref={canvasRef} className="hidden" />
          </div>

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3">
           <button onClick={onClose} className="flex-1 py-3 text-sm font-bold text-gray-500 hover:text-black">Cancel</button>
           <button 
             onClick={handleSubmit}
             disabled={!selectedFile || isSaving}
             className="flex-[2] py-3 bg-black text-white rounded-xl font-bold text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
           >
             {isSaving ? "Saving..." : <><Check className="w-4 h-4" /> Save Media</>}
           </button>
        </div>
      </div>
    </div>
  );
}