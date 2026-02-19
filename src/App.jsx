// /src/App.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { VaultProvider, useVault } from "./context/VaultContext";

import Navigation from "./components/Navigation";
import NewProjectModal from "./components/NewProjectModal";
import AddMediaModal from "./components/AddMediaModal";
import Login from "./components/Login";

import LibraryGrid from "./features/library/LibraryGrid";
import MediaViewer from "./features/media/MediaViewer";
import ProjectView from "./features/project/ProjectView";
import Settings from "./features/settings/settings";
import useProjectMediaNavigator from "./features/media/hooks/useProjectMediaNavigator";

function AuthGate({ children }) {
  const { user, authReady } = useVault();

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#FFFEFA" }}>
        <Loader2 className="w-8 h-8 animate-spin text-black" />
      </div>
    );
  }
  if (!user) return <Login />;
  return children;
}

function AbstractCreamBackdrop({ children }) {
  return (
    <div className="min-h-screen relative" style={{ background: "#FFFEFA" }}>
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -top-28 -left-28 w-[520px] h-[520px] rounded-[48px] rotate-[18deg]"
          style={{ background: "#FFEA3A", opacity: 0.12 }}
        />
        <div
          className="absolute top-10 -right-64 w-[820px] h-[300px] rounded-[60px] rotate-[-12deg]"
          style={{ background: "#3AA8FF", opacity: 0.08 }}
        />
        <div
          className="absolute -bottom-44 left-16 w-[760px] h-[460px] rounded-[70px] rotate-[10deg]"
          style={{ background: "#54E6C1", opacity: 0.07 }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.25) 40%, rgba(255,255,255,0.55) 100%)",
            opacity: 0.55,
          }}
        />
      </div>

      {children}
    </div>
  );
}

function VaultShell() {
  const bodyFont =
    '"SF Pro Text","SF Pro Display",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';
  const headerFont =
    '"Avenir Next Rounded","Avenir Next","Avenir","SF Pro Rounded","SF Pro Display","SF Pro Text",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';

  const palette = useMemo(
    () => ({
      ink: "#0B0B0C",
      paper: "#FFFEFA",
      line: "rgba(0,0,0,0.08)",
      sky: "#3AA8FF",
      sun: "#FFEA3A",
      breeze: "#54E6C1",
      accent: "rgba(255,77,46,0.95)",
      pinEdge: "rgba(0,0,0,0.14)",
    }),
    []
  );

  const {
    view,
    setView,
    tab,
    setTab,
    search,
    setSearch,

    activeProject,
    setActiveProject,

    // projects
    addProject,
    renameProject,
    archiveProject,
    createInvite,
uploadProjectOverviewAudio,
updateProjectOverviewTranscript,
clearProjectOverviewAudio,


    // sessions
    renameSession,
    deleteSession,

    // media
    addMediaFilesToProject,
    addMediaToProject,
    deleteMediaFromProject,

    // pins
    addHotspotToMedia,
    updateHotspotInMedia,
    deleteHotspotFromMedia,
  } = useVault();

  const mediaNav = useProjectMediaNavigator(activeProject, deleteMediaFromProject);

  const [newOpen, setNewOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [autoPromptMediaPicker, setAutoPromptMediaPicker] = useState(false);

  const [prefillSessionId, setPrefillSessionId] = useState(null);
  const [prefillSessionTitle, setPrefillSessionTitle] = useState("");

  const searchInputRef = useRef(null);
  useEffect(() => {
    if (view === "dashboard" && tab === "search") {
      const t = setTimeout(() => searchInputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [view, tab]);

  const dashboardTitle = useMemo(() => {
    if (tab === "graveyard") return "[ Archive ]";
    if (tab === "vault") return "[ Settings ]";
    return "[ Projects ]";
  }, [tab]);

const handleCreateProject = async ({ title, tags, note, overviewAudioFile, overviewTranscript }) => {
  try {
    const p = await addProject({ title, aiTags: tags, note });

    // If they recorded an overview, attach it to the project doc (NOT session media).
    if (overviewAudioFile) {
      await uploadProjectOverviewAudio?.(p.id, overviewAudioFile, overviewTranscript || "");
    }

    setNewOpen(false);

    setActiveProject(p);
    setView("project");

    setPrefillSessionId(null);
    setPrefillSessionTitle("First Fitting");
    setAutoPromptMediaPicker(true);
    setMediaOpen(true);
  } catch (e) {
    console.error(e);
    alert(e?.message || "Failed to create project.");
  }
};


  const handleAddMedia = async ({ files, sessionId, sessionTitle }) => {
    if (!activeProject) return;
    try {
      if (addMediaFilesToProject) {
        await addMediaFilesToProject(activeProject.id, files, sessionId, sessionTitle);
      } else {
        for (const f of (files || []).slice(0, 5)) {
          // eslint-disable-next-line no-await-in-loop
          await addMediaToProject(activeProject.id, f, sessionId, sessionTitle);
        }
      }
      setMediaOpen(false);
      setAutoPromptMediaPicker(false);
      setPrefillSessionId(null);
      setPrefillSessionTitle("");
    } catch (e) {
      console.error("Media upload failed", e);
      alert(e?.message || "Upload failed. Check console.");
    }
  };

  const openAddPhotosForSession = (session) => {
    setPrefillSessionId(session?.id || null);
    setPrefillSessionTitle(session?.title || "");
    setAutoPromptMediaPicker(false);
    setMediaOpen(true);
  };

  const openAddSession = () => {
    const title = prompt("New session name", "New Session");
    if (title == null) return;
    setPrefillSessionId(null);
    setPrefillSessionTitle(title.trim() || "New Session");
    setAutoPromptMediaPicker(false);
    setMediaOpen(true);
  };

  const goBackFromProject = () => {
    mediaNav.resetViewer();
    setView("dashboard");
    setActiveProject(null);
  };

  const shareProject = async () => {
    if (!activeProject?.id) return;
    try {
      const inviteId = await createInvite?.(activeProject.id, "editor");
      if (inviteId) {
        await navigator.clipboard.writeText(inviteId);
        alert("Copied invite code to clipboard.");
        return;
      }
    } catch {}

    try {
      await navigator.clipboard.writeText(activeProject.id);
      alert("Copied projectId to clipboard.");
    } catch {
      prompt("Copy projectId:", activeProject.id);
    }
  };

  const editProject = async () => {
    if (!activeProject?.id) return;
    const next = prompt("Rename project", activeProject.title || "");
    if (next == null) return;
    const title = next.trim();
    if (!title) return;
    try {
      await renameProject?.(activeProject.id, title);
    } catch (e) {
      alert(e?.message || "Rename failed.");
    }
  };

  const removeProject = async () => {
    if (!activeProject?.id) return;
    if (!confirm("Move this project to the Graveyard?")) return;

    try {
      await archiveProject?.(activeProject.id);
      mediaNav.resetViewer();
      setActiveProject(null);
      setView("dashboard");
      setTab("graveyard");
    } catch (e) {
      alert(e?.message || "Archive failed.");
    }
  };

  const shareSession = async (session) => {
    if (!activeProject?.id || !session?.id) return;
    const token = `${activeProject.id}::${session.id}`;
    try {
      await navigator.clipboard.writeText(token);
      alert("Copied session token to clipboard.");
    } catch {
      prompt("Copy session token:", token);
    }
  };

  const editSession = async (session) => {
    if (!activeProject?.id || !session?.id) return;
    const next = prompt("Rename session", session.title || "");
    if (next == null) return;
    const title = next.trim();
    if (!title) return;
    try {
      await renameSession?.(activeProject.id, session.id, title);
    } catch (e) {
      alert(e?.message || "Rename failed.");
    }
  };

  const removeSession = async (session) => {
    if (!activeProject?.id || !session?.id) return;
    if (!confirm(`Delete "${session.title}" and all its photos?`)) return;
    try {
      await deleteSession?.(activeProject.id, session.id);
    } catch (e) {
      alert(e?.message || "Delete failed.");
    }
  };

  const handleDeleteInViewer = async () => {
    if (!activeProject?.id || !mediaNav.selectedMedia?.id || !mediaNav.selectedMedia?.sessionId) return;
    if (!confirm("Permanently delete this photo?")) return;
    await mediaNav.deleteSelectedMedia();
  };

  return (
    <AbstractCreamBackdrop>
      <div className="min-h-screen text-gray-900 flex justify-center items-center antialiased" style={{ fontFamily: bodyFont }}>
        {view === "dashboard" && <Navigation currentTab={tab} setTab={setTab} />}

        <div className={`w-full transition-all duration-300 ease-out flex justify-center ${view === "dashboard" ? "md:pl-64" : ""}`}>
          <div
            className="w-full max-w-md min-h-screen relative border-x"
            style={{
              background: "rgba(255,254,250,0.96)",
              borderColor: "rgba(0,0,0,0.08)",
              boxShadow: "0 18px 48px -44px rgba(0,0,0,0.28)",
            }}
          >
            {/* DASHBOARD */}
            {view === "dashboard" && (
              <div className="transition-all duration-300 ease-out">
                {tab === "search" ? (
                  <div className="px-6 pt-2">
                    <div
                      className="mt-3 px-4 py-3"
                      style={{
                        borderRadius: 0,
                        background: "rgba(255,255,255,0.82)",
                        border: `1px solid ${palette.line}`,
                      }}
                    >
                      <input
                        ref={searchInputRef}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search projects or tags…"
                        className="w-full bg-transparent outline-none text-sm"
                        style={{ color: "rgba(0,0,0,0.78)" }}
                      />
                      <div className="text-[10px] mt-1" style={{ color: "rgba(0,0,0,0.40)" }}>
                        Try a project name or a #tag
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* ✅ Settings tab renders Settings page */}
                {tab === "vault" ? (
                  <Settings headerFont={headerFont} palette={palette} />
                ) : (
                  <LibraryGrid
                    title={dashboardTitle}
                    onQuickAdd={(project) => {
                      setActiveProject(project);
                      setView("project");
                      setPrefillSessionId(null);
                      setPrefillSessionTitle("New Session");
                      setAutoPromptMediaPicker(false);
                      setMediaOpen(true);
                    }}
                    onNew={() => setNewOpen(true)}
                  />
                )}
              </div>
            )}

            {/* PROJECT PAGE */}
            {view === "project" && activeProject && (
              <ProjectView
  project={activeProject}
  headerFont={headerFont}
  palette={palette}
  onBack={goBackFromProject}
  onNewProject={() => setNewOpen(true)}
  onEditProject={editProject}
  onShareProject={shareProject}
  onArchiveProject={removeProject}
  onOpenViewer={mediaNav.openViewer}
  onAddPhotosForSession={openAddPhotosForSession}
  onAddSession={openAddSession}
  onEditSession={editSession}
  onShareSession={shareSession}
  onDeleteSession={removeSession}
  onUploadOverviewAudio={uploadProjectOverviewAudio}
  onUpdateOverviewTranscript={updateProjectOverviewTranscript}
  onClearOverviewAudio={clearProjectOverviewAudio}
/>

            )}

            {/* Viewer overlay */}
            {mediaNav.viewerOpen && activeProject && mediaNav.selectedMedia && (
              <MediaViewer
                mode="modal"
                project={activeProject}
                media={mediaNav.selectedMedia}
                headerFont={headerFont}
                palette={palette}
                mediaIndex={Math.max(0, mediaNav.selectedIndex)}
                mediaCount={mediaNav.flatMedia.length}
                moreFromSession={mediaNav.moreFromSession}
                onSelectMedia={(m) => mediaNav.openViewer(m.sessionId, m.id)}
                onPrev={mediaNav.prevMedia}
                onNext={mediaNav.nextMedia}
                onSwipeDown={mediaNav.closeViewer}
                onBack={mediaNav.closeViewer}
                onDeleteMedia={handleDeleteInViewer}
                onAddHotspot={addHotspotToMedia}
                onUpdateHotspot={updateHotspotInMedia}
                onDeleteHotspot={deleteHotspotFromMedia}
              />
            )}

            {/* Modals */}
            <NewProjectModal open={newOpen} onClose={() => setNewOpen(false)} onCreate={handleCreateProject} />

            <AddMediaModal
              isOpen={mediaOpen}
              onClose={() => {
                setMediaOpen(false);
                setAutoPromptMediaPicker(false);
                setPrefillSessionId(null);
                setPrefillSessionTitle("");
              }}
              project={activeProject}
              onAddMedia={(payload) =>
                handleAddMedia({
                  ...payload,
                  sessionId: payload.sessionId ?? prefillSessionId,
                  sessionTitle: payload.sessionTitle ?? prefillSessionTitle,
                })
              }
              mode="upload"
              existingSessions={activeProject?.sessions || []}
              autoPrompt={autoPromptMediaPicker}
              autoSubmit={autoPromptMediaPicker}
              defaultSessionId={prefillSessionId}
              defaultSessionTitle={prefillSessionTitle}
            />
          </div>
        </div>
      </div>
    </AbstractCreamBackdrop>
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
