// /src/features/library/LibraryGrid.jsx
import React, { useMemo, useState } from "react";
import { useVault } from "../../context/VaultContext";

function formatProjectDate(createdAt) {
  try {
    if (!createdAt) return "";
    // Firestore Timestamp
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

// -----------------------------
// Local “Continue” (last opened)
// Client-only so you don't need schema changes.
// -----------------------------
const RECENTS_KEY = "index.recentProjects.v1";

function readRecents() {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    const arr = JSON.parse(raw || "[]");
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x) => x && typeof x.id === "string" && typeof x.t === "number")
      .sort((a, b) => b.t - a.t);
  } catch {
    return [];
  }
}

function bumpRecent(projectId) {
  if (!projectId) return;
  try {
    const now = Date.now();
    const prev = readRecents();
    const next = [{ id: projectId, t: now }, ...prev.filter((x) => x.id !== projectId)].slice(
      0,
      12
    );
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {}
}

function SectionHeader({ title, right }) {
  return (
    <div className="flex items-baseline justify-between" style={{ marginTop: 18 }}>
      <div
        className="text-[12px] font-semibold uppercase tracking-wide"
        style={{ color: "rgba(0,0,0,0.55)" }}
      >
        {title}
      </div>
      {right ? (
        <div className="text-[12px] font-medium" style={{ color: "rgba(0,0,0,0.45)" }}>
          {right}
        </div>
      ) : null}
    </div>
  );
}


function ContinueCard({ project, onOpen, palette }) {
  const dateText = formatProjectDate(project?.createdAt);

  return (
    <button
      onClick={() => onOpen(project)}
      className="shrink-0 text-left"
      style={{ width: 208, WebkitTapHighlightColor: "transparent" }}
      aria-label={`Open ${project?.title || "project"}`}
      title={project?.title || "Open project"}
    >
      <div className="flex flex-col gap-2">
        <div
          className="overflow-hidden"
          style={{
            borderRadius: 8,
            border: `1px solid ${palette.line}`,
            background: "rgba(0,0,0,0.05)",
            height: 132,
          }}
        >
          {project?.coverPhoto ? (
            <img
              src={project.coverPhoto}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full" style={{ background: "rgba(0,0,0,0.06)" }} />
          )}
        </div>

        <div className="px-0.5">
          <div
            className="text-[13px] font-semibold leading-tight line-clamp-1"
            style={{ color: palette.ink }}
          >
            {project?.title || "Untitled"}
          </div>
          {dateText ? (
            <div className="mt-0.5 text-[11px] font-medium" style={{ color: palette.muted }}>
              {dateText}
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function ProjectTile({ project, onOpen, palette }) {
  const dateText = formatProjectDate(project?.createdAt);

  return (
    <button
      onClick={() => onOpen(project)}
      className="w-full text-left active:scale-[0.995] transition-transform"
      style={{ WebkitTapHighlightColor: "transparent" }}
      aria-label={`Open ${project?.title || "project"}`}
      title={project?.title || "Open project"}
    >
      <div className="flex flex-col gap-2">
        <div
          className="w-full aspect-square overflow-hidden"
          style={{
            borderRadius: 8,
            background: "rgba(0,0,0,0.05)",
            border: `1px solid ${palette.line}`,
          }}
        >
          {project?.coverPhoto ? (
            <img
              src={project.coverPhoto}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full" style={{ background: "rgba(0,0,0,0.06)" }} />
          )}
        </div>

        <div className="px-0.5">
          <div
            className="text-[13px] font-semibold leading-tight line-clamp-1"
            style={{ color: palette.ink }}
          >
            {project?.title || "Untitled"}
          </div>
          {dateText ? (
            <div className="mt-0.5 text-[11px] font-medium" style={{ color: palette.muted }}>
              {dateText}
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export default function LibraryGrid({ onNew }) {
  const { filteredProjects, setActiveProject, setView } = useVault();

const palette = {
  ink: "#0B0B0C",
  paper: "#FFFEFA",
  line: "rgba(0,0,0,0.12)",
  muted: "rgba(0,0,0,0.50)",
  cta: "#C1EF1B",
orange: "#FF4D2E",

};

  const [recents, setRecents] = useState(() => readRecents());
  const projects = useMemo(() => filteredProjects || [], [filteredProjects]);

  const continueProjects = useMemo(() => {
    if (!projects.length) return [];
    const byId = new Map(projects.map((p) => [p.id, p]));
    return recents
      .map((r) => byId.get(r.id))
      .filter(Boolean)
      .slice(0, 8);
  }, [projects, recents]);

  const openProject = (p) => {
    setActiveProject(p);
    setView("project");
    bumpRecent(p?.id);
    setRecents(readRecents());
  };


  return (
    <div className="w-full pb-32 animate-in fade-in duration-300" style={{ background: palette.paper }}>
{/* Header */}
<div className="px-6 pt-7 pb-4 flex items-center justify-between">
  <div
    className="text-[32px] font-semibold"
    style={{ color: palette.ink, letterSpacing: "-0.01em" }}
  >
    Projects
  </div>

 <button
  onClick={() => onNew?.()}
  className="text-[13px] font-semibold"
  style={{
    color: palette.orange,                 // your signature orange
    WebkitTapHighlightColor: "transparent",
  }}
  aria-label="Create new project"
  title="New project"
>
  + New
</button>


</div>


      <div className="px-6">
        {/* Continue */}
        {continueProjects.length > 0 ? (
          <div className="mb-7">
            <SectionHeader title="Continue" />
            <div
              className="mt-4 flex gap-3 overflow-x-auto pb-2"
              style={{
                scrollbarWidth: "none",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {continueProjects.map((p) => (
                <ContinueCard key={p.id} project={p} onOpen={openProject} palette={palette} />
              ))}
            </div>
          </div>
        ) : null}

        {/* All Projects */}
        <div className="mb-0">
          <SectionHeader
            title="All projects"
            right={<span style={{ color: palette.muted }}>{projects.length || 0}</span>}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          {projects.map((project) => (
            <ProjectTile key={project.id} project={project} onOpen={openProject} palette={palette} />
          ))}
        </div>

        {projects.length === 0 && (
          <div className="pt-10 text-[12px] font-medium" style={{ color: palette.muted }}>
            No projects yet. Tap “+ New” to start.
          </div>
        )}
      </div>
    </div>
  );
}
