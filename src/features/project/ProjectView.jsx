import React, { useEffect, useMemo, useRef, useState } from "react";
import { MoreHorizontal, Share2, Trash2 } from "lucide-react";

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

function Label({ children, font }) {
  return (
    <div
      className="text-[11px] font-semibold tracking-[0.18em] uppercase"
      style={{ color: "rgba(0,0,0,0.45)", fontFamily: font }}
    >
      {children}
    </div>
  );
}

function KebabMenu({ items = [], palette, icon = MoreHorizontal, buttonStyle = "kebab" }) {
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

  const line = palette?.line || "rgba(0,0,0,0.10)";
  const Icon = icon;

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={
          buttonStyle === "hamburger"
            ? "w-10 h-10 rounded-full inline-flex items-center justify-center"
            : "w-9 h-9 rounded-full inline-flex items-center justify-center"
        }
        style={{
          background: "rgba(255,255,255,0.92)",
          border: `1px solid ${line}`,
          color: "rgba(0,0,0,0.75)",
          WebkitTapHighlightColor: "transparent",
        }}
        aria-label="More"
        title="More"
      >
        <Icon className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-56 overflow-hidden z-50"
          style={{
            borderRadius: 10,
            background: "rgba(255,255,255,0.97)",
            border: `1px solid ${line}`,
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
              style={{ color: it?.danger ? "#DC2626" : "rgba(0,0,0,0.82)" }}
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
  palette,

  onBack,
  onEditProject,
  onShareProject,
  onArchiveProject,

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

  const fontSerif = "Literata, serif";
  const fontSans = "Raleway, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial";
  const line = palette?.line || "rgba(0,0,0,0.10)";

  // Sessions newest first
  const sessions = useMemo(() => {
    const s = Array.isArray(project?.sessions) ? project.sessions : [];
    return s.slice().sort((a, b) => (b?.createdAt?.seconds || 0) - (a?.createdAt?.seconds || 0));
  }, [project?.sessions]);

  const weddingDateText =
    formatDateMMDDYYYY(project?.weddingDate) || (typeof project?.weddingDate === "string" ? project.weddingDate : "");

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

  const commitSessionTitle = async (session) => {
    const nextTitle = (titleDrafts?.[session.id] ?? "").trim();
    const fallback = "Untitled";
    const finalTitle = nextTitle || fallback;

    const currentTitleNorm = (session.title || "").trim() || fallback;
    const nextTitleNorm = finalTitle;

    if (currentTitleNorm === nextTitleNorm) {
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

      {/* Title */}
      <div className="px-6 mt-2">
        <div
          className="uppercase"
          style={{
            fontFamily: fontSerif,
            fontSize: 38,
            lineHeight: 1.05,
            letterSpacing: "0.06em",
            color: "rgba(0,0,0,0.88)",
            fontWeight: 500,
          }}
        >
          {project.title || "Untitled"}
        </div>
      </div>

      {/* Wedding date */}
      <div className="px-6 mt-7">
        <Label font={fontSans}>WEDDING DATE</Label>
        <div className="mt-2 text-[13px]" style={{ color: "rgba(0,0,0,0.70)", fontFamily: fontSans }}>
          {weddingDateText || ""}
        </div>
      </div>

      {/* Consult call notes */}
      <div className="px-6 mt-7">
        <Label font={fontSans}>CONSULT CALL NOTES</Label>
        <div
          className="mt-3"
          style={{
            borderRadius: 10,
            border: `1px solid ${line}`,
            background: "rgba(255,255,255,0.80)",
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
              color: "rgba(0,0,0,0.80)",
              padding: 14,
              resize: "none",
              fontFamily: fontSans,
            }}
          />
        </div>
      </div>

      {/* Sessions */}
      <div className="px-6 mt-8">
        <div className="flex items-center justify-between">
          <Label font={fontSans}>SESSIONS</Label>
          <button
            onClick={onAddSession}
            className="h-10 px-4 rounded-[999px] text-[12px] font-semibold tracking-[0.16em] uppercase active:scale-[0.99] transition-transform"
            style={{
              background: "rgba(255,255,255,0.76)",
              border: `1px solid ${line}`,
              color: "rgba(0,0,0,0.68)",
              WebkitTapHighlightColor: "transparent",
              fontFamily: fontSans,
            }}
          >
            + ADD
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {sessions.length ? (
            sessions.map((session) => {
              const media = Array.isArray(session?.media) ? session.media : [];
              const thumbs = media.filter((m) => m?.url);
              const count = thumbs.length;
              const dateText = formatDateMMDDYYYY(session?.createdAt);

              const sessionMenuItems = [
                { label: "Share", icon: Share2, onClick: () => onShareSession?.(session) },
                { label: "Delete session", icon: Trash2, danger: true, onClick: () => onDeleteSession?.(session) },
              ].filter(Boolean);

              const draft = titleDrafts?.[session.id] ?? (session.title || "");
              const displayDraft = (draft || "").toString();

              return (
                <div
                  key={session.id}
                  className="p-4"
                  style={{
                    borderRadius: 12,
                    border: `1px solid ${line}`,
                    background: "rgba(255,255,255,0.82)",
                  }}
                >
                  <button
                    onClick={() => onOpenSession?.(session)}
                    className="w-full text-left"
                    style={{ WebkitTapHighlightColor: "transparent" }}
                  >
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
                            fontFamily: fontSerif,
                            color: "rgba(0,0,0,0.86)",
                            fontWeight: 500,
                            letterSpacing: "0.01em",
                            fontSize: 18,
                          }}
                        />

                        <div
                          className="mt-1 text-[12px]"
                          style={{ color: "rgba(0,0,0,0.45)", fontFamily: fontSans }}
                        >
                          {dateText ? `${dateText} · ` : ""}
                          {count} {count === 1 ? "photo" : "photos"}
                        </div>
                      </div>

                      <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                        <KebabMenu palette={{ ...palette, line }} items={sessionMenuItems} />
                      </div>
                    </div>

                    {/* Film strip: flush to the CARD edge (not the screen edge) */}
                    {thumbs.length ? (
                      <div
                        className="mt-4 -mx-4 overflow-x-auto pb-1 hide-scrollbar"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
                      >
                        <div
                          className="flex gap-2"
                          style={{
                            paddingLeft: 16, // match card padding (p-4)
                            paddingRight: 0, // flush to the card edge
                          }}
                        >
                          {thumbs.map((m) => (
                            <button
                              key={m.id}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onOpenViewer?.(session.id, m.id);
                              }}
                              className="shrink-0 overflow-hidden active:scale-[0.99] transition-transform"
                              style={{
                                width: 66,
                                height: 66,
                                borderRadius: 12,
                                border: `1px solid rgba(0,0,0,0.08)`,
                                background: "rgba(0,0,0,0.06)",
                                WebkitTapHighlightColor: "transparent",
                              }}
                              aria-label="Open photo"
                              title="Open photo"
                            >
                              <img
                                src={m.thumbnailUrl || m.url}
                                alt=""
                                className="w-full h-full object-cover"
                                loading="lazy"
                                decoding="async"
                                draggable={false}
                              />
                            </button>
                          ))}
                        </div>

                        <style>{`.hide-scrollbar::-webkit-scrollbar{ display:none; }`}</style>
                      </div>
                    ) : null}

                    <div className="mt-4 flex items-center justify-between">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openNativePickerForSession(session);
                        }}
                        className="inline-flex items-center gap-2 px-4 h-11 text-[12px] font-semibold tracking-[0.12em] uppercase active:scale-[0.99] transition-transform"
                        style={{
                          borderRadius: 999,
                          border: `1px solid ${line}`,
                          color: "rgba(0,0,0,0.78)",
                          background: "rgba(255,255,255,0.75)",
                          fontFamily: fontSans,
                          WebkitTapHighlightColor: "transparent",
                        }}
                      >
                        +&nbsp; ADD PHOTOS
                      </button>

                      <div className="text-[12px]" style={{ color: "rgba(0,0,0,0.40)", fontFamily: fontSans }}>
                        Tap card to open
                      </div>
                    </div>
                  </button>
                </div>
              );
            })
          ) : (
            <div className="text-[13px]" style={{ color: "rgba(0,0,0,0.50)", fontFamily: fontSans }}>
              No sessions yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}