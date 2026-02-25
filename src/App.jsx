// /src/App.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MoreHorizontal, Share2, Trash2, ImagePlus } from "lucide-react";

import { VaultProvider, useVault } from "./context/VaultContext";

import Navigation from "./components/Navigation";
import NewProjectModal from "./components/NewProjectModal";
import Login from "./components/Login";

import LibraryGrid from "./features/library/LibraryGrid";
import MediaViewer from "./features/media/MediaViewer";
import ProjectView from "./features/project/ProjectView";
import Settings from "./features/settings/settings";
import useProjectMediaNavigator from "./features/media/hooks/useProjectMediaNavigator";

function formatDateMMDDYYYY(ts) {
  try {
    if (!ts) return "";
    if (typeof ts?.toDate === "function") {
      const d = ts.toDate();
      return d.toLocaleDateString(undefined, { month: "2-digit", day: "2-digit", year: "numeric" });
    }
    if (typeof ts?.seconds === "number") {
      const d = new Date(ts.seconds * 1000);
      return d.toLocaleDateString(undefined, { month: "2-digit", day: "2-digit", year: "numeric" });
    }
    const d = new Date(ts);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, { month: "2-digit", day: "2-digit", year: "numeric" });
    }
  } catch {}
  return "";
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

/**
 * Very light cream + barely-there backdrop shapes.
 * Grain should be handled globally via .index-grain (in your index.css).
 */
function AbstractCreamBackdrop({ children }) {
  return (
    <div className="min-h-screen relative index-grain" style={{ background: "#FFFEFA" }}>
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -top-28 -left-28 w-[520px] h-[520px] rounded-[48px] rotate-[18deg]"
          style={{ background: "#FFEA3A", opacity: 0.05 }}
        />
        <div
          className="absolute top-10 -right-64 w-[820px] h-[300px] rounded-[60px] rotate-[-12deg]"
          style={{ background: "#3AA8FF", opacity: 0.035 }}
        />
        <div
          className="absolute -bottom-44 left-16 w-[760px] h-[460px] rounded-[70px] rotate-[10deg]"
          style={{ background: "#54E6C1", opacity: 0.03 }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.30) 40%, rgba(255,255,255,0.65) 100%)",
            opacity: 0.45,
          }}
        />
      </div>
      {children}
    </div>
  );
}

function SessionDetailView({
  session,
  palette,
  headerFont,
  bodyFont,
  mediaNotesById,
  onOpenMedia,
  onDeleteSession,
  onShareSession,
  onUpdateSessionNotes,
  onAddPhotosNative, // (session, FileList|File[]) => Promise
}) {
  const fontSerif = headerFont;
  const fontSans = bodyFont;

  const line = palette?.line || "rgba(0,0,0,0.10)";
  const hair = "rgba(0,0,0,0.06)";

  const media = Array.isArray(session?.media) ? session.media : [];
  const thumbs = media.filter((m) => m?.url);
  const count = thumbs.length;

  const dateText = formatDateMMDDYYYY(session?.createdAt);

  // ------- kebab menu (no prompt) -------
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, []);

  const menuItems = [
    onShareSession ? { label: "Share", icon: Share2, onClick: () => onShareSession?.(session) } : null,
    onDeleteSession
      ? { label: "Delete session", icon: Trash2, danger: true, onClick: () => onDeleteSession?.(session) }
      : null,
  ].filter(Boolean);

  // ------- add photos (native picker) -------
  const fileRef = useRef(null);

  const openPicker = () => {
    if (fileRef.current) fileRef.current.value = "";
    fileRef.current?.click?.();
  };

  const onPicked = async (e) => {
    const files = e?.target?.files;
    if (!files || !files.length) return;
    try {
      await onAddPhotosNative?.(session, files);
    } catch (err) {
      console.error(err);
      alert(err?.message || "Could not add photos.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // ------- session notes: collapsed 3 lines + expand -------
  const [draft, setDraft] = useState((session?.notesText || "").toString());
  const lastSavedRef = useRef((session?.notesText || "").toString());
  const timerRef = useRef(null);
  const [expanded, setExpanded] = useState(false);

  const taRef = useRef(null);
  const autoGrow = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    const next = (session?.notesText || "").toString();
    setDraft(next);
    lastSavedRef.current = next;
    setExpanded(false);
  }, [session?.id, session?.notesText]);

  useEffect(() => {
    return () => timerRef.current && clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    if (expanded) {
      const t = setTimeout(autoGrow, 0);
      return () => clearTimeout(t);
    }
  }, [expanded]);

  const scheduleSave = (next) => {
    setDraft(next);
    if (!onUpdateSessionNotes) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        if (next !== lastSavedRef.current) {
          await onUpdateSessionNotes(next);
          lastSavedRef.current = next;
        }
      } catch (e) {
        console.error(e);
      }
    }, 550);
  };

  const flushSave = async () => {
    try {
      if (onUpdateSessionNotes && draft !== lastSavedRef.current) {
        await onUpdateSessionNotes(draft);
        lastSavedRef.current = draft;
      }
    } catch (e) {
      console.error(e);
    }
  };

  const hasNotes = (draft || "").trim().length > 0;

  const calcNoteCountForMedia = (m) => {
    const general = (mediaNotesById?.[m?.id]?.text || "").trim() ? 1 : 0;
    const hotspots = Array.isArray(m?.hotspots) ? m.hotspots.length : 0;
    return general + hotspots;
  };

  return (
    <div className="pt-2 pb-28">
      {/* hidden picker */}
      <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={onPicked} />

      {/* Title row: title + kebab aligned */}
      <div className="px-6 mt-2 flex items-start justify-between gap-3">
        <div
          style={{
            fontFamily: fontSerif,
            fontSize: 32,
            lineHeight: 1.08,
            letterSpacing: "-0.01em",
            color: "rgba(0,0,0,0.88)",
            fontWeight: 600,
          }}
        >
          {session?.title?.trim() || "Untitled"}
        </div>

        {menuItems.length ? (
          <div ref={menuRef} className="relative shrink-0">
            <button
              type="button"
              className="w-10 h-10 rounded-[12px] inline-flex items-center justify-center active:scale-[0.98] transition-transform"
              style={{
                background: "rgba(255,255,255,0.78)",
                border: `1px solid ${line}`,
                color: "rgba(0,0,0,0.75)",
                WebkitTapHighlightColor: "transparent",
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
              aria-label="More"
              title="More"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 mt-2 w-56 overflow-hidden z-50"
                style={{
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.94)",
                  border: `1px solid ${hair}`,
                  boxShadow: "0 18px 45px -38px rgba(0,0,0,0.45)",
                  backdropFilter: "blur(18px)",
                }}
              >
                {menuItems.map((it, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMenuOpen(false);
                      it?.onClick?.();
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 text-[13px] font-semibold text-left"
                    style={{
                      color: it?.danger ? "rgba(255,77,46,0.95)" : "rgba(0,0,0,0.82)",
                      background: "transparent",
                      fontFamily: fontSans,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {it?.icon ? <it.icon className="w-4 h-4" /> : null}
                    {it?.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Meta row + Add Photos */}
      <div className="px-6 mt-2 flex items-center justify-between gap-3">
        <div className="text-[12px]" style={{ color: "rgba(0,0,0,0.45)", fontFamily: fontSans }}>
          {dateText ? `${dateText} · ` : ""}
          {count} {count === 1 ? "photo" : "photos"}
        </div>

        <button
          type="button"
          onClick={openPicker}
          className="h-9 px-3 rounded-[999px] inline-flex items-center gap-2 active:scale-[0.99] transition-transform"
          style={{
            background: "rgba(255,255,255,0.78)",
            border: `1px solid ${line}`,
            color: "rgba(0,0,0,0.70)",
            fontFamily: fontSans,
            WebkitTapHighlightColor: "transparent",
          }}
          aria-label="Add photos"
          title="Add photos"
        >
          <ImagePlus className="w-4 h-4" />
          <span className="text-[12px] font-semibold uppercase" style={{ letterSpacing: "0.16em" }}>
            Add photos
          </span>
        </button>
      </div>

      {/* thumbnails */}
      <div className="px-6 mt-6">
        <div className="grid grid-cols-2 gap-3">
          {thumbs.map((m) => {
            const notesCount = calcNoteCountForMedia(m);
            return (
              <button
                key={m.id}
                onClick={() => onOpenMedia?.(session.id, m.id)}
                className="text-left"
                style={{ WebkitTapHighlightColor: "transparent" }}
                type="button"
              >
                <div
                  className="overflow-hidden"
                  style={{
                    borderRadius: 14,
                    border: "1px solid rgba(0,0,0,0.08)",
                    background: "rgba(0,0,0,0.06)",
                    aspectRatio: "1 / 1",
                  }}
                >
                  <img
                    src={m.url}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                  />
                </div>
                <div className="mt-2 text-[11px]" style={{ color: "rgba(0,0,0,0.40)", fontFamily: fontSans }}>
                  {notesCount} {notesCount === 1 ? "note" : "notes"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Session notes */}
      <div className="px-6 mt-8">
        <div
          className="text-[11px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: "rgba(0,0,0,0.45)", fontFamily: fontSans }}
        >
          SESSION NOTES
        </div>

        {!expanded ? (
          <div className="mt-3">
            <div
              className="text-[13px]"
              style={{
                color: hasNotes ? "rgba(0,0,0,0.78)" : "rgba(0,0,0,0.35)",
                fontFamily: fontSans,
                lineHeight: 1.6,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                whiteSpace: "pre-wrap",
              }}
            >
              {hasNotes ? draft : "Optional — add session notes."}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="h-9 px-3 rounded-[999px] inline-flex items-center active:scale-[0.99] transition-transform"
                style={{
                  background: "rgba(255,255,255,0.78)",
                  border: `1px solid ${line}`,
                  color: "rgba(0,0,0,0.70)",
                  fontFamily: fontSans,
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <span className="text-[12px] font-semibold uppercase" style={{ letterSpacing: "0.16em" }}>
                  {hasNotes ? "Show more" : "Add notes"}
                </span>
              </button>

              {hasNotes ? (
                <div className="text-[11px]" style={{ color: "rgba(0,0,0,0.38)", fontFamily: fontSans }}>
                  Auto-saved
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <textarea
              ref={taRef}
              value={draft}
              onChange={(e) => {
                scheduleSave(e.target.value);
                requestAnimationFrame(autoGrow);
              }}
              onBlur={flushSave}
              placeholder="Optional — add session notes here."
              className="w-full bg-transparent outline-none resize-none"
              style={{
                fontFamily: fontSans,
                fontSize: 13,
                lineHeight: 1.6,
                fontWeight: 400,
                letterSpacing: "0em",
                color: hasNotes ? "rgba(0,0,0,0.78)" : "rgba(0,0,0,0.35)",
                padding: 0,
                border: "none",
                borderRadius: 0,
                minHeight: 120,
              }}
            />

            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  await flushSave();
                  setExpanded(false);
                }}
                className="h-9 px-3 rounded-[999px] inline-flex items-center active:scale-[0.99] transition-transform"
                style={{
                  background: "rgba(255,255,255,0.78)",
                  border: `1px solid ${line}`,
                  color: "rgba(0,0,0,0.70)",
                  fontFamily: fontSans,
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <span className="text-[12px] font-semibold uppercase" style={{ letterSpacing: "0.16em" }}>
                  Show less
                </span>
              </button>

              <div className="text-[11px]" style={{ color: "rgba(0,0,0,0.38)", fontFamily: fontSans }}>
                Auto-saved
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function VaultShell() {
  // Fonts (kept here for now; we’ll finish moving these into global CSS tokens next)
  const bodyFont =
    '"Raleway", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  const headerFont = '"Literata", serif';

  const palette = useMemo(
    () => ({
      ink: "#0B0B0C",
      paper: "#FFFEFA",
      line: "rgba(0,0,0,0.08)",
      sky: "#3AA8FF",
      sun: "#FFEA3A",
      breeze: "#54E6C1",
      accent: "rgba(255,77,46,0.95)", // (we’ll make this “nearly invisible” + reserve for destructive actions next pass)
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

    mediaNotesById,
    upsertMediaNote,

    addProject,
    renameProject,
    updateProjectBrief,
    archiveProject,
    createInvite,

    addSession,
    renameSession,
    deleteSession,

    addMediaFilesToProject,
    addMediaToProject,
    deleteMediaFromProject,

    addHotspotToMedia,
    updateHotspotInMedia,
    deleteHotspotFromMedia,
  } = useVault();

  const mediaNav = useProjectMediaNavigator(activeProject, deleteMediaFromProject);

  const [newOpen, setNewOpen] = useState(false);
  const [focusSessionId, setFocusSessionId] = useState(null);

  // session detail routing
  const [activeSessionId, setActiveSessionId] = useState(null);

  const searchInputRef = useRef(null);
  useEffect(() => {
    if (view === "dashboard" && tab === "search") {
      const t = setTimeout(() => searchInputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [view, tab]);

  const dashboardTitle = useMemo(() => {
    if (tab === "graveyard") return "Archive";
    if (tab === "vault") return "Settings";
    if (tab === "search") return "Search";
    return "Projects";
  }, [tab]);

  const setTabAndEnsureDashboard = (t) => {
    setTab(t);
    setView("dashboard");
  };

  const goBackFromProject = () => {
    setView("dashboard");
    setActiveSessionId(null);
  };

  const openSessionDetail = (session) => {
    if (!session?.id) return;
    setActiveSessionId(session.id);
    setView("session");
  };

  const closeSessionDetail = () => {
    setView("project");
    setActiveSessionId(null);
  };

  const activeSession = useMemo(() => {
    if (!activeProject?.sessions || !activeSessionId) return null;
    return (activeProject.sessions || []).find((s) => s?.id === activeSessionId) || null;
  }, [activeProject?.sessions, activeSessionId]);

  // --------- Create Project ----------
  const handleCreateProject = async ({ title, note }) => {
    try {
      const p = await addProject({ title: (title || "Untitled").trim(), note: (note || "").trim() });
      setNewOpen(false);
      setActiveProject(p);
      setView("project");

      // create first session and focus it
      const s = await addSession(p.id, "");
      if (s?.id) setFocusSessionId(s.id);
    } catch (e) {
      console.error(e);
      alert(e?.message || "Could not create project.");
    }
  };

  // --------- Project actions ----------
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

  // --------- Sessions ----------
  const openAddSession = async () => {
    if (!activeProject?.id) return;
    try {
      const s = await addSession(activeProject.id, "");
      if (s?.id) setFocusSessionId(s.id);
    } catch (e) {
      alert(e?.message || "Could not add session.");
    }
  };

  const renameSessionInline = async (sessionId, nextTitle) => {
    if (!activeProject?.id || !sessionId) return;
    await renameSession(activeProject.id, sessionId, nextTitle);
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
      if (activeSessionId === session.id) closeSessionDetail();
    } catch (e) {
      alert(e?.message || "Could not delete session.");
    }
  };

  // --------- Project Notes ----------
  const handleUpdateProjectBrief = async (text) => {
    if (!activeProject?.id) return;
    await updateProjectBrief?.(activeProject.id, text);
  };

  // --------- Native photo picker -> upload ----------
  const handleAddMedia = async ({ files, sessionId, sessionTitle }) => {
    if (!activeProject) return;
    try {
      if (addMediaFilesToProject) {
        await addMediaFilesToProject(activeProject.id, files, sessionId, sessionTitle);
      } else {
        for (const f of (files || []).slice(0, 50)) {
          // eslint-disable-next-line no-await-in-loop
          await addMediaToProject(activeProject.id, f, sessionId, sessionTitle);
        }
      }
    } catch (e) {
      console.error(e);
      alert(e?.message || "Upload failed.");
    }
  };

  const addPhotosNative = async (session, files) => {
    if (!activeProject?.id || !session?.id || !files?.length) return;
    const arr = Array.from(files).slice(0, 50);
    await handleAddMedia({
      files: arr,
      sessionId: session.id,
      sessionTitle: session.title || "Untitled",
    });
  };

  // --------- Viewer delete ----------
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

  // Navigation title/back (so the new Navigation.jsx can render consistent top bar)
  const navTitle = useMemo(() => {
    if (mediaNav.viewerOpen) return "Viewer";
    if (view === "session") return "Session";
    if (view === "project") return "Project";
    return dashboardTitle;
  }, [mediaNav.viewerOpen, view, dashboardTitle]);

  const navBack = useMemo(() => {
    if (mediaNav.viewerOpen) return mediaNav.closeViewer;
    if (view === "session") return closeSessionDetail;
    if (view === "project") return goBackFromProject;
    return null;
  }, [mediaNav.viewerOpen, view]);

  return (
    <AbstractCreamBackdrop>
      <div style={{ fontFamily: bodyFont, color: palette.ink }}>
        <div className="max-w-6xl mx-auto relative">
          {/* ✅ Unified nav API (new Navigation.jsx supports this cleanly) */}
          <Navigation tab={tab} onTabChange={setTabAndEnsureDashboard} title={navTitle} onBack={navBack} />

          {/* DASHBOARD */}
          {view === "dashboard" && (
            <div className="pt-6 pb-28">
              {tab === "search" ? (
                <div className="px-6">
                  {/* Search input */}
                  <div
                    className="w-full px-4 py-3 rounded-[14px]"
                    style={{ background: "rgba(255,255,255,0.70)", border: `1px solid ${palette.line}` }}
                  >
                    <div
                      className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                      style={{ color: "rgba(0,0,0,0.45)" }}
                    >
                      Search
                    </div>
                    <input
                      ref={searchInputRef}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search projects or tags…"
                      className="mt-2 w-full bg-transparent outline-none text-sm"
                      style={{ color: "rgba(0,0,0,0.78)" }}
                    />
                    <div className="text-[10px] mt-1" style={{ color: "rgba(0,0,0,0.38)" }}>
                      Try a project name or a #tag
                    </div>
                  </div>

                  <div className="mt-6">
                    <div
                      className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                      style={{ color: "rgba(0,0,0,0.45)" }}
                    >
                      Results
                    </div>
                    <div className="mt-3">
                      <LibraryGrid title="" onNew={null} />
                    </div>
                  </div>
                </div>
              ) : tab === "vault" ? (
                <Settings headerFont={headerFont} palette={palette} />
              ) : (
                <LibraryGrid title={dashboardTitle} onNew={() => setNewOpen(true)} />
              )}
            </div>
          )}

          {/* PROJECT PAGE */}
          {view === "project" && activeProject && (
            <ProjectView
              project={activeProject}
              palette={palette}
              onBack={goBackFromProject}
              onEditProject={editProject}
              onShareProject={shareProject}
              onArchiveProject={removeProject}
              onOpenViewer={mediaNav.openViewer}
              onOpenSession={openSessionDetail}
              onAddSession={openAddSession}
              onRenameSession={renameSessionInline}
              onDeleteSession={removeSession}
              onShareSession={shareSession}
              onUpdateProjectBrief={handleUpdateProjectBrief}
              onAddPhotosNative={addPhotosNative}
              autoFocusSessionId={focusSessionId}
              onClearAutoFocusSessionId={() => setFocusSessionId(null)}
            />
          )}

          {/* SESSION DETAIL */}
          {view === "session" && activeProject && activeSession && (
            <SessionDetailView
              session={activeSession}
              palette={palette}
              headerFont={headerFont}
              bodyFont={bodyFont}
              mediaNotesById={mediaNotesById}
              onOpenMedia={mediaNav.openViewer}
              onDeleteSession={removeSession}
              onShareSession={shareSession}
              onUpdateSessionNotes={(text) => updateSessionNotes?.(activeProject.id, activeSession.id, text)}
              onAddPhotosNative={addPhotosNative}
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
              onUpdateMediaNote={upsertMediaNote}
            />
          )}

          {/* New Project Screen */}
          <NewProjectModal open={newOpen} onClose={() => setNewOpen(false)} onCreate={handleCreateProject} />
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