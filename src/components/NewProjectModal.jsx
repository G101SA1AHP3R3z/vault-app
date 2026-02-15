import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Tag, Mic, Save, MicOff } from "lucide-react";

export default function NewProjectModal({ open, onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [tagText, setTagText] = useState("");
  const [note, setNote] = useState("");

  // Voice State
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState(null);

  // ✅ Prevent double-submit
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Used by key handler to avoid stale closures
  const submitRef = useRef(() => {});
  const openRef = useRef(open);

  // Reset when opened
  useEffect(() => {
    openRef.current = open;
    if (open) {
      setTitle("");
      setTagText("");
      setNote("");
      setIsListening(false);
      setSpeechError(null);
      setIsSubmitting(false);
    }
  }, [open]);

  // --- SPEECH RECOGNITION LOGIC ---
  const toggleMic = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

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

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };
  // --------------------------------

  const tags = useMemo(() => {
    return tagText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 8);
  }, [tagText]);

  const canCreate = title.trim().length >= 2;

  const submit = async () => {
    if (!canCreate) return;
    if (isSubmitting) return; // ✅ lock
    setIsSubmitting(true);

    try {
      // Await so we don't allow a second submit while this is running
      await onCreate({
        title: title.trim(),
        tags,
        note: note.trim(),
      });
    } finally {
      // Modal usually closes from parent after create.
      // If it doesn't, unlock after a short beat so user can retry safely.
      setTimeout(() => setIsSubmitting(false), 300);
    }
  };

  // Keep latest submit in a ref for keydown handler
  useEffect(() => {
    submitRef.current = submit;
  }, [title, tagText, note, canCreate, isSubmitting]); // eslint-disable-line react-hooks/exhaustive-deps

  // ESC / Enter to close/submit (only attach once per open)
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (!openRef.current) return;

      if (e.key === "Escape") onClose();

      // Only enter-to-submit if not in textarea
      if (
        e.key === "Enter" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
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
          if (!isSubmitting) onClose();
        }}
      />

      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
        <div className="px-6 py-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black uppercase tracking-tight">
              New Project
            </h2>
            <button
              onClick={() => {
                if (!isSubmitting) onClose();
              }}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
              disabled={isSubmitting}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-5">
            {/* Title Input */}
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
                disabled={isSubmitting}
              />
            </div>

            {/* Initial Notes */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex justify-between">
                <span>Initial Context</span>
                {speechError && (
                  <span className="text-red-500 normal-case">{speechError}</span>
                )}
                {isListening && (
                  <span className="text-red-500 animate-pulse normal-case">
                    Listening...
                  </span>
                )}
              </label>
              <div className="relative">
                <textarea
                  rows="3"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Tap the mic and start talking..."
                  className={`w-full bg-gray-50 rounded-xl p-4 text-sm focus:ring-2 outline-none transition-all resize-none ${
                    isListening ? "ring-2 ring-red-500 bg-red-50" : "ring-black"
                  }`}
                  disabled={isSubmitting}
                />

                <button
                  type="button"
                  onClick={toggleMic}
                  disabled={isSubmitting}
                  className={`absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 disabled:opacity-50 ${
                    isListening
                      ? "bg-red-500 text-white animate-pulse"
                      : "bg-gray-200 text-gray-600 hover:bg-black hover:text-white"
                  }`}
                >
                  {isListening ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>
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
                disabled={isSubmitting}
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

          <div className="mt-8">
            <button
              onClick={submit}
              disabled={!canCreate || isSubmitting}
              className={`w-full py-4 rounded-xl font-black flex items-center justify-center gap-2 transition active:scale-[0.99]
                ${
                  canCreate && !isSubmitting
                    ? "bg-black text-white hover:bg-gray-900 shadow-lg"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
            >
              <Save className="w-5 h-5" />{" "}
              {isSubmitting ? "Saving..." : "Start Project"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
