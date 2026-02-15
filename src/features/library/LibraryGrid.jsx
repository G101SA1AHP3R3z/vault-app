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

  return (
    <div className="w-full pb-32 animate-in fade-in duration-500">
      {/* STRICT 2-COLUMN GRID */}
      <div className="grid grid-cols-2 gap-3">
        {filteredProjects.map((project) => (
          <div
            key={project.id}
            onClick={() => openProject(project)}
            className="aspect-[3/4] relative overflow-hidden cursor-pointer group active:scale-[0.99] transition-transform"
            style={{
              borderRadius: 14,
              background: "rgba(255,255,255,0.62)",
              border: `1px solid ${palette.line}`,
              backdropFilter: "blur(14px)",
              boxShadow: "0 18px 45px -38px rgba(0,0,0,0.35)",
            }}
          >
            {/* Cover */}
            {project.coverPhoto ? (
              <>
                <img
                  src={project.coverPhoto}
                  className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700"
                  alt=""
                  loading="lazy"
                />

                {/* unify overlay (sun/sky) */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(58,168,255,0.14) 0%, rgba(255,234,58,0.10) 55%, rgba(255,255,255,0.06) 100%)",
                    mixBlendMode: "screen",
                  }}
                />
                <div className="absolute inset-0 bg-white/5 pointer-events-none" />
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-black/40">
                <div
                  className="w-10 h-10 grid place-items-center"
                  style={{
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.70)",
                    border: `1px solid ${palette.line}`,
                    backdropFilter: "blur(14px)",
                  }}
                >
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-widest">No cover</div>
              </div>
            )}

            {/* Bottom gradient for title legibility (lighter, not gloomy) */}
            <div
              className="absolute inset-x-0 bottom-0 h-[52%] pointer-events-none"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(0,0,0,0.10) 30%, rgba(0,0,0,0.58) 100%)",
              }}
            />

            {/* Quick Capture Button (radius <= 8px) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onQuickAdd) onQuickAdd(project);
              }}
              className="absolute top-2 right-2 w-9 h-9 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
              style={{
                borderRadius: 8,
                background: "rgba(255,255,255,0.58)",
                border: `1px solid ${palette.line}`,
                backdropFilter: "blur(14px)",
                color: "rgba(0,0,0,0.70)",
              }}
              aria-label="Quick add media"
              title="Quick add"
            >
              <Camera className="w-4 h-4" />
            </button>

            {/* Title + meta */}
            <div className="absolute bottom-3 left-3 right-3 z-10">
              <h3 className="text-white text-sm leading-tight mb-1 line-clamp-2 font-semibold tracking-[-0.01em]">
                {project.title}
              </h3>

              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold text-white/70 uppercase tracking-widest">
                  {project.status === "graveyard" ? "Expiring" : project.expiresIn || "30 days"}
                </p>

                {/* tiny sunny accent */}
                <div className="flex items-center gap-1">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: palette.sun, opacity: 0.95 }}
                  />
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: palette.sky, opacity: 0.65 }}
                  />
                </div>
              </div>
            </div>

            {/* hover hairline */}
            <div
              className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                borderRadius: 14,
                boxShadow:
                  "inset 0 0 0 1px rgba(255,234,58,0.18), inset 0 0 0 2px rgba(58,168,255,0.10)",
              }}
            />
          </div>
        ))}

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
            <div className="text-xs font-semibold uppercase tracking-widest">
              No projects found.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
