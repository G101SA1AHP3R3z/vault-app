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
              <div className="mt-2 text-[16px] font-semibold" style={{ fontFamily: headerFont, color: "rgba(0,0,0,0.86)" }}>
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
        <div className="absolute -top-28 -left-28 w-[520px] h-[520px] rounded-[48px] rotate-[18deg]" style={{ background: "#FFEA3A", opacity: 0.12 }} />
        <div className="absolute top-10 -right-64 w-[820px] h-[300px] rounded-[60px] rotate-[-12deg]" style={{ background: "#3AA8FF", opacity: 0.08 }} />
        <div className="absolute -bottom-44 left-16 w-[760px] h-[460px] rounded-[70px] rotate-[10deg]" style={{ background: "#54E6C1", opacity: 0.07 }} />
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
    updateProjectBrief,
    archiveProject,
    createInvite,

    // sessions
    addSession,
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

    // session voice notes
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
      setPrefillSessionTitle("First Fitting");
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
    if (!activeProject?.id) return;
    const title = prompt("New session name", "New Session");
    if (title == null) return;
    const clean = title.trim() || "New Session";

    addSession?.(activeProject.id, clean)
      .then((session) => {
        // Immediately offer to add photos (common flow)
        if (session?.id) {
          setPrefillSessionId(session.id);
          setPrefillSessionTitle(session.title || clean);
          setAutoPromptMediaPicker(false);
          setMediaOpen(true);
        }
      })
      .catch((e) => alert(e?.message || "Could not create session."));
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

  // ---- Project Brief + Session Voice Notes wiring ----
  const handleUpdateProjectBrief = async (text) => {
    if (!activeProject?.id) return;
    await updateProjectBrief?.(activeProject.id, text);
  };

  const openVoiceForSession = (session) => {
    setVoiceSession(session || null);
    setVoiceOpen(true);
  };

  const saveVoiceForSession = async ({ file, durationSec }) => {
    if (!activeProject?.id || !voiceSession?.id) return;
    // IMPORTANT: Storage rules must allow audio/* contentType.
    await uploadSessionVoiceNote?.(activeProject.id, voiceSession.id, file, { durationSec });
  };

  const playSessionVoice = (session) => {
    const url = session?.voiceNoteUrl;
    if (!url) return;
    try {
      const a = new Audio(url);
      a.play();
    } catch (e) {
      console.error(e);
      window.open(url, "_blank");
    }
  };

  const editSessionTranscript = async (session) => {
    if (!activeProject?.id || !session?.id) return;
    const current = (session?.voiceTranscriptEdited || session?.voiceTranscriptRaw || "").toString();
    const next = prompt("Edit transcript", current);
    if (next == null) return;
    try {
      await updateSessionVoiceTranscript?.(activeProject.id, session.id, next);
    } catch (e) {
      alert(e?.message || "Transcript update failed.");
    }
  };

  const removeSessionVoice = async (session) => {
    if (!activeProject?.id || !session?.id) return;
    if (!confirm("Remove this voice note?")) return;
    try {
      await clearSessionVoiceNote?.(activeProject.id, session.id);
    } catch (e) {
      alert(e?.message || "Remove failed.");
    }
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
                onAddSessionVoiceNote={openVoiceForSession}
                onPlaySessionVoiceNote={playSessionVoice}
                onEditSessionVoiceTranscript={editSessionTranscript}
                onClearSessionVoiceNote={removeSessionVoice}
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