import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  Play,
  Plus,
  Share2,
  Pencil,
  Trash2,
  MoreHorizontal,
  Mic,
  Square,
  X,
  Save,
} from "lucide-react";

function formatProjectDate(createdAt) {
  try {
    if (!createdAt) return "";
    if (typeof createdAt?.toDate === "function") {
      const d = createdAt.toDate();
      return d.toLocaleDateString(undefined, { month: "2-digit", day: "2-digit", year: "2-digit" });
    }
    if (typeof createdAt?.seconds === "number") {
      const d = new Date(createdAt.seconds * 1000);
      return d.toLocaleDateString(undefined, { month: "2-digit", day: "2-digit", year: "2-digit" });
    }
    const d = new Date(createdAt);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, { month: "2-digit", day: "2-digit", year: "2-digit" });
    }
  } catch {}
  return "";
}

function parseOverview(project) {
  const items = Array.isArray(project?.overviewItems) ? project.overviewItems.filter(Boolean) : [];
  if (items.length) return items.slice(0, 8);

  const raw = (project?.overview || "").trim();
  if (raw) {
    const lines = raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.replace(/^\d+\.\s*/, ""));
    if (lines.length) return lines.slice(0, 8);
  }

  // legacy fallback
  const fallback = (project?.overallAudio || "").trim();
  if (!fallback) return [];
  return fallback
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 4)
    .map((l) => l.replace(/^\d+\.\s*/, ""));
}

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

function KebabMenu({ items = [], palette }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="w-9 h-9 rounded-[8px] inline-flex items-center justify-center"
        style={{
          background: "rgba(255,255,255,0.92)",
          border: `1px solid ${palette?.line || "rgba(0,0,0,0.10)"}`,
          color: "rgba(0,0,0,0.70)",
        }}
        aria-label="More"
        title="More"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-52 overflow-hidden z-50"
          style={{
            borderRadius: 8,
            background: "rgba(255,255,255,0.95)",
            border: `1px solid ${palette?.line || "rgba(0,0,0,0.10)"}`,
            boxShadow: "0 18px 45px -38px rgba(0,0,0,0.45)",
          }}
        >
          {items.map((it, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                it?.onClick?.();
              }}
              className="w-full px-4 py-3 flex items-center gap-3 text-sm font-semibold text-left hover:bg-black/5"
              style={{ color: it?.danger ? "#DC2626" : "rgba(0,0,0,0.78)" }}
            >
              {it?.icon ? <it.icon className="w-4 h-4" /> : null}
              {it?.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProjectView({
  project,
  headerFont,
  palette,

  onBack,
  onNewProject,

  onEditProject,
  onShareProject,
  onArchiveProject,

  onOpenViewer,
  onAddPhotosForSession,
  onAddSession,

  onEditSession,
  onShareSession,
  onDeleteSession,

  // NEW props for overview audio/transcript
  onUploadOverviewAudio, // (projectId, file, transcriptRaw) => Promise
  onUpdateOverviewTranscript, // (projectId, text) => Promise
  onClearOverviewAudio, // (projectId) => Promise
}) {
  const audioRef = useRef(null);

  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef(null);

  const [localTranscript, setLocalTranscript] = useState("");
  const [dirtyTranscript, setDirtyTranscript] = useState(false);
  const [savingTranscript, setSavingTranscript] = useState(false);

  useEffect(() => {
    const t = (project?.overviewTranscriptEdited || project?.overviewTranscriptRaw || "").trim();
    setLocalTranscript(t);
    setDirtyTranscript(false);
  }, [project?.id, project?.overviewTranscriptEdited, project?.overviewTranscriptRaw]);

  const hasAudio = Boolean(project?.overviewAudioUrl);

  const startRec = async () => {
    if (!project?.id) return;
    if (recording) return;

    try {
      setSeconds(0);
      setRecording(true);
      setLocalTranscript("");
      setDirtyTranscript(false);

      recorderRef.current = await startAudioRecording({
        onTick: setSeconds,
        onSpeechChunk: (chunk) => {
          setLocalTranscript((prev) => (prev ? `${prev} ${chunk}` : chunk));
        },
      });
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

      await onUploadOverviewAudio?.(project.id, file, localTranscript);
    } catch (e) {
      console.error(e);
      recorderRef.current = null;
      setRecording(false);
      setSeconds(0);
      alert(e?.message || "Failed to save overview audio.");
    }
  };

  const saveTranscript = async () => {
    if (!project?.id) return;
    setSavingTranscript(true);
    try {
      await onUpdateOverviewTranscript?.(project.id, localTranscript);
      setDirtyTranscript(false);
    } catch (e) {
      console.error(e);
      alert(e?.message || "Failed to save transcript.");
    } finally {
      setSavingTranscript(false);
    }
  };

  if (!project) return null;

  const overviewLines = useMemo(() => parseOverview(project), [project]);

  return (
    <div className="px-6 pt-8 pb-28">
      {/* Top row */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full inline-flex items-center justify-center"
          style={{
            background: "rgba(255,255,255,0.90)",
            border: `1px solid ${palette.line}`,
            boxShadow: "0 18px 45px -40px rgba(0,0,0,0.35)",
          }}
          aria-label="Back"
          title="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={onNewProject}
          className="text-[12px] font-semibold tracking-[0.14em]"
          style={{ color: palette.accent }}
        >
          + NEW
        </button>
      </div>

      {/* Title + kebab */}
      <div className="mt-7 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div
            className="text-[22px] font-semibold tracking-[0.08em] uppercase"
            style={{ fontFamily: headerFont, color: "rgba(0,0,0,0.85)" }}
          >
            {(project.title || "Untitled").slice(0, 18)}
            {project.title && project.title.length > 18 ? " …" : ""}
          </div>

          <div className="mt-1 text-[12px]" style={{ color: "rgba(0,0,0,0.35)" }}>
            {formatProjectDate(project.createdAt) || ""}
          </div>

          {/* Overview audio controls */}
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            {hasAudio ? (
              <button
                onClick={() => audioRef.current?.play?.()}
                className="inline-flex items-center gap-2 text-[12px] font-semibold tracking-[0.12em]"
                style={{ color: palette.accent }}
              >
                <Play className="w-4 h-4" />
                PLAY OVERVIEW
              </button>
            ) : (
              <button
                onClick={startRec}
                className="inline-flex items-center gap-2 text-[12px] font-semibold tracking-[0.12em]"
                style={{ color: palette.accent }}
              >
                <Mic className="w-4 h-4" />
                RECORD OVERVIEW
              </button>
            )}

            {recording ? (
              <>
                <button
                  onClick={stopRec}
                  className="inline-flex items-center gap-2 text-[12px] font-semibold tracking-[0.12em]"
                  style={{ color: "rgba(220,38,38,0.95)" }}
                >
                  <Square className="w-4 h-4" />
                  STOP ({seconds}s)
                </button>
              </>
            ) : null}

            {hasAudio ? (
              <button
                onClick={() => {
                  if (confirm("Remove the current overview audio?")) onClearOverviewAudio?.(project.id);
                }}
                className="inline-flex items-center gap-2 text-[12px] font-semibold tracking-[0.12em]"
                style={{ color: "rgba(0,0,0,0.45)" }}
              >
                <X className="w-4 h-4" />
                CLEAR
              </button>
            ) : null}
          </div>

          {hasAudio ? (
            <audio
              ref={audioRef}
              className="mt-3 w-full max-w-[420px]"
              controls
              src={project.overviewAudioUrl}
            />
          ) : null}
        </div>

        <KebabMenu
          palette={palette}
          items={[
            { label: "Edit", icon: Pencil, onClick: onEditProject },
            { label: "Share", icon: Share2, onClick: onShareProject },
            { label: "Delete", icon: Trash2, danger: true, onClick: onArchiveProject },
          ]}
        />
      </div>

      {/* Transcript editor (only shows if audio exists or user recorded something) */}
      {(hasAudio || localTranscript) ? (
        <div className="mt-4">
          <div
            className="px-4 py-4"
            style={{
              background: "rgba(0,0,0,0.04)",
              borderRadius: 6,
              border: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-[12px] font-semibold tracking-[0.18em] text-black/45">
                TRANSCRIPT
              </div>

              <button
                onClick={saveTranscript}
                disabled={!dirtyTranscript || savingTranscript}
                className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em]"
                style={{
                  color: dirtyTranscript ? palette.accent : "rgba(0,0,0,0.35)",
                  opacity: savingTranscript ? 0.6 : 1,
                }}
              >
                <Save className="w-4 h-4" />
                {savingTranscript ? "SAVING" : "SAVE"}
              </button>
            </div>

            <textarea
              value={localTranscript}
              onChange={(e) => {
                setLocalTranscript(e.target.value);
                setDirtyTranscript(true);
              }}
              placeholder={
                project?.overviewTranscriptStatus === "processing"
                  ? "Transcribing… (or type it manually)"
                  : "Type or edit the transcript here."
              }
              rows={4}
              className="mt-3 w-full bg-white/70 rounded-md p-3 text-[13px] leading-relaxed text-black/70 outline-none resize-none"
              style={{ border: "1px solid rgba(0,0,0,0.06)" }}
            />

            <div className="mt-2 text-[12px] text-black/45">
              Status:{" "}
              <span style={{ color: "rgba(0,0,0,0.65)", fontWeight: 600 }}>
                {project?.overviewTranscriptStatus || (localTranscript ? "ready" : "none")}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Overview card (your existing list view) */}
      <div className="mt-5">
        <div
          className="px-4 py-4"
          style={{
            background: "rgba(0,0,0,0.04)",
            borderRadius: 6,
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <div className="text-[12px] font-semibold tracking-[0.18em] text-black/45">
            OVERVIEW
          </div>

          <ol className="mt-3 space-y-1 text-[13px] leading-relaxed text-black/70">
            {overviewLines.length ? (
              overviewLines.map((line, i) => (
                <li key={i}>
                  {i + 1}. {line}
                </li>
              ))
            ) : (
              <li style={{ listStyle: "none" }}>No overview yet.</li>
            )}
          </ol>
        </div>
      </div>

      {/* Sessions */}
      <div className="mt-10 space-y-10">
        {(project.sessions || []).map((session) => {
          const media = Array.isArray(session?.media) ? session.media : [];
          const thumbs = media.filter((m) => m?.url);

          return (
            <div key={session.id}>
              <div className="flex items-center justify-between gap-3">
                <div
                  className="text-[14px] font-semibold"
                  style={{ fontFamily: headerFont, color: "rgba(0,0,0,0.80)" }}
                >
                  [{session.title || "Session"}] …
                </div>

                <KebabMenu
                  palette={palette}
                  items={[
                    { label: "Edit", icon: Pencil, onClick: () => onEditSession?.(session) },
                    { label: "Share", icon: Share2, onClick: () => onShareSession?.(session) },
                    { label: "Delete", icon: Trash2, danger: true, onClick: () => onDeleteSession?.(session) },
                  ]}
                />
              </div>

              <div
                className="mt-3 flex gap-3 overflow-x-auto pb-2"
                style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}
              >
                <style>{`.hide-scrollbar::-webkit-scrollbar{display:none;}`}</style>

                <div className="flex gap-3 hide-scrollbar">
                  {thumbs.length ? (
                    thumbs.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => onOpenViewer?.(session.id, m.id)}
                        className="shrink-0 overflow-hidden"
                        style={{
                          width: 108,
                          height: 108,
                          borderRadius: 0,
                          background: "rgba(0,0,0,0.10)",
                          border: "1px solid rgba(0,0,0,0.06)",
                        }}
                        aria-label="Open photo"
                        title="Open photo"
                      >
                        <img
                          src={m.url}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                          draggable={false}
                        />
                      </button>
                    ))
                  ) : (
                    <div className="text-[12px] text-black/45 py-2">No photos yet.</div>
                  )}
                </div>
              </div>

              <button
                onClick={() => onAddPhotosForSession?.(session)}
                className="mt-3 text-[12px] font-semibold tracking-[0.12em]"
                style={{ color: palette.accent }}
              >
                ADD PHOTOS
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={onAddSession}
        className="mt-10 inline-flex items-center gap-2 px-4 py-3 text-[12px] font-semibold tracking-[0.12em]"
        style={{
          borderRadius: 6,
          border: `1px solid rgba(255,77,46,0.55)`,
          color: palette.accent,
          background: "transparent",
        }}
      >
        <Plus className="w-4 h-4" />
        [ADD SESSION]
      </button>

      {/* Danger zone */}
      <div className="mt-16 pt-10" style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}>
        <div className="text-[11px] font-semibold tracking-[0.18em] text-black/45">
          DANGER ZONE
        </div>

        <button
          onClick={onArchiveProject}
          className="mt-4 text-[12px] font-semibold tracking-[0.14em]"
          style={{ color: "rgba(220,38,38,0.95)" }}
        >
          ARCHIVE PROJECT
        </button>

        <div className="mt-2 text-[12px] text-black/45">
          Archives this project (you can restore later).
        </div>
      </div>
    </div>
  );
}
