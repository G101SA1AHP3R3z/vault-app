import React from "react";
import { Plus, Search } from "lucide-react";
import { useVault } from "../../context/VaultContext";

export default function LibraryGrid({ onNewProject }) {
  const { filteredProjects, setActiveProject, setView, tab, search, setSearch } = useVault();

  const openProject = (p) => {
    setActiveProject(p);
    setView("project");
  };

  return (
    <div className="p-5 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-28">
      <div className="flex justify-between items-center mb-6 pt-8">
        <h1 className="text-2xl font-black tracking-tight uppercase">Vault</h1>
        <button
          onClick={onNewProject}
          className="w-10 h-10 rounded bg-black text-white flex items-center justify-center shadow-md active:scale-95 transition-transform"
          aria-label="New Project"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {tab === "search" && (
        <div className="mb-6 animate-in slide-in-from-top-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full bg-gray-100 border-none rounded py-3 pl-10 pr-4 text-sm focus:ring-2 ring-black transition-all"
              placeholder="Search transcripts and tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {filteredProjects.map((p) => (
          <div
            key={p.id}
            onClick={() => openProject(p)}
            className="aspect-[3/4] rounded bg-gray-200 relative overflow-hidden group cursor-pointer shadow-sm active:scale-[0.98] transition-all"
          >
            <img
              src={p.coverPhoto}
              className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500"
              alt=""
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 text-white">
              <p className="text-xs font-bold leading-tight line-clamp-2">{p.title}</p>
              <p className="text-[9px] font-mono text-gray-300 mt-1 uppercase tracking-tighter">
                {p.status === "graveyard" ? `Ends in ${p.daysLeft}d` : p.expiresIn}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
