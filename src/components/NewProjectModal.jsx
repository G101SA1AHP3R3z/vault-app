import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Tag, Mic, Save, MicOff, Play, Square } from "lucide-react";

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

async function startAudioRecording({ onTick, onSpeechChunk }) {
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

  // Optional: SpeechRecognition live transcript (best-effort)
  let recognition = null;
  try {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      recognition = new SR();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.onresult = (event) => {
        let finalText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) finalText += `${res[0].transcript} `;
        }
        if (finalText.trim()) onSpeechChunk?.(finalText.trim());
      };
      recognition.start();
    }
  } catch {
    recognition = null;
  }

  const stop = () =>
    new Promise((resolve) => {
      recorder.onstop = () => {
        clearInterval(interval);
        stream.getTracks().forEach((tr) => tr.stop());
        try {
          recognition?.stop?.();
        } catch {}

        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        const ext = blob.type.includes("mp4") ? "m4a" : "webm";
        const file = new File([blob], `overview_${Date.now()}.${ext}`, { type: blob.type });

        resolve(file);
      };
      recorder.stop();
    });

  recorder.start();
  return { stop };
}

export default function NewProjectModal({ open, onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [tagText, setTagText] = useState("");
  const [note, setNote] = useState("");

  // Voice dictation (to NOTE)
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState(null);

  // NEW: Overview audio recording
  const [isRecordingOverview, setIsRecordingOverview] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [overviewFile, setOverviewFile] = useState(null);
  const [overviewUrl, setOverviewUrl] = useState("");
  const [overviewTranscript, setOverviewTranscript] = useState("");

  const recorderRef = useRef(null);
  const audioRef = useRef(null);

  // Prevent double-submit
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitRef = useRef(() => {});
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
    if (open) {
      setTitle("");
      setTagText("");
      setNote("");
      setIsListening(false);
      setSpeechError(null);
      setIsSubmitting(false);

      setIsRecordingOverview(false);
      setRecordSeconds(0);
      setOverviewFile(null);
      setOverviewTranscript("");
      if (overviewUrl) {
        try {
          URL.revokeObjectURL(overviewUrl);
        } catch {}
      }
      setOverviewUrl("");
      recorderRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Speech recognition for NOTE field (your existing behavior)
  const toggleMic = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser doesn't support voice dictation. Try Chrome or Safari.");
      return;
    }
    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setSpeechError(null);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setNote((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };

    recognition.onerror = (event) => {
      console.error("Speech error:", event.error);
      setSpeechError("Didn't catch that.");
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const tags = useMemo(() => {
    return tagText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 8);
  }, [tagText]);

  const canCreate = title.trim().length >= 2;

  // Overview recording controls
  const startOverview = async () => {
    if (isSubmitting) return;
    if (isRecordingOverview) return;

    // clear prior preview
    if (overviewUrl) {
      try {
        URL.revokeObjectURL(overviewUrl);
      } catch {}
      setOverviewUrl("");
    }
    setOverviewFile(null);
    setOverviewTranscript("");

    try {
      setRecordSeconds(0);
      setIsRecordingOverview(true);
      recorderRef.current = await startAudioRecording({
        onTick: setRecordSeconds,
        onSpeechChunk: (chunk) => {
          // accumulate speech chunks
          setOverviewTranscript((prev) => (prev ? `${prev} ${chunk}` : chunk));
        },
      });
    } catch (e) {
      console.error(e);
      setIsRecordingOverview(false);
      recorderRef.current = null;
      alert("Microphone permission denied (or not available).");
    }
  };

  const stopOverview = async () => {
    if (!recorderRef.current) return;
    try {
      const file = await recorderRef.current.stop();
      recorderRef.current = null;
      setIsRecordingOverview(false);
      setRecordSeconds(0);

      setOverviewFile(file);
      const url = URL.createObjectURL(file);
      setOverviewUrl(url);
      setTimeout(() => audioRef.current?.load?.(), 0);
    } catch (e) {
      console.error(e);
      recorderRef.current = null;
      setIsRecordingOverview(false);
      setRecordSeconds(0);
      alert("Recording failed. Check console.");
    }
  };

  const discardOverview = () => {
    if (isRecordingOverview) return;
    setPerfectStop();
  };

  const setPerfectStop = () => {
    setOverviewFile(null);
    setOverviewTranscript("");
    if (overviewUrl) {
      try {
        URL.revokeObjectURL(overviewUrl);
      } catch {}
    }
    setOverviewUrl("");
  };

  const submit = async () => {
    if (!canCreate) return;
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await onCreate({
        title: title.trim(),
        tags,
        note: note.trim(),

        // NEW payload
        overviewAudioFile: overviewFile,
        overviewTranscript: (overviewTranscript || "").trim(),
      });
    } finally {
      setTimeout(() => setIsSubmitting(false), 300);
    }
  };

  useEffect(() => {
    submitRef.current = submit;
  }, [title, tagText, note, canCreate, isSubmitting, overviewFile, overviewTranscript]); // eslint-disable-line

  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (!openRef.current) return;

      if (e.key === "Escape") onClose();

      if (e.key === "Enter" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        submitRef.current?.();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => {
          if (!isSubmitting && !isRecordingOverview) onClose();
        }}
      />

      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
        <div className="px-6 py-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black uppercase tracking-tight">New Project</h2>
            <button
              onClick={() => {
                if (!isSubmitting && !isRecordingOverview) onClose();
              }}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
              disabled={isSubmitting || isRecordingOverview}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                Client / Project Name
              </label>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Johnston Tuxedo"
                className="w-full text-xl font-bold border-b-2 border-gray-100 focus:border-black outline-none pb-2 transition-colors placeholder:font-normal placeholder:text-gray-300"
                disabled={isSubmitting || isRecordingOverview}
              />
            </div>

            {/* Initial Notes (typed) */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex justify-between">
                <span>Initial Context (typed)</span>
                {speechError && <span className="text-red-500 normal-case">{speechError}</span>}
                {isListening && (
                  <span className="text-red-500 animate-pulse normal-case">Listening...</span>
                )}
              </label>

              <div className="relative">
                <textarea
                  rows="3"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional. Quick typed context..."
                  className={`w-full bg-gray-50 rounded-xl p-4 text-sm focus:ring-2 outline-none transition-all resize-none ${
                    isListening ? "ring-2 ring-red-500 bg-red-50" : "ring-black"
                  }`}
                  disabled={isSubmitting || isRecordingOverview}
                />

                <button
                  type="button"
                  onClick={toggleMic}
                  disabled={isSubmitting || isRecordingOverview}
                  className={`absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 disabled:opacity-50 ${
                    isListening
                      ? "bg-red-500 text-white animate-pulse"
                      : "bg-gray-200 text-gray-600 hover:bg-black hover:text-white"
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* NEW: Voice overview (record + keep) */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center justify-between">
                <span>Project Overview (voice note)</span>
                {isRecordingOverview ? (
                  <span className="text-red-500 animate-pulse normal-case">
                    Recording… {recordSeconds}s
                  </span>
                ) : overviewFile ? (
                  <span className="text-gray-500 normal-case">Recorded</span>
                ) : (
                  <span className="text-gray-400 normal-case">Optional</span>
                )}
              </label>

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  {!isRecordingOverview ? (
                    <button
                      type="button"
                      onClick={startOverview}
                      disabled={isSubmitting}
                      className="px-3 py-2 rounded-lg font-bold text-sm bg-black text-white hover:bg-gray-900 active:scale-[0.99] transition disabled:opacity-50"
                    >
                      Record
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopOverview}
                      className="px-3 py-2 rounded-lg font-bold text-sm bg-red-600 text-white hover:bg-red-700 active:scale-[0.99] transition"
                    >
                      Stop
                    </button>
                  )}

                  {overviewFile && !isRecordingOverview ? (
                    <button
                      type="button"
                      onClick={() => {
                        audioRef.current?.play?.();
                      }}
                      className="px-3 py-2 rounded-lg font-bold text-sm bg-white border border-gray-200 text-gray-800 hover:bg-gray-100 active:scale-[0.99] transition inline-flex items-center gap-2"
                      disabled={!overviewUrl}
                    >
                      <Play className="w-4 h-4" /> Play
                    </button>
                  ) : null}

                  {overviewFile && !isRecordingOverview ? (
                    <button
                      type="button"
                      onClick={setPerfectStop}
                      className="ml-auto px-3 py-2 rounded-lg font-bold text-sm bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 active:scale-[0.99] transition"
                    >
                      Discard
                    </button>
                  ) : null}
                </div>

                {overviewUrl ? (
                  <audio ref={audioRef} className="w-full mt-3" controls src={overviewUrl} />
                ) : null}

                <div className="mt-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                    Transcript (editable)
                  </div>
                  <textarea
                    rows="3"
                    value={overviewTranscript}
                    onChange={(e) => setOverviewTranscript(e.target.value)}
                    placeholder="We’ll auto-fill this while recording if supported. Otherwise you can type it."
                    className="w-full bg-white rounded-lg p-3 text-sm outline-none border border-gray-200 focus:ring-2 focus:ring-black resize-none"
                    disabled={isSubmitting || isRecordingOverview}
                  />
                </div>

                {isRecordingOverview ? (
                  <div className="mt-3 text-xs text-gray-500 flex items-center gap-2">
                    <Square className="w-3.5 h-3.5 text-red-600" />
                    We’ll keep the actual recording — transcript is best-effort.
                  </div>
                ) : null}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1">
                <Tag className="w-3 h-3" /> Tags (Comma separated)
              </label>
              <input
                value={tagText}
                onChange={(e) => setTagText(e.target.value)}
                placeholder="bridal, lace, alteration"
                className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black"
                disabled={isSubmitting || isRecordingOverview}
              />

              {tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] font-bold bg-white border border-gray-200 px-2 py-1 rounded text-gray-600 uppercase"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Create */}
          <div className="mt-8">
            <button
              onClick={submit}
              disabled={!canCreate || isSubmitting || isRecordingOverview}
              className={`w-full py-4 rounded-xl font-black flex items-center justify-center gap-2 transition active:scale-[0.99]
                ${
                  canCreate && !isSubmitting && !isRecordingOverview
                    ? "bg-black text-white hover:bg-gray-900 shadow-lg"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
            >
              <Save className="w-5 h-5" /> {isSubmitting ? "Saving..." : "Start Project"}
            </button>

            {isRecordingOverview ? (
              <div className="mt-3 text-xs text-gray-500">
                Stop recording before creating.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
