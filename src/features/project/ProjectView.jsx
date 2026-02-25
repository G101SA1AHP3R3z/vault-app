// /src/features/project/ProjectView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { MoreHorizontal, Pencil, Share2, Trash2, Plus, ImagePlus } from "lucide-react";

function formatDateMMDDYYYY(ts) {
  try {
    if (!ts) return "";
    if (typeof ts?.toDate === "function") {
      const d = ts.toDate();
      return d.toLocaleDateString(undefined, { month: "2-digit", day: "2-digit", year: "numeric" });
    }
    if (typeof ts?.seconds === "number") {
      const d = new Date(ts.seconds * 1000);
      return d.toLocaleDateString(undefined, { month: "2-digit", day: "2-digit", year: "numeric" });
    }
    const d = new Date(ts);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, { month: "2-digit", day: "2-digit", year: "numeric" });
    }
  } catch {}
  return "";
}

function LabelCaps({ children, className = "" }) {
  return <div className={`label-caps ${className}`}>{children}</div>;
}

function KebabMenu({ items = [], icon = MoreHorizontal, align = "right" }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const Icon = icon;

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
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="w-9 h-9 rounded-[12px] inline-flex items-center justify-center active:scale-[0.98] transition-transform"
        style={{
          background: "rgba(255,255,255,0.72)",
          border: "1px solid var(--line)",
          color: "rgba(0,0,0,0.72)",
          WebkitTapHighlightColor: "transparent",
        }}
        aria-label="More"
        title="More"
      >
        <Icon className="w-4 h-4" />
      </button>

      {open && (
        <div
          className={`absolute ${align === "left" ? "left-0" : "right-0"} mt-2 w-56 overflow-hidden z-50`}
          style={{
            borderRadius: 12,
            background: "rgba(255,255,255,0.94)",
            border: "1px solid var(--hairline)",
            boxShadow: "0 18px 45px -38px rgba(0,0,0,0.45)",
            backdropFilter: "blur(18px)",
          }}
        >
          {items.map((it, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                it?.onClick?.();
              }}
              className="w-full px-4 py-3 flex items-center gap-3 text-[13px] font-semibold text-left"
              style={{
                color: it?.danger ? "rgba(255,77,46,0.95)" : "rgba(0,0,0,0.82)",
                background: "transparent",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
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

function ThumbStrip({ thumbs, onOpen }) {
  if (!thumbs?.length) return null;

  return (
    <div
      className="mt-4 overflow-x-auto pb-1"
      style={{
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <style>{`
        .index-hide-scroll::-webkit-scrollbar{ display:none; }
      `}</style>

      <div className="flex gap-2 index-hide-scroll">
        {thumbs.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpen?.(m);
            }}
            className="shrink-0 overflow-hidden active:scale-[0.99] transition-transform"
            style={{
              width: 74,
              height: 74,
              borderRadius: 12,
              border: "1px solid var(--hairline)",
              background: "rgba(0,0,0,0.04)",
              WebkitTapHighlightColor: "transparent",
            }}
            aria-label="Open media"
            title="Open"
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
        ))}
      </div>
    </div>
  );
}

/** Accessible clickable wrapper that can contain real buttons */
function ClickCard({ onOpen, children }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen?.();
        }
      }}
      className="w-full text-left outline-none"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {children}
    </div>
  );
}

export default function ProjectView({
  project,

  onEditProject,
  onShareProject,
  onArchiveProject,

  // NEW: wedding date
  onUpdateWeddingDate, // (dateStrOrNull) => Promise<void>

  // viewer
  onOpenViewer,

  // session detail
  onOpenSession, // (session) => void

  // sessions
  onAddSession,
  onRenameSession,
  onDeleteSession,
  onShareSession,

  // notes
  onUpdateProjectBrief,

  // native picker upload
  onAddPhotosNative,

  // focus newly-created session title input
  autoFocusSessionId,
  onClearAutoFocusSessionId,
}) {
  if (!project) return null;

  // Sessions newest first
  const sessions = useMemo(() => {
    const s = Array.isArray(project?.sessions) ? project.sessions : [];
    return s.slice().sort((a, b) => (b?.createdAt?.seconds || 0) - (a?.createdAt?.seconds || 0));
  }, [project?.sessions]);

  // Wedding date display
  const dateText =
    formatDateMMDDYYYY(project?.weddingDate) ||
    (typeof project?.weddingDate === "string" ? project.weddingDate : "");

  // Notes autosave
  const [notesDraft, setNotesDraft] = useState("");
  const lastSavedRef = useRef("");
  const debounceRef = useRef(null);
  const savingRef = useRef(false);

  useEffect(() => {
    const initial = (project?.briefText || "").toString();
    setNotesDraft(initial);
    lastSavedRef.current = initial;
  }, [project?.id]);

  const saveNotes = async (text) => {
    const next = (text ?? "").toString();
    if (!onUpdateProjectBrief) return;
    if (next === lastSavedRef.current) return;
    if (savingRef.current) return;

    savingRef.current = true;
    try {
      await onUpdateProjectBrief(next);
      lastSavedRef.current = next;
    } catch (e) {
      console.error(e);
    } finally {
      savingRef.current = false;
    }
  };

  useEffect(() => {
    if (!onUpdateProjectBrief) return;
    if (notesDraft === lastSavedRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveNotes(notesDraft), 650);

    return () => debounceRef.current && clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notesDraft]);

  // Inline rename drafts
  const [titleDrafts, setTitleDrafts] = useState({});
  useEffect(() => {
    setTitleDrafts((prev) => {
      const next = { ...prev };
      for (const s of sessions) {
        if (next[s.id] == null) next[s.id] = (s.title || "").toString();
      }
      return next;
    });
  }, [sessions]);

  const commitSessionTitle = async (session) => {
    const nextTitle = (titleDrafts?.[session.id] ?? "").trim();
    const fallback = "Untitled";
    const finalTitle = nextTitle || fallback;

    const currentTitleNorm = (session.title || "").trim() || fallback;
    if (currentTitleNorm === finalTitle) {
      setTitleDrafts((p) => ({ ...p, [session.id]: finalTitle }));
      return;
    }

    try {
      await onRenameSession?.(session.id, finalTitle);
    } catch (e) {
      console.error(e);
      alert(e?.message || "Could not rename session.");
      setTitleDrafts((p) => ({ ...p, [session.id]: session.title || "" }));
    }
  };

  // Focus newly created session title
  const sessionInputRefs = useRef({});
  useEffect(() => {
    if (!autoFocusSessionId) return;
    const el = sessionInputRefs.current?.[autoFocusSessionId];
    if (el && typeof el.focus === "function") {
      el.focus();
      try {
        el.setSelectionRange?.(0, el.value?.length || 0);
      } catch {}
      onClearAutoFocusSessionId?.();
    }
  }, [autoFocusSessionId, onClearAutoFocusSessionId]);

  // Native file picker
  const fileInputRef = useRef(null);
  const pendingSessionRef = useRef(null);

  const openNativePickerForSession = (session) => {
    pendingSessionRef.current = session;
    if (fileInputRef.current) fileInputRef.current.value = "";
    fileInputRef.current?.click?.();
  };

  const onPickedFiles = async (e) => {
    const session = pendingSessionRef.current;
    const files = e?.target?.files;
    if (!session || !files || !files.length) return;
    try {
      await onAddPhotosNative?.(session, files);
    } catch (err) {
      console.error(err);
      alert(err?.message || "Could not add photos.");
    } finally {
      pendingSessionRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Wedding date modal
  const [dateOpen, setDateOpen] = useState(false);
  const [dateDraft, setDateDraft] = useState("");

  useEffect(() => {
    const d = typeof project?.weddingDate === "string" ? project.weddingDate : "";
    setDateDraft(d || "");
  }, [project?.id]);

  const saveWeddingDate = async () => {
    try {
      await onUpdateWeddingDate?.(dateDraft ? dateDraft : null);
      setDateOpen(false);
    } catch (e) {
      console.error(e);
      alert(e?.message || "Could not save wedding date.");
    }
  };

  const clearWeddingDate = async () => {
    try {
      await onUpdateWeddingDate?.(null);
      setDateDraft("");
      setDateOpen(false);
    } catch (e) {
      console.error(e);
      alert(e?.message || "Could not clear wedding date.");
    }
  };

  const projectMenuItems = [
    onEditProject ? { label: "Edit project", icon: Pencil, onClick: onEditProject } : null,
    onUpdateWeddingDate ? { label: "Edit wedding date", icon: Pencil, onClick: () => setDateOpen(true) } : null,
    onShareProject ? { label: "Share", icon: Share2, onClick: onShareProject } : null,
    onArchiveProject ? { label: "Archive", icon: Trash2, danger: true, onClick: onArchiveProject } : null,
  ].filter(Boolean);

  return (
    <div className="pt-6 pb-28">
      {/* hidden native picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        capture="environment"
        className="hidden"
        onChange={onPickedFiles}
      />

      <div className="px-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <LabelCaps className="mt-1">Project</LabelCaps>

            <div
              className="mt-2 truncate"
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 36,
                lineHeight: 1.08,
                letterSpacing: "-0.01em",
                color: "var(--ink)",
                fontWeight: 600,
              }}
              title={project?.title || "Untitled"}
            >
              {project?.title || "Untitled"}
            </div>

            {dateText ? (
              <div className="mt-2 text-[12px]" style={{ color: "var(--muted)" }}>
                {dateText}
              </div>
            ) : null}
          </div>

          {projectMenuItems.length ? <KebabMenu items={projectMenuItems} /> : null}
        </div>

        {/* Notes */}
        <div className="mt-8">
          <LabelCaps>Notes</LabelCaps>
          <div
            className="mt-3"
            style={{
              borderRadius: 14,
              border: "1px solid var(--hairline)",
              background: "rgba(255,255,255,0.78)",
            }}
          >
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              onBlur={() => saveNotes(notesDraft)}
              className="w-full bg-transparent outline-none text-[13px]"
              rows={4}
              placeholder="Add a note."
              style={{
                color: "rgba(0,0,0,0.78)",
                padding: 14,
                resize: "none",
                fontFamily: "var(--font-sans)",
                lineHeight: 1.55,
              }}
            />
          </div>
        </div>

        {/* Sessions */}
        <div className="mt-10">
          <div className="flex items-center justify-between">
            <LabelCaps>Sessions</LabelCaps>

            <button
              type="button"
              onClick={onAddSession}
              className="h-9 px-3 rounded-[999px] inline-flex items-center gap-2 active:scale-[0.99] transition-transform"
              style={{
                background: "rgba(255,255,255,0.76)",
                border: "1px solid var(--line)",
                color: "rgba(0,0,0,0.68)",
                fontFamily: "var(--font-sans)",
                WebkitTapHighlightColor: "transparent",
              }}
              aria-label="Add session"
              title="Add session"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[12px] font-semibold uppercase" style={{ letterSpacing: "0.16em" }}>
                Add
              </span>
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {sessions.length ? (
              sessions.map((session) => {
                const media = Array.isArray(session?.media) ? session.media : [];
                const thumbs = media.filter((m) => m?.url).slice(0, 18);
                const count = thumbs.length;
                const sDate = formatDateMMDDYYYY(session?.createdAt);

                const sessionMenuItems = [
                  onShareSession ? { label: "Share", icon: Share2, onClick: () => onShareSession?.(session) } : null,
                  onDeleteSession
                    ? { label: "Delete session", icon: Trash2, danger: true, onClick: () => onDeleteSession?.(session) }
                    : null,
                ].filter(Boolean);

                const draft = titleDrafts?.[session.id] ?? (session.title || "");
                const displayDraft = (draft || "").toString();

                return (
                  <div
                    key={session.id}
                    className="p-4"
                    style={{
                      borderRadius: 14,
                      border: "1px solid var(--hairline)",
                      background: "rgba(255,255,255,0.78)",
                    }}
                  >
                    <ClickCard onOpen={() => onOpenSession?.(session)}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <input
                            ref={(el) => {
                              if (el) sessionInputRefs.current[session.id] = el;
                            }}
                            value={displayDraft}
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            onChange={(e) => setTitleDrafts((p) => ({ ...p, [session.id]: e.target.value }))}
                            onBlur={() => commitSessionTitle(session)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                e.currentTarget.blur();
                              }
                            }}
                            placeholder="Untitled"
                            className="w-full bg-transparent outline-none"
                            style={{
                              fontFamily: "var(--font-serif)",
                              color: "rgba(0,0,0,0.86)",
                              fontWeight: 600,
                              letterSpacing: "-0.005em",
                              fontSize: 20,
                            }}
                          />

                          <div className="mt-1 text-[12px]" style={{ color: "var(--muted)", fontFamily: "var(--font-sans)" }}>
                            {sDate ? `${sDate} · ` : ""}
                            {count} {count === 1 ? "photo" : "photos"}
                          </div>
                        </div>

                        {sessionMenuItems.length ? (
                          <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                            <KebabMenu items={sessionMenuItems} />
                          </div>
                        ) : null}
                      </div>

                      <ThumbStrip thumbs={thumbs} onOpen={(m) => onOpenViewer?.(session.id, m.id)} />

                      <div
                        className="mt-4 flex items-center justify-between"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openNativePickerForSession(session);
                          }}
                          className="h-9 px-3 rounded-[999px] inline-flex items-center gap-2 active:scale-[0.99] transition-transform"
                          style={{
                            background: "rgba(0,0,0,0.04)",
                            border: "1px solid var(--hairline)",
                            color: "rgba(0,0,0,0.62)",
                            fontFamily: "var(--font-sans)",
                            WebkitTapHighlightColor: "transparent",
                          }}
                        >
                          <ImagePlus className="w-4 h-4" />
                          <span className="text-[11px] font-semibold uppercase" style={{ letterSpacing: "0.18em" }}>
                            Add photos
                          </span>
                        </button>

                        <div className="text-[11px]" style={{ color: "rgba(0,0,0,0.38)", fontFamily: "var(--font-sans)" }}>
                          Tap card to open
                        </div>
                      </div>
                    </ClickCard>
                  </div>
                );
              })
            ) : (
              <div className="pt-2 text-[13px]" style={{ color: "var(--muted)", fontFamily: "var(--font-sans)" }}>
                No sessions yet.
              </div>
            )}
          </div>
        </div>

        <div className="h-10" />
      </div>

      {/* Wedding date modal */}
      {dateOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-end md:items-center justify-center"
          onClick={() => setDateOpen(false)}
          style={{ background: "rgba(0,0,0,0.20)", backdropFilter: "blur(8px)" }}
        >
          <div
            className="w-full md:max-w-md mx-auto"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "rgba(255,255,255,0.96)",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 18,
              boxShadow: "0 30px 80px -60px rgba(0,0,0,0.55)",
              padding: 16,
              margin: 16,
            }}
          >
            <div className="label-caps">Wedding date</div>

            <input
              type="date"
              value={dateDraft}
              onChange={(e) => setDateDraft(e.target.value)}
              className="mt-3 w-full h-11 px-3 rounded-[12px] outline-none"
              style={{
                background: "rgba(0,0,0,0.03)",
                border: "1px solid rgba(0,0,0,0.10)",
                fontFamily: "var(--font-sans)",
                color: "rgba(0,0,0,0.80)",
              }}
            />

            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={clearWeddingDate}
                className="h-10 px-3 rounded-[12px] font-semibold uppercase"
                style={{
                  letterSpacing: "0.16em",
                  background: "rgba(255,255,255,0.86)",
                  border: "1px solid rgba(0,0,0,0.10)",
                  color: "rgba(0,0,0,0.55)",
                  fontSize: 12,
                }}
              >
                Clear
              </button>

              <div className="flex-1" />

              <button
                type="button"
                onClick={() => setDateOpen(false)}
                className="h-10 px-3 rounded-[12px] font-semibold uppercase"
                style={{
                  letterSpacing: "0.16em",
                  background: "rgba(255,255,255,0.86)",
                  border: "1px solid rgba(0,0,0,0.10)",
                  color: "rgba(0,0,0,0.72)",
                  fontSize: 12,
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveWeddingDate}
                className="h-10 px-3 rounded-[12px] font-semibold uppercase"
                style={{
                  letterSpacing: "0.16em",
                  background: "rgba(0,0,0,0.06)",
                  border: "1px solid rgba(0,0,0,0.12)",
                  color: "rgba(0,0,0,0.82)",
                  fontSize: 12,
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}