// /src/features/library/LibraryGrid.jsx
import React, { useMemo, useState } from "react";
import { useVault } from "../../context/VaultContext";

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
    const next = [{ id: projectId, t: now }, ...prev.filter((x) => x.id !== projectId)].slice(0, 12);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {}
}

function SectionHeader({ title, right }) {
  return (
    <div className="flex items-baseline justify-between" style={{ marginTop: 18 }}>
      <div className="label-caps">{title}</div>
      {right ? <div className="text-[12px]" style={{ color: "var(--muted)" }}>{right}</div> : null}
    </div>
  );
}

function CoverBox({ src, radius = 14, aspect = "1 / 1" }) {
  return (
    <div
      style={{
        width: "100%",
        aspectRatio: aspect,
        borderRadius: radius,
        overflow: "hidden",
        border: "1px solid var(--hairline)",
        background: "rgba(0,0,0,0.04)",
      }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          draggable={false}
          loading="lazy"
          decoding="async"
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            background:
              "linear-gradient(135deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.02) 55%, rgba(0,0,0,0.04) 100%)",
          }}
        />
      )}
    </div>
  );
}

function ContinueCard({ project, onOpen }) {
  const dateText = formatProjectDate(project?.createdAt);

  return (
    <button
      onClick={() => onOpen(project)}
      className="shrink-0 text-left active:scale-[0.995] transition-transform"
      style={{ width: 216, WebkitTapHighlightColor: "transparent" }}
      aria-label={`Open ${project?.title || "project"}`}
      title={project?.title || "Open project"}
    >
      <div className="flex flex-col gap-3">
        <CoverBox src={project?.coverPhoto} radius={14} aspect={"4 / 3"} />

        <div className="px-0.5">
          <div
            className="text-[13px] font-semibold leading-tight line-clamp-1 uppercase"
            style={{ color: "var(--ink)", letterSpacing: "0.18em" }}
          >
            {project?.title || "Untitled"}
          </div>
          {dateText ? (
            <div className="mt-1 text-[11px] font-medium" style={{ color: "var(--muted)" }}>
              {dateText}
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function ProjectTile({ project, onOpen }) {
  const dateText = formatProjectDate(project?.createdAt);

  return (
    <button
      onClick={() => onOpen(project)}
      className="w-full text-left active:scale-[0.995] transition-transform"
      style={{ WebkitTapHighlightColor: "transparent" }}
      aria-label={`Open ${project?.title || "project"}`}
      title={project?.title || "Open project"}
    >
      <div className="flex flex-col gap-3">
        <CoverBox src={project?.coverPhoto} radius={14} aspect={"1 / 1"} />

        <div className="px-0.5">
          <div
            className="text-[13px] font-semibold leading-tight line-clamp-1 uppercase"
            style={{ color: "var(--ink)", letterSpacing: "0.18em" }}
          >
            {project?.title || "Untitled"}
          </div>
          {dateText ? (
            <div className="mt-1 text-[11px] font-medium" style={{ color: "var(--muted)" }}>
              {dateText}
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export default function LibraryGrid({ title = "Projects", onNew }) {
  const { filteredProjects, setActiveProject, setView } = useVault();

  const [recents, setRecents] = useState(() => readRecents());
  const projects = useMemo(() => filteredProjects || [], [filteredProjects]);

  const continueProjects = useMemo(() => {
    if (!projects.length) return [];
    const byId = new Map(projects.map((p) => [p.id, p]));
    return recents.map((r) => byId.get(r.id)).filter(Boolean).slice(0, 8);
  }, [projects, recents]);

  const openProject = (p) => {
    setActiveProject(p);
    setView("project");
    bumpRecent(p?.id);
    setRecents(readRecents());
  };

  const showHeader = typeof title === "string" ? title.trim().length > 0 : !!title;

  return (
    <div className="w-full pb-32 animate-in fade-in duration-300">
      {showHeader ? (
        <div className="px-6 pt-4 pb-2 flex items-center justify-between">
          <div
            className="text-[32px]"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 600,
              color: "var(--ink)",
              letterSpacing: "-0.01em",
              lineHeight: 1.08,
            }}
          >
            {title}
          </div>

          {onNew ? (
            <button
              onClick={() => onNew?.()}
              className="h-9 px-3 rounded-[999px] text-[12px] font-semibold uppercase active:scale-[0.99] transition-transform"
              style={{
                background: "rgba(255,255,255,0.76)",
                border: "1px solid var(--line)",
                color: "rgba(0,0,0,0.68)",
                letterSpacing: "0.16em",
                WebkitTapHighlightColor: "transparent",
              }}
              aria-label="Create new project"
              title="New project"
            >
              + New
            </button>
          ) : (
            <div className="w-12" />
          )}
        </div>
      ) : null}

      <div className="px-6">
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
              <style>{`.hide-scroll::-webkit-scrollbar{ display:none; }`}</style>
              <div className="flex gap-3 hide-scroll">
                {continueProjects.map((p) => (
                  <ContinueCard key={p.id} project={p} onOpen={openProject} />
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <div className="mb-0">
          <SectionHeader title="All projects" right={<span>{projects.length || 0}</span>} />
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {projects.map((project) => (
            <ProjectTile key={project.id} project={project} onOpen={openProject} />
          ))}
        </div>

        {projects.length === 0 && (
          <div className="pt-10 text-[12px] font-medium" style={{ color: "var(--muted)" }}>
            No projects yet. Tap “+ New” to start.
          </div>
        )}
      </div>
    </div>
  );
}