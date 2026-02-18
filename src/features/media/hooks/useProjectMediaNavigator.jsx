// /src/features/media/hooks/useProjectMediaNavigator.js
import { useCallback, useMemo, useState } from "react";

/**
 * Centralizes "viewer state" + navigation across a project's sessions/media.
 * Keeps App.jsx thin.
 *
 * Inputs:
 * - activeProject: project object with sessions[{id,title,media[]}]
 * - deleteMediaFromProject: async (projectId, sessionId, mediaId) => void
 */
export default function useProjectMediaNavigator(activeProject, deleteMediaFromProject) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerKey, setViewerKey] = useState(null); // { sessionId, mediaId } | null

  const flatMedia = useMemo(() => {
    const sessions = Array.isArray(activeProject?.sessions) ? activeProject.sessions : [];
    return sessions.flatMap((s) =>
      (Array.isArray(s?.media) ? s.media : []).map((m) => ({ ...m, sessionId: s.id }))
    );
  }, [activeProject?.sessions]);

  const selectedIndex = useMemo(() => {
    if (!viewerKey) return -1;
    return flatMedia.findIndex(
      (m) => m.id === viewerKey.mediaId && m.sessionId === viewerKey.sessionId
    );
  }, [flatMedia, viewerKey]);

  const selectedMedia = useMemo(() => {
    if (selectedIndex < 0) return null;
    return flatMedia[selectedIndex] || null;
  }, [flatMedia, selectedIndex]);

  const moreFromSession = useMemo(() => {
    if (!activeProject?.sessions || !selectedMedia?.sessionId) return [];
    const s = (activeProject.sessions || []).find((x) => x?.id === selectedMedia.sessionId);
    const arr = Array.isArray(s?.media) ? s.media : [];
    return arr.filter((m) => m?.url).map((m) => ({ id: m.id, url: m.url, sessionId: s?.id }));
  }, [activeProject?.sessions, selectedMedia?.sessionId]);

  const setSelectedByIndex = useCallback(
    (idx) => {
      if (idx < 0 || idx >= flatMedia.length) return;
      const m = flatMedia[idx];
      setViewerKey({ sessionId: m.sessionId, mediaId: m.id });
    },
    [flatMedia]
  );

  const openViewer = useCallback((sessionId, mediaId) => {
    setViewerKey({ sessionId, mediaId });
    setViewerOpen(true);
  }, []);

  const closeViewer = useCallback(() => setViewerOpen(false), []);

  const nextMedia = useCallback(() => setSelectedByIndex(selectedIndex + 1), [
    selectedIndex,
    setSelectedByIndex,
  ]);

  const prevMedia = useCallback(() => setSelectedByIndex(selectedIndex - 1), [
    selectedIndex,
    setSelectedByIndex,
  ]);

  const deleteSelectedMedia = useCallback(async () => {
    if (!activeProject?.id || !selectedMedia?.id || !selectedMedia?.sessionId) return;

    const deletedIndex = selectedIndex;

    await deleteMediaFromProject?.(activeProject.id, selectedMedia.sessionId, selectedMedia.id);

    // Choose next based on the *previous* flat list (stable)
    const next = flatMedia[deletedIndex + 1] || flatMedia[deletedIndex - 1] || null;

    // Let VaultContext update propagate, then set next key / close
    requestAnimationFrame(() => {
      if (!next) {
        setViewerKey(null);
        setViewerOpen(false);
        return;
      }
      setViewerKey({ sessionId: next.sessionId, mediaId: next.id });
    });
  }, [activeProject?.id, deleteMediaFromProject, flatMedia, selectedIndex, selectedMedia]);

  const resetViewer = useCallback(() => {
    setViewerOpen(false);
    setViewerKey(null);
  }, []);

  return {
    // state
    viewerOpen,
    viewerKey,
    setViewerKey,

    // computed
    flatMedia,
    selectedIndex,
    selectedMedia,
    moreFromSession,

    // actions
    openViewer,
    closeViewer,
    nextMedia,
    prevMedia,
    deleteSelectedMedia,
    resetViewer,
  };
}
