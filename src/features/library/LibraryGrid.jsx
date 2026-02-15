import React from 'react';
import { Plus } from 'lucide-react';
import { useVault } from '../../context/VaultContext';

export default function LibraryGrid() {
  const { filteredProjects, setActiveProject, setView, setTab } = useVault();

  const openProject = (p) => {
    setActiveProject(p);
    setView('project');
  };

  return (
    <div className="w-full pb-32 animate-in fade-in duration-500">
      
      {/* Header Area */}
      <div className="px-5 pt-8 pb-6 flex justify-between items-center sticky top-0 bg-gray-50/95 backdrop-blur-sm z-10">
        <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">Vault</h1>
      </div>

      {/* The 2-Column Grid */}
      <div className="px-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredProjects.map(project => (
          <div 
            key={project.id} 
            className="aspect-[3/4] rounded-lg overflow-hidden relative cursor-pointer shadow-md group border border-gray-200"
            onClick={() => openProject(project)}
          >
            {/* Logic to find a cover photo */}
            {project.coverPhoto ? (
               <img 
               src={project.coverPhoto} 
               className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
               alt="" 
             />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 font-mono text-xs">
                NO COVER
              </div>
            )}
            
            {/* Dark Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80" />
            
            {/* Text Content */}
            <div className="absolute bottom-4 left-4 right-4">
              <h3 className="text-white font-bold text-lg leading-tight mb-1 line-clamp-2">{project.title}</h3>
              <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                {project.status === 'graveyard' ? 'EXPIRING SOON' : (project.expiresIn || '30 DAYS')}
              </p>
            </div>
          </div>
        ))}

        {filteredProjects.length === 0 && (
          <div className="col-span-full py-10 text-center text-gray-400 font-mono text-sm uppercase tracking-widest">
            No projects found.
          </div>
        )}
      </div>
    </div>
  );
}