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
    view, setView,
    tab, setTab,
    activeProject, setActiveProject,
    activeMedia, setActiveMedia,
    addProject, addMediaToProject, deleteProject, deleteMediaFromProject,
    addHotspotToMedia, updateHotspotInMedia, deleteHotspotFromMedia,
  } = useVault();

  const [newOpen, setNewOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);

  // --- PIN LOGIC & MODE ---
  const [isAddPinMode, setIsAddPinMode] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinDraft, setPinDraft] = useState({ label: "", note: "" });
  const [pinTarget, setPinTarget] = useState(null);

  // --- DRAG & TRASH LOGIC ---
  const [draggingPinId, setDraggingPinId] = useState(null);
  const [optimisticPin, setOptimisticPin] = useState(null);
  const [isHoveringTrash, setIsHoveringTrash] = useState(false);

  const dragRef = useRef({
    dragging: false,
    hotspotId: null,
    startX: 0,
    startY: 0,
    timer: null,
  });

  const stageRef = useRef(null);
  const trashRef = useRef(null); 

  const navigateToMedia = (m, sessionId) => {
    setActiveMedia({ ...m, sessionId });
    setView("media");
  };

  const goBack = () => {
    if (view === "media") {
      setView("project");
      setActiveMedia(null);
      setIsAddPinMode(false);
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
    if (confirm("Nuke this entire project?")) {
      await deleteProject(activeProject.id);
    }
  };

  const handleDeleteCurrentMedia = async () => {
    if (!activeProject || !currentMedia) return;
    if (confirm("Permanently delete this photo?")) {
      await deleteMediaFromProject(activeProject.id, currentMedia.sessionId, currentMedia.id);
      goBack(); 
    }
  };

  // --- NEW: QUICK ADD FROM GRID ---
  const handleQuickAdd = (project) => {
    setActiveProject(project);
    setMediaOpen(true);
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
    if (!isAddPinMode) return;

    try {
      if (!activeProject || !currentMedia) return;
      if (!stageRef.current) return;

      const rect = stageRef.current.getBoundingClientRect();
      const clientX = e.clientX ?? (e.touches?.[0]?.clientX);
      const clientY = e.clientY ?? (e.touches?.[0]?.clientY);
      if (clientX == null || clientY == null) return;

      const x = clamp01((clientX - rect.left) / rect.width);
      const y = clamp01((clientY - rect.top) / rect.height);
      const newPinId = `h-${Date.now()}`;

      await addHotspotToMedia(activeProject.id, currentMedia.sessionId, currentMedia.id, {
        id: newPinId,
        x, y, label: "", note: "",
      });

      setIsAddPinMode(false);
      openPinEditor(currentMedia.sessionId, currentMedia.id, { id: newPinId, label: "", note: "" });

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

  const onPinPointerDown = (e, hotspot) => {
    e.preventDefault();
    e.stopPropagation();

    dragRef.current.hotspotId = hotspot.id;
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;
    dragRef.current.dragging = false;

    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch {}

    dragRef.current.timer = setTimeout(() => {
      dragRef.current.dragging = true;
      setDraggingPinId(hotspot.id);
      setOptimisticPin({ id: hotspot.id, x: hotspot.x, y: hotspot.y });
    }, 1500);
  };

  const onStagePointerMove = (e) => {
    if (!dragRef.current.hotspotId) return;

    if (!dragRef.current.dragging) {
      const dx = Math.abs(e.clientX - dragRef.current.startX);
      const dy = Math.abs(e.clientY - dragRef.current.startY);
      if (dx > 10 || dy > 10) {
        clearTimeout(dragRef.current.timer);
        dragRef.current.timer = null;
        dragRef.current.hotspotId = null;
      }
      return;
    }

    if (stageRef.current) {
      const rect = stageRef.current.getBoundingClientRect();
      const clientX = e.clientX ?? (e.touches?.[0]?.clientX);
      const clientY = e.clientY ?? (e.touches?.[0]?.clientY);
      
      const x = clamp01((clientX - rect.left) / rect.width);
      const y = clamp01((clientY - rect.top) / rect.height);
      setOptimisticPin({ id: dragRef.current.hotspotId, x, y });

      if (trashRef.current) {
        const tRect = trashRef.current.getBoundingClientRect();
        const hovering =
          clientX >= tRect.left &&
          clientX <= tRect.right &&
          clientY >= tRect.top &&
          clientY <= tRect.bottom;
        
        if (hovering !== isHoveringTrash) setIsHoveringTrash(hovering);
      }
    }
  };

  const onStagePointerUp = async (e) => {
    if (dragRef.current.timer) {
      clearTimeout(dragRef.current.timer);
      dragRef.current.timer = null;
    }

    const hotspotId = dragRef.current.hotspotId;
    const wasDragging = dragRef.current.dragging;
    const clientX = e.clientX ?? (e.changedTouches?.[0]?.clientX);
    const clientY = e.clientY ?? (e.changedTouches?.[0]?.clientY);

    let droppedInTrash = false;
    if (wasDragging && trashRef.current && clientX != null && clientY != null) {
      const tRect = trashRef.current.getBoundingClientRect();
      droppedInTrash =
        clientX >= tRect.left &&
        clientX <= tRect.right &&
        clientY >= tRect.top &&
        clientY <= tRect.bottom;
    }

    dragRef.current.hotspotId = null;
    dragRef.current.dragging = false;
    setDraggingPinId(null);
    setIsHoveringTrash(false);
    const pinDataToSave = optimisticPin;
    setOptimisticPin(null);

    if (!hotspotId) return;

    if (!wasDragging) {
      const hotspot = currentHotspots.find(h => h.id === hotspotId);
      if (hotspot && !isAddPinMode) {
        openPinEditor(currentMedia.sessionId, currentMedia.id, hotspot);
      }
      return;
    }

    if (droppedInTrash && activeProject && currentMedia) {
      try {
        await deleteHotspotFromMedia(activeProject.id, currentMedia.sessionId, currentMedia.id, hotspotId);
      } catch (err) {
        console.error("Failed to incinerate pin:", err);
      }
      return;
    }

    if (pinDataToSave && activeProject && currentMedia) {
      try {
        await updateHotspotInMedia(
          activeProject.id,
          currentMedia.sessionId,
          currentMedia.id,
          hotspotId,
          { x: pinDataToSave.x, y: pinDataToSave.y }
        );
      } catch (err) {
        console.error("Failed to move pin:", err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 flex justify-center items-center font-sans antialiased selection:bg-black selection:text-white">
      {view === "dashboard" && <Navigation currentTab={tab} setTab={setTab} />}

      <div className={`w-full transition-all duration-300 flex justify-center ${view === "dashboard" ? "md:pl-64" : ""}`}>
        <div className={`w-full ${view === "dashboard" ? "max-w-md" : "max-w-6xl"} min-h-screen bg-white shadow-2xl relative border-x border-gray-200`}>
          
          {view === "project" && (
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
              {/* THIS IS THE ONLY VAULT HEADER NOW */}
              <div className="flex justify-between items-center mb-6 pt-8">
                <h1 className="text-2xl font-black tracking-tight uppercase">Vault</h1>
                <button onClick={() => setNewOpen(true)} className="w-10 h-10 rounded bg-black text-white flex items-center justify-center shadow-md active:scale-95 transition-transform">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              
              {/* Grid with the quick add prop passed down */}
              <LibraryGrid onQuickAdd={handleQuickAdd} />
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {(session.media || []).map((m) => (
                      <MediaCard 
                        key={m.id} 
                        item={m} 
                        onClick={() => navigateToMedia(m, session.id)} 
                        // HERE IS THE NEW IN-SESSION DELETE PROP
                        onDelete={() => deleteMediaFromProject(activeProject.id, session.id, m.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === "media" && activeProject && currentMedia && (
            <div className="fixed inset-0 z-[100] bg-black flex flex-col overflow-hidden touch-none animate-in fade-in zoom-in-95 duration-200">
              
              <div className="absolute top-0 inset-x-0 p-6 z-50 flex justify-between items-center pointer-events-none">
                <button onClick={goBack} className="pointer-events-auto w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white border border-white/10 hover:bg-black/80 transition-colors">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button onClick={handleDeleteCurrentMedia} className="pointer-events-auto w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-red-400 border border-white/10 hover:bg-black/80 hover:text-red-500 transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div
                ref={stageRef}
                className={`w-full h-full relative flex items-center justify-center transition-all ${isAddPinMode ? "cursor-crosshair" : ""}`}
                onClick={handleStageClickToAddPin}
                onPointerMove={onStagePointerMove}
                onPointerUp={onStagePointerUp}
                onPointerLeave={onStagePointerUp} 
              >
                <img
                  src={currentMedia.url}
                  className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${isAddPinMode ? 'opacity-70' : 'opacity-100'}`}
                  alt=""
                  draggable={false}
                />

                {currentHotspots.map((h, idx) => {
                  const displayX = optimisticPin?.id === h.id ? optimisticPin.x : h.x;
                  const displayY = optimisticPin?.id === h.id ? optimisticPin.y : h.y;
                  
                  const left = `${clamp01(displayX) * 100}%`;
                  const top = `${clamp01(displayY) * 100}%`;
                  const number = idx + 1;

                  return (
                    <button
                      key={h.id}
                      type="button"
                      onPointerDown={(e) => {
                        if (!isAddPinMode) onPinPointerDown(e, h);
                      }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-100 select-none touch-none ${
                        isAddPinMode 
                          ? 'pointer-events-none opacity-20 scale-75' 
                          : 'pointer-events-auto cursor-pointer z-10'
                      } ${
                        draggingPinId === h.id 
                          ? 'scale-125 z-50' 
                          : 'hover:scale-110'
                      }`}
                      style={{ 
                        left, 
                        top,
                        WebkitTouchCallout: 'none',
                        WebkitUserSelect: 'none',
                        userSelect: 'none'
                      }}
                      aria-label="Pin"
                    >
                      <div 
                        className={`w-9 h-9 rounded-full font-black text-xs flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.5)] border-2 transition-colors select-none ${
                          draggingPinId === h.id 
                            ? 'bg-black text-white border-white' 
                            : 'bg-white text-black border-transparent'
                        }`}
                        style={{ pointerEvents: 'none' }} 
                      >
                        {number}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 z-50 pointer-events-none">
                
                <div 
                  ref={trashRef}
                  className={`absolute left-1/2 -translate-x-1/2 transition-all duration-300 pointer-events-auto ${
                    draggingPinId ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-10 opacity-0 scale-50'
                  }`}
                >
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-200 ${
                    isHoveringTrash ? 'bg-red-600 text-white scale-125 border-4 border-red-400' : 'bg-black/80 backdrop-blur-md text-red-500 border border-white/20'
                  }`}>
                    <Trash2 className="w-6 h-6" />
                  </div>
                </div>

                <button
                  onClick={() => setIsAddPinMode(!isAddPinMode)}
                  className={`pointer-events-auto px-6 py-4 rounded-full font-black text-xs uppercase tracking-widest shadow-2xl transition-all flex items-center gap-2 ${
                    draggingPinId ? 'opacity-0 scale-50 pointer-events-none' : 'opacity-100 scale-100'
                  } ${
                    isAddPinMode 
                      ? 'bg-white text-black animate-pulse' 
                      : 'bg-black/80 backdrop-blur-md text-white border border-white/20 hover:bg-black'
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
                <div className="absolute top-24 left-1/2 -translate-x-1/2 text-center pointer-events-none z-50 animate-in fade-in slide-in-from-top-2">
                  <span className="inline-block bg-white/90 backdrop-blur-md text-black text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-2xl">
                    Tap anywhere to drop a pin
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <NewProjectModal open={newOpen} onClose={() => setNewOpen(false)} onCreate={handleCreateProject} />
        <AddMediaModal isOpen={mediaOpen} onClose={() => setMediaOpen(false)} project={activeProject} onAddMedia={handleAddMedia} mode="upload" existingSessions={activeProject?.sessions || []} />

        {pinOpen && (
          <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setPinOpen(false)} />
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