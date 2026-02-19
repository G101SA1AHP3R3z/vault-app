// /src/features/media/hooks/useProjectMediaNavigator.jsx
import { useCallback, useMemo, useRef, useState } from "react";

/**
 * Centralizes "viewer state" + navigation across a project's sessions/media.
 * Keeps App.jsx thin.
 *
 * Key improvement in this version:
 * - Keeps stable object references for media items (prevents “refresh” feel on swipe)
 * by caching flattened media objects by `${sessionId}:${mediaId}` and reusing them
 * unless relevant fields changed.
 */
export default function useProjectMediaNavigator(activeProject, deleteMediaFromProject) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerKey, setViewerKey] = useState(null); 

  const flatCacheRef = useRef(new Map()); 

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

        const url = m.url || "";
        const thumbnailUrl = m.thumbnailUrl || m.thumbnail_url || ""; // Added to cache for the strip
        const hotspots = Array.isArray(m.hotspots) ? m.hotspots : [];
        const kind = m.kind || m.mediaType || (m.type === "video" ? "video" : "image");
        const type = m.type || "";
        const createdAt = m.createdAt || m.created_at || m.ts || null;

        const needsNew =
          !prev ||
          prev.url !== url ||
          prev.thumbnailUrl !== thumbnailUrl ||
          prev.kind !== kind ||
          prev.type !== type ||
          prev.createdAt !== createdAt ||
          prev.hotspots !== hotspots; 

        if (needsNew) {
          const nextObj = {
            id: m.id,
            sessionId,
            url,
            thumbnailUrl,
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

  // FIX: Tap directly into the stable flatMedia cache instead of mapping new objects.
  // This completely eliminates unnecessary React identity-based re-renders in the SessionStrip.
  const moreFromSession = useMemo(() => {
    if (!selectedMedia?.sessionId || !flatMedia.length) return [];
    return flatMedia.filter((m) => m.sessionId === selectedMedia.sessionId && m.url);
  }, [flatMedia, selectedMedia?.sessionId]);

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

    const next = flatMedia[deletedIndex + 1] || flatMedia[deletedIndex - 1] || null;

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
    viewerOpen,
    viewerKey,
    setViewerKey,
    flatMedia,
    selectedIndex,
    selectedMedia,
    moreFromSession,
    openViewer,
    closeViewer,
    nextMedia,
    prevMedia,
    deleteSelectedMedia,
    resetViewer,
  };
}