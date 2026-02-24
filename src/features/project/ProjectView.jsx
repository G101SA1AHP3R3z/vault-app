import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Plus,
  Share2,
  Trash2,
  Mic,
  Play,
} from "lucide-react";

function formatShortDate(ts) {
  try {
    if (!ts) return "";
    if (typeof ts?.toDate === "function") {
      const d = ts.toDate();
      return d.toLocaleDateString(undefined, { month: "2-digit", day: "2-digit", year: "2-digit" });
    }
    if (typeof ts?.seconds === "number") {
      const d = new Date(ts.seconds * 1000);
      return d.toLocaleDateString(undefined, { month: "2-digit", day: "2-digit", year: "2-digit" });
    }
    const d = new Date(ts);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, { month: "2-digit", day: "2-digit", year: "2-digit" });
    }
  } catch {}
  return "";
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
          WebkitTapHighlightColor: "transparent",
        }}
        aria-label="More"
        title="More"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-56 overflow-hidden z-50"
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

function SectionHeader({ label }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-[11px] font-semibold tracking-[0.18em]" style={{ color: "rgba(0,0,0,0.42)" }}>
        {label}
      </div>
    </div>
  );
}

export default function ProjectView({
  project,
  headerFont,
  palette,

  onBack,
  onEditProject,
  onShareProject,
  onArchiveProject,

  onOpenViewer,
  onAddPhotosForSession,
  onAddSession,
  onEditSession,
  onShareSession,
  onDeleteSession,

  // NEW: session expanded view notes
  onUpdateSessionNotes,

  // NEW: brief + session voice notes
  onUpdateProjectBrief,
  onAddSessionVoiceNote,
  onPlaySessionVoiceNote,
  onEditSessionVoiceTranscript,
  onClearSessionVoiceNote,
}) {
  const [briefEdit, setBriefEdit] = useState(false);
  const [briefDraft, setBriefDraft] = useState("");

  // Session expanded view
  const [openSessionId, setOpenSessionId] = useState(null);
  const [sessionNotesDraft, setSessionNotesDraft] = useState("");
  const saveTimerRef = useRef(null);

  useEffect(() => {
    setBriefDraft((project?.briefText || "").toString());
    setOpenSessionId(null);
    setSessionNotesDraft("");
  }, [project?.id]);

  const sessions = useMemo(() => {
    const s = Array.isArray(project?.sessions) ? project.sessions : [];
    return s.slice().sort((a, b) => (b?.createdAt?.seconds || 0) - (a?.createdAt?.seconds || 0));
  }, [project?.sessions]);

  if (!project) return null;

  const accent = palette?.accent || "rgba(255,77,46,0.95)";
  const line = palette?.line || "rgba(0,0,0,0.10)";

  const openSession = (session) => {
    if (!session?.id) return;
    setOpenSessionId(session.id);
    setSessionNotesDraft((session?.notesText || "").toString());
  };

  const closeSession = () => {
    setOpenSessionId(null);
    setSessionNotesDraft("");
  };

  const activeSession = useMemo(() => {
    if (!openSessionId) return null;
    return sessions.find((s) => s?.id === openSessionId) || null;
  }, [openSessionId, sessions]);

  const scheduleSaveSessionNotes = (projectId, sessionId, text) => {
    if (!onUpdateSessionNotes) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(async () => {
      try {
        await onUpdateSessionNotes?.(projectId, sessionId, text);
      } catch (e) {
        console.error(e);
      }
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  const saveBrief = async () => {
    const next = (briefDraft || "").trim();
    try {
      await onUpdateProjectBrief?.(next);
      setBriefEdit(false);
    } catch (e) {
      alert(e?.message || "Could not save brief.");
    }
  };

  // -----------------------------
  // Expanded session view (card -> notes -> tap photo)
  // -----------------------------
  if (openSessionId && activeSession) {
    const media = Array.isArray(activeSession?.media) ? activeSession.media : [];
    const thumbs = media.filter((m) => m?.url);
    const count = thumbs.length;

    const hasVoice = !!activeSession?.voiceNoteUrl;
    const duration = activeSession?.voiceNoteDurationSec;
    const durationLabel =
      typeof duration === "number" && Number.isFinite(duration)
        ? `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, "0")}`
        : "";

    return (
      <div className="px-6 pt-8 pb-28">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={closeSession}
            className="w-10 h-10 rounded-full inline-flex items-center justify-center"
            style={{
              background: "rgba(255,255,255,0.90)",
              border: `1px solid ${line}`,
              boxShadow: "0 18px 45px -40px rgba(0,0,0,0.35)",
              WebkitTapHighlightColor: "transparent",
            }}
            aria-label="Back"
            title="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <KebabMenu
            palette={palette}
            items={[
              { label: "Edit session", icon: Pencil, onClick: () => onEditSession?.(activeSession) },
              { label: "Share", icon: Share2, onClick: () => onShareSession?.(activeSession) },
              {
                label: hasVoice ? "Replace voice note" : "Add voice note",
                icon: Mic,
                onClick: () => onAddSessionVoiceNote?.(activeSession),
              },
              hasVoice
                ? { label: "Edit transcript", icon: Pencil, onClick: () => onEditSessionVoiceTranscript?.(activeSession) }
                : null,
              hasVoice
                ? {
                    label: "Remove voice note",
                    icon: Trash2,
                    danger: true,
                    onClick: () => onClearSessionVoiceNote?.(activeSession),
                  }
                : null,
              { label: "Delete session", icon: Trash2, danger: true, onClick: () => onDeleteSession?.(activeSession) },
            ].filter(Boolean)}
          />
        </div>

        {/* Title */}
        <div className="mt-7">
          <div className="text-[20px] font-semibold" style={{ fontFamily: headerFont, color: "rgba(0,0,0,0.88)" }}>
            {activeSession.title || "Session"}
          </div>
          <div className="mt-1 text-[12px]" style={{ color: "rgba(0,0,0,0.38)" }}>
            {formatShortDate(activeSession.createdAt) || ""}
            {formatShortDate(activeSession.createdAt) ? " · " : ""}
            {count} {count === 1 ? "photo" : "photos"}
          </div>
        </div>

        {/* Notes */}
        <div className="mt-8">
          <SectionHeader label="NOTES" />
          <div
            className="mt-3"
            style={{
              background: "rgba(0,0,0,0.03)",
              border: "1px solid rgba(0,0,0,0.06)",
              borderRadius: 12,
            }}
          >
            <textarea
              value={sessionNotesDraft}
              onChange={(e) => {
                const next = e.target.value;
                setSessionNotesDraft(next);
                scheduleSaveSessionNotes(project.id, activeSession.id, next);
              }}
              onBlur={() => {
                if (onUpdateSessionNotes) {
                  onUpdateSessionNotes(project.id, activeSession.id, sessionNotesDraft).catch(() => {});
                }
              }}
              className="w-full bg-transparent outline-none text-[13px] leading-relaxed px-4 py-4"
              rows={6}
              placeholder="What happened in this session? Fit notes, changes, next steps…"
              style={{ color: "rgba(0,0,0,0.80)", resize: "none" }}
            />

            {!onUpdateSessionNotes ? (
              <div className="px-4 pb-4 text-[12px]" style={{ color: "rgba(0,0,0,0.45)" }}>
                (Pass <span className="font-semibold">onUpdateSessionNotes</span> from App to enable autosave.)
              </div>
            ) : null}
          </div>
        </div>

        {/* Photos (tap -> MediaViewer) */}
        <div className="mt-10">
          <SectionHeader label="PHOTOS" />

          <div className="mt-4 flex gap-3 overflow-x-auto pb-2" style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
            <style>{`.hide-scrollbar::-webkit-scrollbar{display:none;}`}</style>
            <div className="flex gap-3 hide-scrollbar">
              {thumbs.length ? (
                thumbs.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onOpenViewer?.(activeSession.id, m.id)}
                    className="shrink-0 overflow-hidden"
                    style={{
                      width: 118,
                      height: 118,
                      borderRadius: 12,
                      background: "rgba(0,0,0,0.10)",
                      border: "1px solid rgba(0,0,0,0.06)",
                      WebkitTapHighlightColor: "transparent",
                    }}
                    aria-label="Open photo"
                    title="Open photo"
                  >
                    <img src={m.url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" draggable={false} />
                  </button>
                ))
              ) : (
                <div className="text-[13px]" style={{ color: "rgba(0,0,0,0.50)" }}>
                  No photos yet.
                </div>
              )}
            </div>
          </div>

          {hasVoice ? (
            <button
              onClick={() => onPlaySessionVoiceNote?.(activeSession)}
              className="mt-3 inline-flex items-center gap-2 text-[12px] font-semibold"
              style={{ color: "rgba(0,0,0,0.70)", WebkitTapHighlightColor: "transparent" }}
            >
              <Play className="w-4 h-4" style={{ color: accent }} />
              Voice note {durationLabel ? `· ${durationLabel}` : ""}
            </button>
          ) : null}

          <div className="mt-4 flex items-center gap-5">
            <button
              onClick={() => onAddPhotosForSession?.(activeSession)}
              className="text-[12px] font-semibold tracking-[0.12em]"
              style={{ color: accent, WebkitTapHighlightColor: "transparent" }}
            >
              ADD PHOTOS
            </button>

            {!hasVoice ? (
              <button
                onClick={() => onAddSessionVoiceNote?.(activeSession)}
                className="text-[12px] font-semibold"
                style={{ color: "rgba(0,0,0,0.55)", WebkitTapHighlightColor: "transparent" }}
              >
                + Add voice note
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 pt-8 pb-28">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full inline-flex items-center justify-center"
          style={{
            background: "rgba(255,255,255,0.90)",
            border: `1px solid ${line}`,
            boxShadow: "0 18px 45px -40px rgba(0,0,0,0.35)",
            WebkitTapHighlightColor: "transparent",
          }}
          aria-label="Back"
          title="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <KebabMenu
          palette={palette}
          items={[
            { label: "Edit project", icon: Pencil, onClick: onEditProject },
            { label: "Share", icon: Share2, onClick: onShareProject },
            { label: "Archive", icon: Trash2, danger: true, onClick: onArchiveProject },
          ]}
        />
      </div>

      {/* Title stack */}
      <div className="mt-7">
        <div
          className="text-[22px] font-semibold tracking-[0.08em] uppercase"
          style={{ fontFamily: headerFont, color: "rgba(0,0,0,0.88)" }}
        >
          {project.title || "Untitled"}
        </div>
        <div className="mt-1 text-[12px]" style={{ color: "rgba(0,0,0,0.35)" }}>
          {formatShortDate(project.createdAt) || ""}
        </div>
      </div>

      {/* Project brief */}
      <div className="mt-6">
        <SectionHeader label="PROJECT BRIEF" />

        <div
          className="mt-3"
          style={{
            background: "rgba(0,0,0,0.03)",
            border: "1px solid rgba(0,0,0,0.06)",
            borderRadius: 8,
          }}
        >
          <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              {!briefEdit ? (
                <div
                  className="text-[13px] leading-relaxed"
                  style={{
                    color: (project?.briefText || "").trim()
                      ? "rgba(0,0,0,0.78)"
                      : "rgba(0,0,0,0.45)",
                  }}
                >
                  {(project?.briefText || "").trim() ? (
                    project.briefText
                  ) : (
                    <span>
                      Add a short brief: goal, constraints, next step.
                      <span className="block mt-1">(Voice notes live per session.)</span>
                    </span>
                  )}
                </div>
              ) : (
                <textarea
                  value={briefDraft}
                  onChange={(e) => setBriefDraft(e.target.value)}
                  className="w-full bg-transparent outline-none text-[13px] leading-relaxed"
                  rows={4}
                  placeholder="Goal, constraints, what changed last time, next step…"
                  style={{ color: "rgba(0,0,0,0.80)", resize: "none" }}
                />
              )}
            </div>

            {!briefEdit ? (
              <button
                onClick={() => setBriefEdit(true)}
                className="shrink-0 w-9 h-9 rounded-[8px] inline-flex items-center justify-center"
                style={{
                  background: "rgba(255,255,255,0.85)",
                  border: `1px solid ${line}`,
                  color: "rgba(0,0,0,0.70)",
                  WebkitTapHighlightColor: "transparent",
                }}
                aria-label="Edit brief"
                title="Edit brief"
              >
                <Pencil className="w-4 h-4" />
              </button>
            ) : null}
          </div>

          {briefEdit ? (
            <div className="px-4 pb-4 flex items-center gap-2">
              <button
                onClick={saveBrief}
                className="px-3 h-9 rounded-[8px] text-[12px] font-semibold tracking-[0.10em]"
                style={{
                  background: accent,
                  color: "rgba(0,0,0,0.85)",
                  border: "1px solid rgba(0,0,0,0.12)",
                }}
              >
                SAVE
              </button>
              <button
                onClick={() => {
                  setBriefEdit(false);
                  setBriefDraft((project?.briefText || "").toString());
                }}
                className="px-3 h-9 rounded-[8px] text-[12px] font-semibold tracking-[0.10em]"
                style={{
                  background: "rgba(255,255,255,0.75)",
                  color: "rgba(0,0,0,0.75)",
                  border: `1px solid ${line}`,
                }}
              >
                CANCEL
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Sessions */}
      <div className="mt-10">
        <SectionHeader label="SESSIONS" />
        <div className="mt-4 space-y-4">
          {sessions.length ? (
            sessions.map((session) => {
              const media = Array.isArray(session?.media) ? session.media : [];
              const thumbs = media.filter((m) => m?.url);
              const count = thumbs.length;

              const hasVoice = !!session?.voiceNoteUrl;
              const duration = session?.voiceNoteDurationSec;
              const durationLabel =
                typeof duration === "number" && Number.isFinite(duration)
                  ? `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, "0")}`
                  : "";

              return (
                <div
                  key={session.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openSession(session)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") openSession(session);
                  }}
                  className="px-4 py-4 cursor-pointer"
                  style={{
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.60)",
                    border: "1px solid rgba(0,0,0,0.08)",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div
                        className="text-[15px] font-semibold"
                        style={{ fontFamily: headerFont, color: "rgba(0,0,0,0.82)" }}
                      >
                        {session.title || "Session"}
                      </div>
                      <div className="mt-1 text-[12px]" style={{ color: "rgba(0,0,0,0.40)" }}>
                        {formatShortDate(session.createdAt) || ""}
                        {formatShortDate(session.createdAt) ? " · " : ""}
                        {count} {count === 1 ? "photo" : "photos"}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <KebabMenu
                        palette={palette}
                        items={[
                          { label: "Edit session", icon: Pencil, onClick: () => onEditSession?.(session) },
                          { label: "Share", icon: Share2, onClick: () => onShareSession?.(session) },
                          {
                            label: hasVoice ? "Replace voice note" : "Add voice note",
                            icon: Mic,
                            onClick: () => onAddSessionVoiceNote?.(session),
                          },
                          hasVoice
                            ? {
                                label: "Edit transcript",
                                icon: Pencil,
                                onClick: () => onEditSessionVoiceTranscript?.(session),
                              }
                            : null,
                          hasVoice
                            ? {
                                label: "Remove voice note",
                                icon: Trash2,
                                danger: true,
                                onClick: () => onClearSessionVoiceNote?.(session),
                              }
                            : null,
                          {
                            label: "Delete session",
                            icon: Trash2,
                            danger: true,
                            onClick: () => onDeleteSession?.(session),
                          },
                        ].filter(Boolean)}
                      />

                      <div
                        className="w-9 h-9 rounded-[8px] inline-flex items-center justify-center"
                        style={{
                          background: "rgba(255,255,255,0.92)",
                          border: `1px solid ${line}`,
                          color: "rgba(0,0,0,0.55)",
                        }}
                        aria-hidden
                      >
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Preview thumbnails (no direct open; tap card to expand) */}
                  <div className="mt-3 flex gap-3">
                    {(thumbs.slice(0, 2).length ? thumbs.slice(0, 2) : [null, null]).map((m, idx) => (
                      <div
                        key={m?.id || idx}
                        className="overflow-hidden"
                        style={{
                          width: 122,
                          height: 96,
                          borderRadius: 10,
                          background: "rgba(0,0,0,0.08)",
                          border: "1px solid rgba(0,0,0,0.06)",
                        }}
                      >
                        {m?.url ? (
                          <img src={m.url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" draggable={false} />
                        ) : null}
                      </div>
                    ))}
                  </div>

                  {hasVoice ? (
                    <div className="mt-3 text-[12px] font-semibold" style={{ color: "rgba(0,0,0,0.70)" }}>
                      <span className="inline-flex items-center gap-2">
                        <Play className="w-4 h-4" style={{ color: accent }} />
                        Voice note {durationLabel ? `· ${durationLabel}` : ""}
                      </span>
                    </div>
                  ) : null}

                  <div className="mt-4 flex items-center justify-between">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onAddPhotosForSession?.(session);
                      }}
                      className="text-[12px] font-semibold tracking-[0.12em]"
                      style={{ color: accent, WebkitTapHighlightColor: "transparent" }}
                    >
                      ADD PHOTOS
                    </button>

                    {!hasVoice ? (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onAddSessionVoiceNote?.(session);
                        }}
                        className="text-[12px] font-semibold"
                        style={{ color: "rgba(0,0,0,0.55)", WebkitTapHighlightColor: "transparent" }}
                        title="Add a quick voice note (optional)"
                      >
                        + Add voice note
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onPlaySessionVoiceNote?.(session);
                        }}
                        className="text-[12px] font-semibold"
                        style={{ color: "rgba(0,0,0,0.55)", WebkitTapHighlightColor: "transparent" }}
                        title="Play voice note"
                      >
                        Play
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-[13px]" style={{ color: "rgba(0,0,0,0.50)" }}>
              No sessions yet.
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onAddSession}
        className="mt-8 inline-flex items-center gap-2 px-4 h-11 text-[12px] font-semibold tracking-[0.12em]"
        style={{
          borderRadius: 8,
          border: `1px solid rgba(0,0,0,0.12)`,
          color: "rgba(0,0,0,0.78)",
          background: "rgba(255,255,255,0.65)",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <Plus className="w-4 h-4" />
        ADD SESSION
      </button>

      <div className="mt-14 pt-10" style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}>
        <details>
          <summary
            className="cursor-pointer select-none text-[11px] font-semibold tracking-[0.18em]"
            style={{ color: "rgba(0,0,0,0.42)" }}
          >
            DANGER ZONE
          </summary>
          <button
            onClick={onArchiveProject}
            className="mt-4 text-[12px] font-semibold tracking-[0.14em]"
            style={{ color: "rgba(220,38,38,0.95)", WebkitTapHighlightColor: "transparent" }}
          >
            ARCHIVE PROJECT
          </button>
          <div className="mt-2 text-[12px]" style={{ color: "rgba(0,0,0,0.45)" }}>
            Archives this project (you can restore later).
          </div>
        </details>
      </div>
    </div>
  );
}