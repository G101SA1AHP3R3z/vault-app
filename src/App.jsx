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

function formatDuration(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function VoiceNoteRecorderModal({ open, palette, headerFont, title, onClose, onSave }) {
  const [state, setState] = useState("idle"); // idle | recording | ready
  const [err, setErr] = useState("");
  const [sec, setSec] = useState(0);
  const [blob, setBlob] = useState(null);

  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const tickRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setState("idle");
      setErr("");
      setSec(0);
      setBlob(null);
      chunksRef.current = [];
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      try {
        recorderRef.current?.stream?.getTracks?.().forEach((t) => t.stop());
      } catch {}
      recorderRef.current = null;
    }
  }, [open]);

  const start = async () => {
    setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });

      recorderRef.current = rec;
      chunksRef.current = [];

      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      rec.onstop = () => {
        const b = new Blob(chunksRef.current, { type: "audio/webm" });
        setBlob(b);
        setState("ready");
        try {
          rec.stream.getTracks().forEach((t) => t.stop());
        } catch {}
      };

      rec.start();
      setState("recording");
      setSec(0);
      tickRef.current = setInterval(() => setSec((v) => v + 1), 1000);
    } catch (e) {
      console.error(e);
      setErr(
        e?.name === "NotAllowedError"
          ? "Microphone permission was blocked. Allow mic access in your browser/site settings."
          : e?.message || "Could not start recording."
      );
    }
  };

  const stop = () => {
    try {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      recorderRef.current?.stop?.();
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Could not stop recording.");
    }
  };

  const save = async () => {
    if (!blob) return;
    try {
      const file = new File([blob], `voice_${Date.now()}.webm`, { type: "audio/webm" });
      await onSave?.({ file, durationSec: sec });
      onClose?.();
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Could not save voice note.");
    }
  };

  if (!open) return null;

  const line = palette?.line || "rgba(0,0,0,0.10)";
  const accent = palette?.accent || "rgba(255,77,46,0.95)";

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.35)" }} onClick={onClose} />
      <div
        className="relative w-full max-w-md mx-auto"
        style={{
          background: "rgba(255,254,250,0.98)",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          border: `1px solid ${line}`,
          boxShadow: "0 -20px 60px -40px rgba(0,0,0,0.55)",
        }}
      >
        <div className="px-6 pt-5 pb-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold tracking-[0.18em]" style={{ color: "rgba(0,0,0,0.42)" }}>
                VOICE NOTE
              </div>
              <div
                className="mt-2 text-[16px] font-semibold"
                style={{ fontFamily: headerFont, color: "rgba(0,0,0,0.86)" }}
              >
                {title || "Session"}
              </div>
            </div>
            <button
              onClick={onClose}
              className="px-3 h-9 rounded-[8px] text-[12px] font-semibold tracking-[0.12em]"
              style={{
                background: "rgba(255,255,255,0.75)",
                border: `1px solid ${line}`,
                color: "rgba(0,0,0,0.70)",
              }}
            >
              CLOSE
            </button>
          </div>

          <div
            className="mt-4 px-4 py-4"
            style={{
              borderRadius: 8,
              background: "rgba(0,0,0,0.03)",
              border: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="text-[12px]" style={{ color: "rgba(0,0,0,0.55)" }}>
                {state === "recording" ? "Recording…" : state === "ready" ? "Preview" : "Tap record"}
              </div>
              <div className="text-[12px] font-semibold" style={{ color: "rgba(0,0,0,0.80)" }}>
                {formatDuration(sec)}
              </div>
            </div>

            {err ? (
              <div className="mt-3 text-[12px]" style={{ color: "rgba(220,38,38,0.95)" }}>
                {err}
              </div>
            ) : null}

            {state === "ready" && blob ? <audio className="mt-4 w-full" controls src={URL.createObjectURL(blob)} /> : null}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            {state === "recording" ? (
              <button
                onClick={stop}
                className="flex-1 h-11 rounded-[8px] text-[12px] font-semibold tracking-[0.12em]"
                style={{ background: accent, border: "1px solid rgba(0,0,0,0.12)", color: "rgba(0,0,0,0.85)" }}
              >
                STOP
              </button>
            ) : (
              <button
                onClick={start}
                className="flex-1 h-11 rounded-[8px] text-[12px] font-semibold tracking-[0.12em]"
                style={{ background: accent, border: "1px solid rgba(0,0,0,0.12)", color: "rgba(0,0,0,0.85)" }}
              >
                RECORD
              </button>
            )}

            <button
              onClick={save}
              disabled={state !== "ready" || !blob}
              className="flex-1 h-11 rounded-[8px] text-[12px] font-semibold tracking-[0.12em]"
              style={{
                background: state !== "ready" ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.78)",
                border: `1px solid ${line}`,
                color: state !== "ready" ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.78)",
                cursor: state !== "ready" ? "not-allowed" : "pointer",
              }}
            >
              SAVE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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

    // ✅ option 2
    mediaNotesById,
    upsertMediaNote,

    // projects
    addProject,
    renameProject,
    updateProjectBrief,
    archiveProject,
    createInvite,

    // sessions
    addSession,
    renameSession,
    updateSessionNotes,
    deleteSession,

    // media
    addMediaFilesToProject,
    addMediaToProject,
    deleteMediaFromProject,

    // pins
    addHotspotToMedia,
    updateHotspotInMedia,
    deleteHotspotFromMedia,

    // voice
    uploadSessionVoiceNote,
    updateSessionVoiceTranscript,
    clearSessionVoiceNote,
  } = useVault();

  const mediaNav = useProjectMediaNavigator(activeProject, deleteMediaFromProject);

  const [newOpen, setNewOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [autoPromptMediaPicker, setAutoPromptMediaPicker] = useState(false);

  const [prefillSessionId, setPrefillSessionId] = useState(null);
  const [prefillSessionTitle, setPrefillSessionTitle] = useState("");

  // Voice note modal
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceSession, setVoiceSession] = useState(null);

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

  const handleCreateProject = async ({ title, tags, note }) => {
    try {
      const p = await addProject({ title, aiTags: tags, note });
      setNewOpen(false);

      setActiveProject(p);
      setView("project");

      setPrefillSessionId(null);
      setPrefillSessionTitle("First Session");
      setAutoPromptMediaPicker(true);
      setMediaOpen(true);
    } catch (e) {
      console.error(e);
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
    } catch (e) {
      console.error(e);
      alert(e?.message || "Upload failed.");
    }
  };

  const goBackFromProject = () => {
    setView("dashboard");
  };

  const openAddPhotosForSession = (session) => {
    setPrefillSessionId(session?.id || null);
    setPrefillSessionTitle(session?.title || "Session");
    setAutoPromptMediaPicker(false);
    setMediaOpen(true);
  };

  const openAddSession = async () => {
    if (!activeProject?.id) return;
    const s = await addSession(activeProject.id, "New Session");
    setPrefillSessionId(s?.id || null);
    setPrefillSessionTitle(s?.title || "New Session");
    setAutoPromptMediaPicker(false);
    setMediaOpen(true);
  };

  const editProject = async () => {
    const next = prompt("Project name:", activeProject?.title || "");
    if (!next) return;
    try {
      await renameProject(activeProject.id, next);
    } catch (e) {
      alert(e?.message || "Could not rename.");
    }
  };

  const shareProject = async () => {
    if (!activeProject?.id) return;
    try {
      const inviteId = await createInvite(activeProject.id, "editor");
      if (!inviteId) return;
      const url = `${window.location.origin}/invite/${inviteId}`;
      await navigator.clipboard.writeText(url);
      alert("Invite link copied!");
    } catch (e) {
      alert(e?.message || "Could not create invite.");
    }
  };

  const removeProject = async () => {
    if (!activeProject?.id) return;
    if (!confirm("Archive this project?")) return;
    try {
      await archiveProject(activeProject.id);
      setView("dashboard");
      setTab("graveyard");
    } catch (e) {
      alert(e?.message || "Could not archive.");
    }
  };

  const editSession = async (session) => {
    const next = prompt("Session title:", session?.title || "");
    if (!next) return;
    try {
      await renameSession(activeProject.id, session.id, next);
    } catch (e) {
      alert(e?.message || "Could not rename session.");
    }
  };

  const shareSession = async (session) => {
    try {
      const url = `${window.location.origin}/project/${activeProject.id}?session=${session.id}`;
      await navigator.clipboard.writeText(url);
      alert("Session link copied!");
    } catch (e) {
      alert(e?.message || "Could not copy link.");
    }
  };

  const removeSession = async (session) => {
    if (!confirm("Delete this session?")) return;
    try {
      await deleteSession(activeProject.id, session.id);
    } catch (e) {
      alert(e?.message || "Could not delete session.");
    }
  };

  // ---- Project Brief + Session Voice Notes wiring ----
  const handleUpdateProjectBrief = async (text) => {
    if (!activeProject?.id) return;
    await updateProjectBrief?.(activeProject.id, text);
  };

  const handleUpdateSessionNotes = async (session, text) => {
    if (!activeProject?.id || !session?.id) return;
    await updateSessionNotes?.(activeProject.id, session.id, text);
  };

  const openVoiceForSession = (session) => {
    setVoiceSession(session || null);
    setVoiceOpen(true);
  };

  const saveVoiceForSession = async ({ file, durationSec }) => {
    if (!activeProject?.id || !voiceSession?.id) return;
    await uploadSessionVoiceNote(activeProject.id, voiceSession.id, file, durationSec);
  };

  const playSessionVoice = async (session) => {
    if (!session?.voiceNoteUrl) return;
    try {
      const a = new Audio(session.voiceNoteUrl);
      a.play();
    } catch {
      window.open(session.voiceNoteUrl, "_blank");
    }
  };

  const editSessionTranscript = async (session) => {
    const initial = session?.voiceTranscriptEdited || session?.voiceTranscriptRaw || "";
    const next = prompt("Edit transcript:", initial);
    if (next == null) return;
    try {
      await updateSessionVoiceTranscript(activeProject.id, session.id, {
        raw: session?.voiceTranscriptRaw || "",
        edited: next,
        status: "ready",
      });
    } catch (e) {
      alert(e?.message || "Could not update transcript.");
    }
  };

  const removeSessionVoice = async (session) => {
    if (!confirm("Remove voice note?")) return;
    try {
      await clearSessionVoiceNote(activeProject.id, session.id);
    } catch (e) {
      alert(e?.message || "Could not remove voice note.");
    }
  };

  const handleDeleteInViewer = async () => {
    const m = mediaNav.selectedMedia;
    if (!m?.id || !m?.sessionId) return;
    if (!confirm("Delete this photo?")) return;
    try {
      await deleteMediaFromProject(activeProject.id, m.sessionId, m.id);
      mediaNav.closeViewer();
    } catch (e) {
      alert(e?.message || "Could not delete media.");
    }
  };

  const mediaWithNote = useMemo(() => {
    const m = mediaNav.selectedMedia;
    if (!m) return null;
    const note = mediaNotesById?.[m.id]?.text || "";
    return { ...m, generalNote: note };
  }, [mediaNav.selectedMedia, mediaNotesById]);

  return (
    <AbstractCreamBackdrop>
      <div style={{ fontFamily: bodyFont, color: palette.ink }}>
        <div className="max-w-6xl mx-auto">
          <div className="relative">
            <Navigation
              title={view === "project" ? "" : dashboardTitle}
              tab={tab}
              onTabChange={(t) => setTab(t)}
              onBack={view === "project" ? goBackFromProject : null}
            />

            {/* DASHBOARD */}
            {view === "dashboard" && (
              <div className="pt-24 pb-28">
                {/* Search bar */}
                {tab === "search" ? (
                  <div className="px-6">
                    <div
                      className="w-full px-4 py-3 rounded-[12px]"
                      style={{
                        background: "rgba(255,255,255,0.70)",
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
                onEditProject={editProject}
                onShareProject={shareProject}
                onArchiveProject={removeProject}
                onOpenViewer={mediaNav.openViewer}
                onAddPhotosForSession={openAddPhotosForSession}
                onAddSession={openAddSession}
                onEditSession={editSession}
                onShareSession={shareSession}
                onDeleteSession={removeSession}
                onUpdateProjectBrief={handleUpdateProjectBrief}
                onUpdateSessionNotes={handleUpdateSessionNotes}
                onAddSessionVoiceNote={openVoiceForSession}
                onPlaySessionVoiceNote={playSessionVoice}
                onEditSessionVoiceTranscript={editSessionTranscript}
                onClearSessionVoiceNote={removeSessionVoice}
              />
            )}

            {/* Viewer overlay */}
            {mediaNav.viewerOpen && activeProject && mediaWithNote && (
              <MediaViewer
                mode="modal"
                project={activeProject}
                media={mediaWithNote}
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
                onUpdateMediaNote={upsertMediaNote} // ✅ Option 2 hook
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

            <VoiceNoteRecorderModal
              open={voiceOpen}
              palette={palette}
              headerFont={headerFont}
              title={voiceSession?.title || "Session"}
              onClose={() => {
                setVoiceOpen(false);
                setVoiceSession(null);
              }}
              onSave={saveVoiceForSession}
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