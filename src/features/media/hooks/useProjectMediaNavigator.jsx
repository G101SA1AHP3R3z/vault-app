// /src/features/media/hooks/useProjectMediaNavigator.jsx
import { useCallback, useMemo, useRef, useState } from "react";

function createdAtKey(ts) {
  if (!ts) return "";
  if (typeof ts?.seconds === "number") return `s:${ts.seconds}`;
  if (typeof ts?.toDate === "function") return `d:${ts.toDate().getTime()}`;
  const d = new Date(ts);
  if (!Number.isNaN(d.getTime())) return `t:${d.getTime()}`;
  return "";
}

function hotspotSig(hotspots) {
  if (!Array.isArray(hotspots) || hotspots.length === 0) return "";
  // enough to detect “meaningful change” without heavy work
  return hotspots
    .map((h) => {
      const id = h?.id || "";
      const x = typeof h?.x === "number" ? h.x.toFixed(4) : "";
      const y = typeof h?.y === "number" ? h.y.toFixed(4) : "";
      const note = (h?.note || h?.label || "").toString().slice(0, 80);
      return `${id}:${x}:${y}:${note}`;
    })
    .join("|");
}

/**
 * Centralizes viewer state + navigation across a project's sessions/media.
 * Guarantees stable media object references so swiping feels continuous.
 */
export default function useProjectMediaNavigator(activeProject, deleteMediaFromProject) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerKey, setViewerKey] = useState(null); // { sessionId, mediaId }

  // Cache stable objects by `${sessionId}:${mediaId}`
  const cacheRef = useRef(new Map());

  const flatMedia = useMemo(() => {
    const sessions = Array.isArray(activeProject?.sessions) ? activeProject.sessions : [];
    const nextKeys = new Set();
    const out = [];

    for (const s of sessions) {
      const sessionId = s?.id;
      if (!sessionId) continue;
      const mediaArr = Array.isArray(s?.media) ? s.media : [];

      for (const m of mediaArr) {
        if (!m?.id) continue;
        const key = `${sessionId}:${m.id}`;
        nextKeys.add(key);

        const url = m.url || "";
        const thumbnailUrl = m.thumbnailUrl || m.thumbnail_url || "";
        const kind = m.kind || m.mediaType || (m.type === "video" ? "video" : "image");
        const type = m.type || "";
        const createdKey = createdAtKey(m.createdAt || m.created_at || m.ts || null);
        const hotspotsArr = Array.isArray(m.hotspots) ? m.hotspots : [];
        const hotspotsKey = hotspotSig(hotspotsArr);

        const prev = cacheRef.current.get(key);

        const needsNew =
          !prev ||
          prev.url !== url ||
          prev.thumbnailUrl !== thumbnailUrl ||
          prev.kind !== kind ||
          prev.type !== type ||
          prev.createdKey !== createdKey ||
          prev.hotspotsKey !== hotspotsKey;

        if (needsNew) {
          const nextObj = {
            id: m.id,
            sessionId,
            url,
            thumbnailUrl,
            kind,
            type,
            createdKey,
            hotspotsKey,
            hotspots: hotspotsArr, // keep latest array for viewer/pins
          };
          cacheRef.current.set(key, nextObj);
          out.push(nextObj);
        } else {
          out.push(prev);
        }
      }
    }

    // garbage collect removed
    for (const k of cacheRef.current.keys()) {
      if (!nextKeys.has(k)) cacheRef.current.delete(k);
    }

    return out;
  }, [activeProject?.sessions]);

  const selectedIndex = useMemo(() => {
    if (!viewerKey) return -1;
    return flatMedia.findIndex((m) => m.id === viewerKey.mediaId && m.sessionId === viewerKey.sessionId);
  }, [flatMedia, viewerKey]);

  const selectedMedia = useMemo(() => {
    if (selectedIndex < 0) return null;
    return flatMedia[selectedIndex] || null;
  }, [flatMedia, selectedIndex]);

  const moreFromSession = useMemo(() => {
    if (!selectedMedia?.sessionId) return [];
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

  const nextMedia = useCallback(() => setSelectedByIndex(selectedIndex + 1), [selectedIndex, setSelectedByIndex]);
  const prevMedia = useCallback(() => setSelectedByIndex(selectedIndex - 1), [selectedIndex, setSelectedByIndex]);

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