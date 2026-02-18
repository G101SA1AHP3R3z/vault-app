import { useEffect, useRef, useState } from "react";

/**
 * iOS-like swipe with interactive drag + edge resistance + spring settle.
 * Uses direct DOM transforms for 60fps dragging.
 *
 * Key:
 * - Ignores gestures starting on [data-noswipe]
 * - Clears timers on reset/unmount
 * - Does NOT snap transform to 0 until mediaKey changes (prevents flash)
 * - Supports iOS-like "gap" between slides via gapPx
 */
export default function useSwipeNav({
  enabled = true,
  carouselRef,
  onPrev,
  onNext,
  onSwipeDown,
  isBlocked = false,
  stageRef = null,
  animationMs = 260,
  canPrev = true,
  canNext = true,
  mediaKey,
  gapPx = 16, // 👈 NEW
}) {
  const swipeRef = useRef({
    down: false,
    x0: 0,
    y0: 0,
    t0: 0,
    axis: null,
    pointerId: null,
    lastDx: 0,
  });

  const [isDragging, setIsDragging] = useState(false);
  const pendingResetRef = useRef(false);

  const timersRef = useRef([]);
  const addTimer = (id) => {
    timersRef.current.push(id);
    return id;
  };
  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  const getStageWidth = () => {
    const w = stageRef?.current?.clientWidth;
    return typeof w === "number" && w > 0 ? w : window.innerWidth;
  };

  const step = () => getStageWidth() + (gapPx || 0); // 👈 NEW

  const setTransform = (x, transition = "none") => {
    const el = carouselRef?.current;
    if (!el) return;
    el.style.transition = transition;
    el.style.transform = `translate3d(${x}px, 0, 0)`;
  };

  const shouldIgnoreGesture = (e) => {
    const t = e?.target;
    if (!t || typeof t.closest !== "function") return false;
    return Boolean(t.closest("[data-noswipe]"));
  };

  const resetGestureState = () => {
    swipeRef.current.down = false;
    swipeRef.current.axis = null;
    swipeRef.current.pointerId = null;
    swipeRef.current.lastDx = 0;
    setIsDragging(false);
  };

  const hardReset = () => {
    clearTimers();
    pendingResetRef.current = false;
    resetGestureState();
    setTransform(0, "none");
  };

  useEffect(() => {
    if (isBlocked) hardReset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBlocked]);

  // Snap back ONLY after media changes (so middle slide is updated)
  useEffect(() => {
    if (!pendingResetRef.current) return;
    pendingResetRef.current = false;
    clearTimers();
    resetGestureState();
    setTransform(0, "none");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaKey]);

  const rubberBand = (dx, dimension) => {
    const d = Math.abs(dx);
    const sign = dx < 0 ? -1 : 1;
    const c = dimension * 0.55;
    return sign * ((c * d) / (c + d));
  };

  const onPointerDown = (e) => {
    if (!enabled || isBlocked) return;
    if (shouldIgnoreGesture(e)) return;

    const x = e.clientX ?? e.touches?.[0]?.clientX;
    const y = e.clientY ?? e.touches?.[0]?.clientY;
    if (x == null || y == null) return;

    swipeRef.current.down = true;
    swipeRef.current.x0 = x;
    swipeRef.current.y0 = y;
    swipeRef.current.t0 = performance.now();
    swipeRef.current.axis = null;
    swipeRef.current.pointerId = e.pointerId ?? null;
    swipeRef.current.lastDx = 0;

    setIsDragging(true);
    setTransform(0, "none");

    try {
      if (e.pointerId != null) e.currentTarget?.setPointerCapture?.(e.pointerId);
    } catch {}
  };

  const onPointerMove = (e) => {
    if (!enabled || isBlocked) return;
    if (!swipeRef.current.down) return;

    const x = e.clientX ?? e.touches?.[0]?.clientX;
    const y = e.clientY ?? e.touches?.[0]?.clientY;
    if (x == null || y == null) return;

    let dx = x - swipeRef.current.x0;
    const dy = y - swipeRef.current.y0;

    if (!swipeRef.current.axis) {
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      if (adx < 6 && ady < 6) return;
      swipeRef.current.axis = adx > ady ? "x" : "y";
    }

    if (swipeRef.current.axis === "y") {
      setTransform(0, "none");
      return;
    }

    const w = getStageWidth(); // rubberband should use actual visible width
    const goingPrev = dx > 0;
    const goingNext = dx < 0;

    if ((goingPrev && !canPrev) || (goingNext && !canNext)) {
      dx = rubberBand(dx, w);
    }

    const max = Math.max(90, w * 0.95);
    const clamped = Math.max(-max, Math.min(max, dx));

    swipeRef.current.lastDx = clamped;
    setTransform(clamped, "none");
  };

  const springBack = (fromDx) => {
    setIsDragging(false);

    const overshoot = Math.max(-28, Math.min(28, -fromDx * 0.08));
    setTransform(
      overshoot,
      `transform ${Math.round(animationMs * 0.6)}ms cubic-bezier(0.22, 1, 0.36, 1)`
    );

    addTimer(
      setTimeout(() => {
        setTransform(0, `transform ${Math.round(animationMs * 0.4)}ms ease-out`);
        addTimer(setTimeout(() => hardReset(), Math.round(animationMs * 0.4) + 30));
      }, Math.round(animationMs * 0.6) + 30)
    );
  };

  const commitSlide = (dir) => {
    // dir: +1 => next (slide left), -1 => prev (slide right)
    setIsDragging(false);

    const dist = step(); // 👈 includes gap
    const targetX = dir === 1 ? -dist : dist;

    setTransform(targetX, `transform ${animationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`);

    addTimer(
      setTimeout(() => {
        pendingResetRef.current = true;
        if (dir === 1) onNext?.();
        else onPrev?.();
        resetGestureState();
      }, animationMs + 20)
    );
  };

  const onPointerEnd = (e) => {
    if (!enabled || isBlocked) return;
    if (!swipeRef.current.down) return;

    swipeRef.current.down = false;

    const x =
      e.clientX ??
      e.changedTouches?.[0]?.clientX ??
      e.touches?.[0]?.clientX ??
      null;
    const y =
      e.clientY ??
      e.changedTouches?.[0]?.clientY ??
      e.touches?.[0]?.clientY ??
      null;

    const dx = x == null ? swipeRef.current.lastDx : x - swipeRef.current.x0;
    const dy = y == null ? 0 : y - swipeRef.current.y0;

    if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.25) {
      hardReset();
      onSwipeDown?.();
      return;
    }

    if (swipeRef.current.axis === "y") {
      hardReset();
      return;
    }

    const w = getStageWidth();
    const dt = Math.max(1, performance.now() - swipeRef.current.t0);
    const v = dx / dt;

    const goingNext = dx < 0;
    const goingPrev = dx > 0;

    if ((goingNext && !canNext) || (goingPrev && !canPrev)) {
      springBack(dx);
      return;
    }

    const commitByDistance = Math.abs(dx) > Math.max(70, w * 0.22);
    const commitByVelocity = Math.abs(v) > 0.65 && Math.abs(dx) > 40;

    if (!(commitByDistance || commitByVelocity)) {
      springBack(dx);
      return;
    }

    commitSlide(dx < 0 ? 1 : -1);
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerEnd,
    isDragging,
  };
}
