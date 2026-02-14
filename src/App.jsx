// src/App.jsx
import React, { useState } from "react";
import {
  ChevronLeft,
  Share,
  Play,
  Camera,
  MapPin,
  Mic,
  Upload,
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
    addMediaToProject,
    deleteProject,
  } = useVault();

  const [newOpen, setNewOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);

  // ✅ Distinguish camera vs file upload
  const [mediaMode, setMediaMode] = useState("upload"); // "upload" | "camera"

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

  const handleCreateProject = async ({ title, tags }) => {
    try {
      const p = await addProject({ title, tags }); // ✅ async now
      setNewOpen(false);
      setActiveProject(p);
      setView("project");
    } catch (e) {
      console.error("Create project failed:", e);
      alert(e?.message || "Create project failed. Check console.");
    }
  };

  const handleAddMedia = async ({ file, sessionId, createNewSessionTitle }) => {
    if (!activeProject?.id) return;
    try {
      await addMediaToProject(activeProject.id, { file, sessionId, createNewSessionTitle });
      setMediaOpen(false);
    } catch (e) {
      console.error("Add media failed:", e);
      alert(e?.message || "Add media failed. Check console.");
    }
  };

  const openCamera = () => {
    setMediaMode("camera");
    setMediaOpen(true);
  };

  const openUploader = () => {
    setMediaMode("upload");
    setMediaOpen(true);
  };

  const handleDeleteProject = async () => {
    if (!activeProject?.id) return;
    const ok = window.confirm(
      `Delete "${activeProject.title}"? This will remove the project and its media references.`
    );
    if (!ok) return;

    try {
      await deleteProject(activeProject.id);
      // context already resets view/active project, but safe:
      setActiveProject(null);
      setView("dashboard");
    } catch (e) {
      console.error("Delete project failed:", e);
      alert(e?.message || "Delete failed. Check console.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 flex justify-center items-center p-0 sm:p-4 font-sans">
      <div className="w-full max-w-md h-[100vh] sm:h-[850px] bg-white sm:rounded border-gray-300 overflow-hidden shadow-2xl flex flex-col relative border-x">
        {/* Header - Only for Drilldown */}
        {view !== "dashboard" && (
          <div className="px-4 pt-12 pb-3 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-gray-200 z-40 absolute top-0 left-0 right-0">
            <button
              onClick={goBack}
              className="flex items-center text-gray-600 hover:text-black transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
              <span className="font-semibold text-sm">Back</span>
            </button>

            <button className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-black px-3 py-1.5 rounded text-[10px] font-bold transition-colors border border-gray-300 uppercase tracking-tighter">
              <Share className="w-3 h-3" /> Send to Photos
            </button>
          </div>
        )}

        {/* Content */}
        <div
          className={`flex-1 overflow-y-auto no-scrollbar pb-32 ${
            view !== "dashboard" ? "pt-24" : ""
          }`}
        >
          {/* DASHBOARD */}
          {view === "dashboard" && (
            <>
              <LibraryGrid onNewProject={() => setNewOpen(true)} />
              <Navigation currentTab={tab} setTab={setTab} />
            </>
          )}

          {/* PROJECT VIEW */}
          {view === "project" && activeProject && (
            <div className="p-5 animate-in slide-in-from-right-4 duration-300">
              {/* Title + Actions */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <h2 className="text-3xl font-black uppercase leading-none">
                  {activeProject.title}
                </h2>

                <div className="flex gap-2">
                  <button
                    onClick={openUploader}
                    className="shrink-0 px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 font-black uppercase text-[10px] tracking-tight flex items-center gap-2 hover:bg-gray-50 active:scale-[0.99] transition"
                    type="button"
                    aria-label="Upload files"
                    title="Upload files"
                  >
                    <Upload className="w-4 h-4" />
                    Upload
                  </button>

                  <button
                    onClick={handleDeleteProject}
                    className="shrink-0 px-3 py-2 rounded-xl border border-gray-200 bg-white text-red-600 font-black uppercase text-[10px] tracking-tight flex items-center gap-2 hover:bg-red-50 active:scale-[0.99] transition"
                    type="button"
                    aria-label="Delete project"
                    title="Delete project"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-6">
                {(activeProject.aiTags || []).map((tag) => (
                  <span
                    key={tag}
                    className="text-[9px] font-mono bg-gray-100 border px-2 py-0.5 rounded text-gray-500"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {activeProject.overallAudio ? (
                <div className="bg-gray-50 border border-gray-200 rounded p-4 mb-8 shadow-inner">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white">
                      <Play className="w-3 h-3 ml-0.5" />
                    </div>
                    <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                      Global Session Memo
                    </p>
                  </div>
                  <p className="text-sm text-gray-700 italic border-l-2 border-gray-300 pl-3">
                    "{activeProject.overallAudio}"
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 border border-dashed border-gray-200 rounded p-4 mb-8 text-xs text-gray-400 font-mono uppercase">
                  No global memo yet
                </div>
              )}

              {(activeProject.sessions || []).map((session) => (
                <div key={session.id} className="mb-8">
                  <div className="flex justify-between items-baseline border-b border-gray-200 pb-1 mb-3">
                    <h3 className="font-bold text-xs uppercase text-gray-400">
                      {session.title}
                    </h3>
                    <p className="text-[9px] font-mono text-gray-400">{session.date}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-1">
                    {(session.media || []).map((m) => (
                      <MediaCard key={m.id} item={m} onClick={() => navigateToMedia(m)} />
                    ))}

                    {/* ✅ Camera tile (instant camera) */}
                    <button
                      onClick={openCamera}
                      className="aspect-square bg-gray-50 rounded border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:text-gray-500 active:scale-95 transition"
                      aria-label="Open camera"
                      type="button"
                      title="Open camera"
                    >
                      <Camera className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              ))}

              {/* If there are NO sessions, still show actions */}
              {(!activeProject.sessions || activeProject.sessions.length === 0) && (
                <div className="mt-4 space-y-3">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400">
                    No sessions yet
                  </p>

                  <button
                    onClick={openCamera}
                    className="w-full py-4 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-gray-900 font-black uppercase tracking-tight active:scale-[0.99] transition flex items-center justify-center gap-2"
                    type="button"
                  >
                    <Camera className="w-5 h-5" />
                    Open Camera
                  </button>

                  <button
                    onClick={openUploader}
                    className="w-full py-4 rounded-xl border border-gray-200 bg-white text-gray-900 font-black uppercase tracking-tight active:scale-[0.99] transition flex items-center justify-center gap-2 hover:bg-gray-50"
                    type="button"
                  >
                    <Upload className="w-5 h-5" />
                    Upload Files
                  </button>
                </div>
              )}
            </div>
          )}

          {/* MEDIA VIEW */}
          {view === "media" && activeMedia && (
            <div className="h-full flex flex-col animate-in zoom-in-95 duration-200">
              <div className="flex-1 bg-black flex items-center justify-center relative group">
                {activeMedia.type === "video" ? (
                  <video
                    src={activeMedia.url}
                    controls
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <img
                    src={activeMedia.url}
                    className="max-h-full max-w-full object-contain"
                    alt=""
                  />
                )}

                {(activeMedia.hotspots || []).map((spot) => (
                  <div
                    key={spot.id}
                    className="absolute w-8 h-8 -ml-4 -mt-4 bg-white rounded-full border-2 border-black flex items-center justify-center shadow-lg"
                    style={{ top: `${spot.y}%`, left: `${spot.x}%` }}
                  >
                    <div className="w-2 h-2 bg-black rounded-full" />
                  </div>
                ))}
              </div>

              <div className="p-5 border-t border-gray-200 bg-white shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                {activeMedia.hotspots?.[0] ? (
                  <div className="mb-4">
                    <p className="text-[10px] font-mono uppercase text-gray-400 mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {activeMedia.hotspots[0].title}
                    </p>
                    <p className="text-sm font-bold">"{activeMedia.hotspots[0].note}"</p>
                  </div>
                ) : (
                  <div className="h-12 flex items-center justify-center border border-dashed rounded text-xs text-gray-400 uppercase font-mono mb-4">
                    No Pin Selected
                  </div>
                )}

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
