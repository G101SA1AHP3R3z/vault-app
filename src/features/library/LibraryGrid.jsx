// /src/features/library/LibraryGrid.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Camera, MoreHorizontal, Share2, Pencil, Trash2 } from "lucide-react";
import { useVault } from "../../context/VaultContext";

function formatProjectDate(createdAt) {
  try {
    if (!createdAt) return "";
    // Firestore Timestamp
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

export default function LibraryGrid({ onQuickAdd, onNew }) {
  const { filteredProjects, setActiveProject, setView, renameProject, deleteProject, createInvite } =
    useVault();

  const palette = {
    ink: "#0B0B0C",
    paper: "#FFFEFA",
    line: "rgba(0,0,0,0.10)",
    muted: "rgba(0,0,0,0.55)",
    accent: "rgba(255,77,46,0.95)",
  };

  const openProject = (p) => {
    setActiveProject(p);
    setView("project");
  };

  const projects = useMemo(() => filteredProjects || [], [filteredProjects]);

  const shareProject = async (project) => {
    // Best: invite link. If not available/allowed, fall back to copying the projectId.
    try {
      const inviteId = await createInvite?.(project.id, "editor");
      if (inviteId) {
        await navigator.clipboard.writeText(inviteId);
        alert("Copied invite code to clipboard.");
        return;
      }
    } catch {}

    try {
      await navigator.clipboard.writeText(project.id);
      alert("Copied projectId to clipboard.");
    } catch {
      prompt("Copy projectId:", project.id);
    }
  };

  const editProject = async (project) => {
    const next = prompt("Rename project", project?.title || "");
    if (next == null) return;
    const title = next.trim();
    if (!title) return;
    try {
      await renameProject?.(project.id, title);
    } catch (e) {
      alert(e?.message || "Rename failed.");
    }
  };

  const removeProject = async (project) => {
    if (!confirm("Delete this project?")) return;
    try {
      await deleteProject?.(project.id);
    } catch (e) {
      alert(e?.message || "Delete failed.");
    }
  };

  return (
    <div className="w-full pb-32 animate-in fade-in duration-300">
      {/* Header (match screenshot) */}
      <div className="px-6 pt-6 pb-5 flex items-center justify-between">
        <div className="text-[18px] font-semibold tracking-[0.02em]" style={{ color: palette.ink }}>
          [ Projects ]
        </div>

        <button
          onClick={() => onNew?.()}
          className="text-[12px] font-semibold tracking-[0.14em]"
          style={{ color: palette.accent }}
        >
          + NEW
        </button>
      </div>

      {/* Grid */}
      <div className="px-6">
        <div className="grid grid-cols-2 gap-5">
          {/* Optional “empty slot” tile like screenshot */}
          <button
            onClick={() => onNew?.()}
            className="aspect-square w-full"
            style={{ background: "rgba(0,0,0,0.08)", borderRadius: 0 }}
            aria-label="Create new project"
            title="Create new project"
          />

          {projects.map((project) => {
            const dateText = formatProjectDate(project.createdAt);

            return (
              <div key={project.id} className="w-full">
                {/* Use a div so kebab/camera can be real buttons without nesting errors */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => openProject(project)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openProject(project);
                    }
                  }}
                  className="w-full text-left active:scale-[0.995] transition-transform cursor-pointer select-none"
                  style={{ WebkitTapHighlightColor: "transparent", outline: "none" }}
                  aria-label={`Open ${project.title}`}
                >
                  {/* Image */}
                  <div
                    className="relative w-full aspect-square overflow-hidden"
                    style={{ background: "rgba(0,0,0,0.08)", borderRadius: 0 }}
                  >
                    {project.coverPhoto ? (
                      <img
                        src={project.coverPhoto}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                      />
                    ) : null}

                    {/* Top-right kebab */}
                    <div className="absolute top-2 right-2">
                      <KebabMenu
                        palette={palette}
                        items={[
                          { label: "Edit", icon: Pencil, onClick: () => editProject(project) },
                          { label: "Share", icon: Share2, onClick: () => shareProject(project) },
                          { label: "Delete", icon: Trash2, danger: true, onClick: () => removeProject(project) },
                        ]}
                      />
                    </div>

                    {/* Camera badge (bottom-right) */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onQuickAdd?.(project);
                      }}
                      className="absolute bottom-2 right-2 w-9 h-9 grid place-items-center"
                      style={{
                        borderRadius: 10,
                        background: "rgba(255,255,255,0.92)",
                        border: `1px solid ${palette.line}`,
                      }}
                      aria-label="Quick add media"
                      title="Add photos"
                    >
                      <Camera className="w-4 h-4" style={{ color: "rgba(0,0,0,0.75)" }} />
                    </button>
                  </div>

                  {/* Title + date */}
                  <div className="pt-3">
                    <div
                      className="text-[12px] font-semibold tracking-[0.02em] line-clamp-1"
                      style={{ color: palette.ink }}
                    >
                      {project.title || "Untitled"}
                    </div>
                    {dateText ? (
                      <div className="mt-1 text-[11px]" style={{ color: "rgba(0,0,0,0.45)" }}>
                        {dateText}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {projects.length === 0 && (
          <div className="pt-10 text-[12px]" style={{ color: palette.muted }}>
            No projects yet.
          </div>
        )}
      </div>
    </div>
  );
}
