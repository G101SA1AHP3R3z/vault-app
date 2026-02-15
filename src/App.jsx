import React, { useState } from "react";
import {
  ChevronLeft,
  Share,
  Play,
  Camera,
  MapPin,
  Mic,
  Plus,
  Trash2,
} from "lucide-react";

import { VaultProvider, useVault } from "./context/VaultContext";
import Navigation from "./components/Navigation";
import MediaCard from "./components/MediaCard";
import NewProjectModal from "./components/NewProjectModal";
import AddMediaModal from "./components/AddMediaModal";
import LibraryGrid from "./features/library/LibraryGrid";

function VaultShell() {
  const {
    view,
    setView,
    tab,
    setTab,
    activeProject,
    setActiveProject,
    activeMedia,
    setActiveMedia,
    addProject,
    addMediaToProject, // IMPORTED
    deleteProject,
  } = useVault();

  const [newOpen, setNewOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaMode, setMediaMode] = useState("upload");

  const navigateToMedia = (m) => {
    setActiveMedia(m);
    setView("media");
  };

  const goBack = () => {
    if (view === "media") {
      setView("project");
      setActiveMedia(null);
    } else {
      setView("dashboard");
      setActiveProject(null);
    }
  };

  const handleCreateProject = async ({ title, tags, note }) => {
    try {
      const p = await addProject({ title, aiTags: tags, note });
      setNewOpen(false);
      setActiveProject(p);
      setView("project");
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddMedia = async ({ file, sessionId, sessionTitle }) => {
    if (!activeProject) return;
    try {
      await addMediaToProject(activeProject.id, file, sessionId, sessionTitle);
      setMediaOpen(false);
    } catch (e) {
      console.error("Media upload failed", e);
      alert("Failed to upload media. Check console.");
    }
  };

  const handleDeleteProject = async () => {
    if (!activeProject) return;
    if (confirm("Nuke this project?")) {
      await deleteProject(activeProject.id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 flex justify-center items-center font-sans antialiased selection:bg-black selection:text-white">
      
      {/* Navigation Layer */}
      {view === "dashboard" && <Navigation currentTab={tab} setTab={setTab} />}

      <div className={`w-full transition-all duration-300 flex justify-center ${view === "dashboard" ? "md:pl-64" : ""}`}>
        <div className={`w-full ${view === "dashboard" ? "max-w-md" : "max-w-6xl"} min-h-screen bg-white shadow-2xl relative border-x border-gray-200`}>
          
          {/* Header */}
          {view !== "dashboard" && (
            <div className="px-4 pt-12 pb-3 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-gray-200 z-40 sticky top-0">
              <button onClick={goBack} className="flex items-center text-gray-600 hover:text-black transition-colors">
                <ChevronLeft className="w-6 h-6" />
                <span className="font-semibold text-sm">Back</span>
              </button>
              <div className="flex gap-2">
                 <button onClick={handleDeleteProject} className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors">
                    <Trash2 className="w-4 h-4" />
                 </button>
                 <button className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-black px-3 py-1.5 rounded text-[10px] font-bold transition-colors border border-gray-300 uppercase tracking-tighter">
                   <Share className="w-3 h-3" /> Export
                 </button>
              </div>
            </div>
          )}

          {/* DASHBOARD */}
          {view === "dashboard" && (
            <div className="p-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex justify-between items-center mb-6 pt-8">
                <h1 className="text-2xl font-black tracking-tight uppercase">Vault</h1>
                <button
                  onClick={() => setNewOpen(true)}
                  className="w-10 h-10 rounded bg-black text-white flex items-center justify-center shadow-md active:scale-95 transition-transform"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <LibraryGrid />
            </div>
          )}

          {/* PROJECT VIEW */}
          {view === "project" && activeProject && (
            <div className="p-5 md:p-10 animate-in slide-in-from-right-4 duration-300">
              <h2 className="text-4xl md:text-6xl font-black uppercase mb-6 leading-none tracking-tighter text-black">
                {activeProject.title}
              </h2>
              
              <div className="flex flex-wrap gap-1 mb-8">
                {activeProject.aiTags?.map((tag) => (
                  <span key={tag} className="text-[10px] font-bold uppercase bg-gray-100 border px-3 py-1 rounded text-gray-500">
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Context Memo */}
              {activeProject.overallAudio && (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 mb-10 shadow-sm flex gap-4">
                  <button className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center shrink-0 shadow-lg hover:scale-105 transition-transform">
                    <Play className="w-5 h-5 ml-1" />
                  </button>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Project Context</p>
                    <p className="text-sm text-gray-900 leading-relaxed italic">
                      "{activeProject.overallAudio}"
                    </p>
                  </div>
                </div>
              )}

              {/* Sessions */}
              {(activeProject.sessions || []).map((session) => (
                <div key={session.id} className="mb-12">
                  <div className="flex justify-between items-baseline border-b-2 border-black pb-2 mb-4">
                    <h3 className="font-black text-sm uppercase text-black">
                      {session.title}
                    </h3>
                    <p className="text-xs font-mono text-gray-400">
                      {session.date}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {(session.media || []).map((m) => (
                      <MediaCard key={m.id} item={m} onClick={() => navigateToMedia(m)} />
                    ))}
                    {/* Add to Existing Session */}
                    <div 
                      onClick={() => { setMediaMode('camera'); setMediaOpen(true); }}
                      className="aspect-square bg-gray-50 rounded border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:text-black hover:border-black transition-all cursor-pointer"
                    >
                      <Camera className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Add First Session */}
              {(!activeProject.sessions || activeProject.sessions.length === 0) && (
                <div 
                   onClick={() => { setMediaMode('camera'); setMediaOpen(true); }}
                   className="border-2 border-dashed border-gray-200 rounded-2xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-black hover:bg-gray-50 transition-all group"
                >
                   <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                      <Camera className="w-8 h-8" />
                   </div>
                   <p className="font-bold text-gray-400 uppercase tracking-widest group-hover:text-black">Start First Session</p>
                </div>
              )}
            </div>
          )}
          
          {/* MEDIA VIEW */}
          {view === "media" && activeMedia && (
            <div className="h-full flex flex-col animate-in zoom-in-95 duration-200">
               <div className="flex-1 bg-black flex items-center justify-center relative group">
                  <img src={activeMedia.url} className="max-h-full max-w-full object-contain" alt="" />
               </div>
               {/* Detail Footer */}
               <div className="p-5 border-t border-gray-200 bg-white">
                  <button className="w-full py-4 bg-black text-white font-black rounded flex items-center justify-center gap-2 active:scale-95 transition-all">
                    <Mic className="w-5 h-5" /> Hold to Voice-Pin
                  </button>
               </div>
            </div>
          )}

        </div>

        {/* Modals */}
        <NewProjectModal
          open={newOpen}
          onClose={() => setNewOpen(false)}
          onCreate={handleCreateProject}
        />

        <AddMediaModal
          isOpen={mediaOpen}
          onClose={() => setMediaOpen(false)}
          project={activeProject}
          onAddMedia={handleAddMedia}
          mode={mediaMode} // "camera" or "upload"
          existingSessions={activeProject?.sessions || []}
        />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <VaultProvider>
      <VaultShell />
    </VaultProvider>
  );
}