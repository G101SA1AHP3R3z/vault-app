import React, { useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  Share,
  Play,
  Mic,
  Plus,
  Trash2,
  Upload,
  X,
  Pencil,
  Loader2,
  MapPin,
} from "lucide-react";

import { VaultProvider, useVault } from "./context/VaultContext";
import Navigation from "./components/Navigation";
import MediaCard from "./components/MediaCard";
import NewProjectModal from "./components/NewProjectModal";
import AddMediaModal from "./components/AddMediaModal";
import LibraryGrid from "./features/library/LibraryGrid";
import Login from "./components/Login"; 

function clamp01(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function AuthGate({ children }) {
  const { user, authReady } = useVault();

  if (!authReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
      </div>
    );
  }
  if (!user) return <Login />;
  return children;
}

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
    addHotspotToMedia,
    updateHotspotInMedia,
    deleteHotspotFromMedia,
  } = useVault();

  const [newOpen, setNewOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);

  // --- PIN LOGIC & MODE ---
  const [isAddPinMode, setIsAddPinMode] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinDraft, setPinDraft] = useState({ label: "", note: "" });
  const [pinTarget, setPinTarget] = useState(null); 

  const dragRef = useRef({ dragging: false, hotspotId: null, startX: 0, startY: 0 });
  const stageRef = useRef(null);

  const navigateToMedia = (m, sessionId) => {
    setActiveMedia({ ...m, sessionId });
    setView("media");
  };

  const goBack = () => {
    if (view === "media") {
      setView("project");
      setActiveMedia(null);
      setIsAddPinMode(false); // Reset mode when leaving
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
    }
  };

  const handleDeleteProject = async () => {
    if (!activeProject) return;
    if (confirm("Nuke this project?")) {
      await deleteProject(activeProject.id);
    }
  };

  const currentMedia = useMemo(() => {
    if (!activeProject || !activeMedia?.id) return null;
    const sid = activeMedia.sessionId;
    const session = (activeProject.sessions || []).find((s) => s.id === sid);
    if (!session) return null;
    const media = (session.media || []).find((mm) => mm.id === activeMedia.id);
    return media ? { ...media, sessionId: sid } : null;
  }, [activeProject, activeMedia?.id, activeMedia?.sessionId]);

  const currentHotspots = currentMedia?.hotspots || [];

  const handleStageClickToAddPin = async (e) => {
    if (!isAddPinMode) return; // Strict bouncer check. No button clicked = no pin dropped.

    try {
      if (!activeProject || !currentMedia) return;
      if (!stageRef.current) return;

      const rect = stageRef.current.getBoundingClientRect();
      const clientX = e.clientX ?? (e.touches?.[0]?.clientX);
      const clientY = e.clientY ?? (e.touches?.[0]?.clientY);
      if (clientX == null || clientY == null) return;

      const x = clamp01((clientX - rect.left) / rect.width);
      const y = clamp01((clientY - rect.top) / rect.height);

      await addHotspotToMedia(activeProject.id, currentMedia.sessionId, currentMedia.id, {
        x,
        y,
        label: "",
        note: "",
      });

      // Turn off mode automatically so they don't accidentally drop more
      setIsAddPinMode(false);
    } catch (err) {
      console.error("Failed to save pin:", err);
      alert("Failed to save pin. Check console.");
    }
  };

  const openPinEditor = (sessionId, mediaId, hotspot) => {
    setPinTarget({ sessionId, mediaId, hotspotId: hotspot.id });
    setPinDraft({ label: hotspot.label || "", note: hotspot.note || "" });
    setPinOpen(true);
  };

  const savePinEdits = async () => {
    if (!activeProject || !pinTarget) return;
    try {
      await updateHotspotInMedia(
        activeProject.id,
        pinTarget.sessionId,
        pinTarget.mediaId,
        pinTarget.hotspotId,
        { label: pinDraft.label || "", note: pinDraft.note || "" }
      );
      setPinOpen(false);
      setPinTarget(null);
    } catch (e) {
      console.error("Failed to update pin:", e);
    }
  };

  const deletePin = async () => {
    if (!activeProject || !pinTarget) return;
    if (!confirm("Delete this pin?")) return;
    try {
      await deleteHotspotFromMedia(
        activeProject.id,
        pinTarget.sessionId,
        pinTarget.mediaId,
        pinTarget.hotspotId
      );
      setPinOpen(false);
      setPinTarget(null);
    } catch (e) {
      console.error("Failed to delete pin:", e);
    }
  };

  const onPinPointerDown = (e, hotspotId) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current.dragging = true;
    dragRef.current.hotspotId = hotspotId;
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch {}
  };

  const onStagePointerMove = async (e) => {
    if (!dragRef.current.dragging) return;
  };

  const onStagePointerUp = async (e) => {
    if (!dragRef.current.dragging) return;
    dragRef.current.dragging = false;

    if (!activeProject || !currentMedia) return;
    if (!stageRef.current) return;

    const hotspotId = dragRef.current.hotspotId;
    dragRef.current.hotspotId = null;
    if (!hotspotId) return;

    try {
      const rect = stageRef.current.getBoundingClientRect();
      const x = clamp01((e.clientX - rect.left) / rect.width);
      const y = clamp01((e.clientY - rect.top) / rect.height);

      await updateHotspotInMedia(
        activeProject.id,
        currentMedia.sessionId,
        currentMedia.id,
        hotspotId,
        { x, y }
      );
    } catch (err) {
      console.error("Failed to move pin:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 flex justify-center items-center font-sans antialiased selection:bg-black selection:text-white">
      {view === "dashboard" && <Navigation currentTab={tab} setTab={setTab} />}

      <div className={`w-full transition-all duration-300 flex justify-center ${view === "dashboard" ? "md:pl-64" : ""}`}>
        <div className={`w-full ${view === "dashboard" ? "max-w-md" : "max-w-6xl"} min-h-screen bg-white shadow-2xl relative border-x border-gray-200`}>
          
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

          {view === "dashboard" && (
            <div className="p-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex justify-between items-center mb-6 pt-8">
                <h1 className="text-2xl font-black tracking-tight uppercase">Vault</h1>
                <button onClick={() => setNewOpen(true)} className="w-10 h-10 rounded bg-black text-white flex items-center justify-center shadow-md active:scale-95 transition-transform">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <LibraryGrid />
            </div>
          )}

          {view === "project" && activeProject && (
            <div className="p-5 md:p-10 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-4xl md:text-6xl font-black uppercase mb-6 leading-none tracking-tighter text-black">
                  {activeProject.title}
                </h2>
                <button onClick={() => setMediaOpen(true)} className="shrink-0 mt-2 px-3 py-2 rounded-xl bg-black text-white font-black text-xs uppercase tracking-tight flex items-center gap-2 active:scale-95 transition">
                  <Upload className="w-4 h-4" /> Add Media
                </button>
              </div>

              <div className="flex flex-wrap gap-1 mb-8">
                {activeProject.aiTags?.map((tag) => (
                  <span key={tag} className="text-[10px] font-bold uppercase bg-gray-100 border px-3 py-1 rounded text-gray-500">
                    #{tag}
                  </span>
                ))}
              </div>

              {activeProject.overallAudio && (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 mb-10 shadow-sm flex gap-4">
                  <button className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center shrink-0 shadow-lg hover:scale-105 transition-transform">
                    <Play className="w-5 h-5 ml-1" />
                  </button>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Project Context</p>
                    <p className="text-sm text-gray-900 leading-relaxed italic">"{activeProject.overallAudio}"</p>
                  </div>
                </div>
              )}

              {(activeProject.sessions || []).map((session) => (
                <div key={session.id} className="mb-12">
                  <div className="flex justify-between items-baseline border-b-2 border-black pb-2 mb-4">
                    <h3 className="font-black text-sm uppercase text-black">{session.title}</h3>
                    <p className="text-xs font-mono text-gray-400">{session.date}</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {(session.media || []).map((m) => (
                      <MediaCard key={m.id} item={m} onClick={() => navigateToMedia(m, session.id)} />
                    ))}
                  </div>
                </div>
              ))}

              {(!activeProject.sessions || activeProject.sessions.length === 0) && (
                <div onClick={() => setMediaOpen(true)} className="border-2 border-dashed border-gray-200 rounded-2xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-black hover:bg-gray-50 transition-all group">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                    <Upload className="w-8 h-8" />
                  </div>
                  <p className="font-bold text-gray-400 uppercase tracking-widest group-hover:text-black">Add First Media</p>
                </div>
              )}
            </div>
          )}

          {view === "media" && activeProject && currentMedia && (
            <div className="h-full flex flex-col animate-in zoom-in-95 duration-200 relative">
              <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden">
                <div
                  ref={stageRef}
                  className={`relative w-full h-full max-w-6xl max-h-[80vh] md:max-h-[85vh] touch-none select-none transition-all ${isAddPinMode ? "cursor-crosshair opacity-90" : ""}`}
                  onClick={handleStageClickToAddPin}
                  onPointerMove={onStagePointerMove}
                  onPointerUp={onStagePointerUp}
                >
                  <img
                    src={currentMedia.url}
                    className="w-full h-full object-contain"
                    alt=""
                    draggable={false}
                  />

                  {currentHotspots.map((h, idx) => {
                    const left = `${clamp01(h.x) * 100}%`;
                    const top = `${clamp01(h.y) * 100}%`;
                    const number = idx + 1;

                    return (
                      <button
                        key={h.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isAddPinMode) openPinEditor(currentMedia.sessionId, currentMedia.id, h);
                        }}
                        onPointerDown={(e) => {
                          if (!isAddPinMode) onPinPointerDown(e, h.id);
                        }}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all ${isAddPinMode ? 'pointer-events-none opacity-40 scale-75' : 'pointer-events-auto cursor-pointer hover:scale-110 z-10'}`}
                        style={{ left, top }}
                        aria-label="Pin"
                      >
                        <div className="w-9 h-9 rounded-full bg-white text-black font-black text-xs flex items-center justify-center shadow-2xl border border-black/20 active:scale-95 transition">
                          {number}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* --- THE ADD PIN BUTTON --- */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 z-50">
                  <button
                    onClick={() => setIsAddPinMode(!isAddPinMode)}
                    className={`px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-2xl transition-all flex items-center gap-2 ${
                      isAddPinMode 
                        ? 'bg-white text-black animate-pulse' 
                        : 'bg-black text-white border border-white/20 hover:bg-gray-900'
                    }`}
                  >
                    {isAddPinMode ? (
                      <>
                        <X className="w-4 h-4" /> Cancel Pin
                      </>
                    ) : (
                      <>
                        <MapPin className="w-4 h-4" /> Add Pin
                      </>
                    )}
                  </button>
                </div>

                {isAddPinMode && (
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center pointer-events-none z-50 animate-in fade-in slide-in-from-top-2">
                    <span className="inline-block bg-white text-black text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-lg border border-gray-200">
                      Tap anywhere to drop a pin
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <NewProjectModal open={newOpen} onClose={() => setNewOpen(false)} onCreate={handleCreateProject} />
        <AddMediaModal isOpen={mediaOpen} onClose={() => setMediaOpen(false)} project={activeProject} onAddMedia={handleAddMedia} mode="upload" existingSessions={activeProject?.sessions || []} />

        {pinOpen && (
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPinOpen(false)} />
            <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
              <div className="px-5 py-4 flex justify-between items-center border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Pencil className="w-4 h-4" />
                  <h3 className="text-sm font-black uppercase tracking-tight">Edit Pin</h3>
                </div>
                <button onClick={() => setPinOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Label (optional)</label>
                  <input
                    value={pinDraft.label}
                    onChange={(e) => setPinDraft((p) => ({ ...p, label: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 ring-black"
                    placeholder="e.g. Waistline"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Note</label>
                  <textarea
                    rows={4}
                    value={pinDraft.note}
                    onChange={(e) => setPinDraft((p) => ({ ...p, note: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-black resize-none"
                    placeholder="What needs to change here?"
                  />
                </div>
              </div>

              <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3">
                <button onClick={deletePin} className="flex-1 py-3 rounded-xl font-black text-sm text-red-600 bg-white border border-red-200 hover:bg-red-50">
                  Delete
                </button>
                <button onClick={savePinEdits} className="flex-[2] py-3 rounded-xl font-black text-sm bg-black text-white hover:bg-gray-900">
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <VaultProvider>
      <AuthGate>
        <VaultShell />
      </AuthGate>
    </VaultProvider>
  );
}