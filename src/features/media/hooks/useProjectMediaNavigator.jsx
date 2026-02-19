// /src/features/media/hooks/useProjectMediaNavigator.jsx
import { useCallback, useMemo, useRef, useState } from "react";

/**
 * Centralizes "viewer state" + navigation across a project's sessions/media.
 * Keeps App.jsx thin.
 *
 * Key improvement in this version:
 * - Keeps stable object references for media items (prevents “refresh” feel on swipe)
 *   by caching flattened media objects by `${sessionId}:${mediaId}` and reusing them
 *   unless relevant fields changed.
 *
 * Inputs:
 * - activeProject: project object with sessions[{id,title,media[]}]
 * - deleteMediaFromProject: async (projectId, sessionId, mediaId) => void
 */
export default function useProjectMediaNavigator(activeProject, deleteMediaFromProject) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerKey, setViewerKey] = useState(null); // { sessionId, mediaId } | null

  // Cache flattened media objects so React doesn’t see “brand new” objects every update.
  // This is a big contributor to the “refresh” feeling during swipes.
  const flatCacheRef = useRef(new Map()); // key -> cached media object

  const flatMedia = useMemo(() => {
    const sessions = Array.isArray(activeProject?.sessions) ? activeProject.sessions : [];

    const nextKeys = new Set();
    const nextFlat = [];

    for (const s of sessions) {
      const sessionId = s?.id;
      const mediaArr = Array.isArray(s?.media) ? s.media : [];
      if (!sessionId) continue;

      for (const m of mediaArr) {
        if (!m?.id) continue;

        const key = `${sessionId}:${m.id}`;
        nextKeys.add(key);

        const prev = flatCacheRef.current.get(key);

        // Only include the fields the viewer/navigation actually needs.
        // Add more fields here only if you truly use them in MediaViewer/Stage.
        const url = m.url || "";
        const hotspots = Array.isArray(m.hotspots) ? m.hotspots : [];
        const kind = m.kind || m.mediaType || (m.type === "video" ? "video" : "image");
        const type = m.type || "";
        const createdAt = m.createdAt || m.created_at || m.ts || null;

        const needsNew =
          !prev ||
          prev.url !== url ||
          prev.kind !== kind ||
          prev.type !== type ||
          prev.createdAt !== createdAt ||
          prev.hotspots !== hotspots; // keep reference stable unless hotspots array identity changes

        if (needsNew) {
          const nextObj = {
            id: m.id,
            sessionId,
            url,
            kind,
            type,
            createdAt,
            hotspots,
          };
          flatCacheRef.current.set(key, nextObj);
          nextFlat.push(nextObj);
        } else {
          nextFlat.push(prev);
        }
      }
    }

    // Prune cache entries that no longer exist
    for (const k of flatCacheRef.current.keys()) {
      if (!nextKeys.has(k)) flatCacheRef.current.delete(k);
    }

    return nextFlat;
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

  // The carousel should use the session’s media order, but keep objects lightweight/stable.
  const moreFromSession = useMemo(() => {
    if (!activeProject?.sessions || !selectedMedia?.sessionId) return [];
    const s = (activeProject.sessions || []).find((x) => x?.id === selectedMedia.sessionId);
    const arr = Array.isArray(s?.media) ? s.media : [];
    return arr
      .filter((m) => m?.url)
      .map((m) => ({
        id: m.id,
        url: m.url,
        sessionId: s?.id,
      }));
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
