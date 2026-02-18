import React, { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  Play,
  Plus,
  Share2,
  Pencil,
  Trash2,
  MoreHorizontal,
} from "lucide-react";

function formatProjectDate(createdAt) {
  try {
    if (!createdAt) return "";
    if (typeof createdAt?.toDate === "function") {
      const d = createdAt.toDate();
      return d.toLocaleDateString(undefined, {
        month: "2-digit",
        day: "2-digit",
        year: "2-digit",
      });
    }
    if (typeof createdAt?.seconds === "number") {
      const d = new Date(createdAt.seconds * 1000);
      return d.toLocaleDateString(undefined, {
        month: "2-digit",
        day: "2-digit",
        year: "2-digit",
      });
    }
    const d = new Date(createdAt);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, {
        month: "2-digit",
        day: "2-digit",
        year: "2-digit",
      });
    }
  } catch {}
  return "";
}

function parseOverview(project) {
  const items = Array.isArray(project?.overviewItems)
    ? project.overviewItems.filter(Boolean)
    : [];
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

  const fallback = (project?.overallAudio || "").trim();
  if (!fallback) return [];
  return fallback
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 4)
    .map((l) => l.replace(/^\d+\.\s*/, ""));
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
}) {
  if (!project) return null;

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

          <button
            onClick={() => alert("Audio playback not wired yet.")}
            className="mt-4 inline-flex items-center gap-2 text-[12px] font-semibold tracking-[0.12em]"
            style={{ color: palette.accent }}
          >
            <Play className="w-4 h-4" />
            PLAY AUDIO
          </button>
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

      {/* Overview card */}
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
            {parseOverview(project).length ? (
              parseOverview(project).map((line, i) => (
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
          const thumbs = media.filter((m) => m?.url); // ✅ no slice → all photos

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

              {/* ✅ Horizontal scroll row */}
              <div
                className="mt-3 flex gap-3 overflow-x-auto pb-2"
                style={{
                  WebkitOverflowScrolling: "touch",
                  scrollbarWidth: "none",
                }}
              >
                {/* hide scrollbar (webkit) */}
                <style>{`
                  .hide-scrollbar::-webkit-scrollbar { display: none; }
                `}</style>

                <div className="flex gap-3 hide-scrollbar">
                  {thumbs.length ? (
                    thumbs.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => onOpenViewer?.(session.id, m.id)}
                        className="shrink-0 overflow-hidden"
                        style={{
                          width: 108,            // size of each tile
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
