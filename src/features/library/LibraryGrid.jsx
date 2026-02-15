import React from 'react';
import { Camera } from 'lucide-react';
import { useVault } from '../../context/VaultContext';

export default function LibraryGrid({ onQuickAdd }) {
  const { filteredProjects, setActiveProject, setView } = useVault();

  const openProject = (p) => {
    setActiveProject(p);
    setView('project');
  };

  return (
    <div className="w-full pb-32 animate-in fade-in duration-500">
      {/* STRICT 2-COLUMN GRID */}
      <div className="grid grid-cols-2 gap-3">
        {filteredProjects.map(project => (
          <div 
            key={project.id} 
            className="aspect-[3/4] rounded-2xl overflow-hidden relative cursor-pointer shadow-lg group border border-gray-200 bg-gray-100"
            onClick={() => openProject(project)}
          >
            {project.coverPhoto ? (
               <img 
                 src={project.coverPhoto} 
                 className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                 alt="" 
               />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300 font-mono text-[10px] tracking-widest">
                NO COVER
              </div>
            )}
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-90" />
            
            {/* Quick Capture Button */}
            <button 
              onClick={(e) => {
                e.stopPropagation(); // Prevents opening the project
                if (onQuickAdd) onQuickAdd(project);
              }}
              className="absolute top-2 right-2 w-8 h-8 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 hover:bg-white hover:text-black transition-all shadow-lg z-20"
            >
              <Camera className="w-4 h-4" />
            </button>

            <div className="absolute bottom-3 left-3 right-3">
              <h3 className="text-white font-black text-sm leading-tight mb-1 line-clamp-2 uppercase tracking-tighter">
                {project.title}
              </h3>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                {project.status === 'graveyard' ? 'EXPIRING' : (project.expiresIn || '30 DAYS')}
              </p>
            </div>
          </div>
        ))}

        {filteredProjects.length === 0 && (
          <div className="col-span-2 py-10 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
            No projects found.
          </div>
        )}
      </div>
    </div>
  );
}