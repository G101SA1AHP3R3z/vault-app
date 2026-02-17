import React from "react";
import { Camera, Sparkles } from "lucide-react";
import { useVault } from "../../context/VaultContext";

export default function LibraryGrid({ onQuickAdd }) {
  const { filteredProjects, setActiveProject, setView } = useVault();

  const palette = {
    ink: "#0B0B0C",
    paper: "#FFFEFA",
    line: "rgba(0,0,0,0.08)",
    sky: "#3AA8FF",
    sun: "#FFEA3A",
    breeze: "#54E6C1",
  };

  const openProject = (p) => {
    setActiveProject(p);
    setView("project");
  };

  const getProjectThumbs = (project) => {
    const sessions = Array.isArray(project?.sessions) ? project.sessions : [];
    const media = sessions.flatMap((s) => (Array.isArray(s?.media) ? s.media : []));
    const urls = media
      .map((m) => m?.url)
      .filter((u) => typeof u === "string" && u.trim());

    const a = urls[0] || project?.coverPhoto || "";
    const b = urls[1] || urls[0] || project?.coverPhoto || "";
    const c = urls[2] || urls[1] || urls[0] || project?.coverPhoto || "";
    return [a, b, c];
  };

  const getProjectCount = (project) => {
    const sessions = Array.isArray(project?.sessions) ? project.sessions : [];
    return sessions.reduce((acc, s) => acc + (Array.isArray(s?.media) ? s.media.length : 0), 0);
  };

  return (
    <div className="w-full pb-28 animate-in fade-in duration-500">
      <div className="grid grid-cols-2 gap-4">
        {filteredProjects.map((project) => {
          const [a, b, c] = getProjectThumbs(project);
          const count = getProjectCount(project);

          return (
            <div
              key={project.id}
              onClick={() => openProject(project)}
              className="cursor-pointer active:scale-[0.99] transition-transform"
            >
              <div
                className="overflow-hidden relative"
                style={{
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.70)",
                  border: `1px solid ${palette.line}`,
                  backdropFilter: "blur(14px)",
                  boxShadow: "0 18px 45px -38px rgba(0,0,0,0.30)",
                }}
              >
                <div className="grid grid-cols-3 gap-[2px]" style={{ background: "rgba(0,0,0,0.06)" }}>
                  <div className="col-span-2 row-span-2 aspect-[4/3]">
                    {a ? (
                      <img src={a} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-black/35">
                        <Sparkles className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div className="aspect-[4/3]">
                    {b ? <img src={b} alt="" className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full bg-black/5" />}
                  </div>
                  <div className="aspect-[4/3]">
                    {c ? <img src={c} alt="" className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full bg-black/5" />}
                  </div>
                </div>

                <div
                  className="pointer-events-none"
                  style={{
                    height: 0,
                    boxShadow:
                      "inset 0 0 0 1px rgba(255,234,58,0.14), inset 0 0 0 2px rgba(58,168,255,0.08)",
                  }}
                />

                {onQuickAdd && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickAdd(project);
                    }}
                    className="absolute top-2 right-2 w-9 h-9 grid place-items-center"
                    style={{
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.72)",
                      border: `1px solid ${palette.line}`,
                      backdropFilter: "blur(14px)",
                      boxShadow: "0 18px 45px -40px rgba(0,0,0,0.35)",
                      color: "rgba(0,0,0,0.70)",
                    }}
                    aria-label="Quick add media"
                    title="Quick add"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="mt-2 px-0.5">
                <div className="text-[13px] font-semibold leading-tight" style={{ color: "rgba(0,0,0,0.82)" }}>
                  {project.title}
                </div>
                <div className="mt-0.5 text-[11px] text-black/45">
                  {count ? `${count} items` : "No items yet"}
                  {project?.expiresIn ? ` • ${project.expiresIn}` : ""}
                </div>
              </div>
            </div>
          );
        })}

        {filteredProjects.length === 0 && (
          <div
            className="col-span-2 py-12 text-center"
            style={{
              borderRadius: 14,
              background: "rgba(255,255,255,0.55)",
              border: `1px solid ${palette.line}`,
              backdropFilter: "blur(14px)",
              color: "rgba(0,0,0,0.45)",
            }}
          >
            <div className="text-xs font-semibold uppercase tracking-widest">No projects found.</div>
          </div>
        )}
      </div>
    </div>
  );
}
