import { useEffect, useRef } from "react";

export default function useSwipeNav({
  enabled = true,
  carouselRef,
  onPrev,
  onNext,
  onSwipeDown,
  isBlocked = false,
  stageRef = null,
  animationMs = 280,
  canPrev = true,
  canNext = true,
  gapPx = 16,
}) {
  const swipeRef = useRef({
    down: false,
    x0: 0,
    y0: 0,
    t0: 0,
    axis: null, // "x" | "y"
    pointerId: null,
    lastDx: 0,
  });

  const rafRef = useRef({
    id: 0,
    pending: false,
    x: 0,
  });

  const timeoutsRef = useRef([]);

  const clearTimers = () => {
    for (const t of timeoutsRef.current) clearTimeout(t);
    timeoutsRef.current = [];
  };

  const getStageWidth = () => {
    const w = stageRef?.current?.clientWidth;
    return typeof w === "number" && w > 0 ? w : window.innerWidth;
  };

  const setTransformImmediate = (x) => {
    const el = carouselRef?.current;
    if (!el) return;
    el.style.transition = "none";
    el.style.transform = `translate3d(${x}px,0,0)`;
    el.style.willChange = "transform";
  };

  const setTransformRaf = (x) => {
    rafRef.current.x = x;
    if (rafRef.current.pending) return;
    rafRef.current.pending = true;

    rafRef.current.id = requestAnimationFrame(() => {
      rafRef.current.pending = false;
      setTransformImmediate(rafRef.current.x);
    });
  };

  const setTransformAnimated = (x, transition) => {
    const el = carouselRef?.current;
    if (!el) return;
    el.style.willChange = "transform";
    el.style.transition = transition;
    el.style.transform = `translate3d(${x}px,0,0)`;
  };

  const reset = () => {
    swipeRef.current.down = false;
    swipeRef.current.axis = null;
    swipeRef.current.pointerId = null;
    swipeRef.current.lastDx = 0;
    clearTimers();
    setTransformImmediate(0);
  };

  useEffect(() => {
    if (isBlocked) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBlocked]);

  useEffect(() => {
    return () => {
      try {
        if (rafRef.current.id) cancelAnimationFrame(rafRef.current.id);
      } catch {}
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rubberBand = (dx, dimension) => {
    const d = Math.abs(dx);
    const sign = dx < 0 ? -1 : 1;
    const c = dimension * 0.55;
    return sign * ((c * d) / (c + d));
  };

  const isMultiTouch = (e) => {
    const t = e?.touches;
    return t && t.length && t.length > 1;
  };

  const onPointerDown = (e) => {
    if (!enabled || isBlocked) return;
    if (isMultiTouch(e)) return;

    // Let UI controls be clickable; swipes should start on the stage itself.
    if (e?.target?.closest?.("button") || e?.target?.closest?.("[data-noswipe]")) return;

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

    clearTimers();
    setTransformImmediate(0);

    // Pointer capture helps consistency on mobile + desktop
    try {
      if (e.pointerId != null) e.currentTarget?.setPointerCapture?.(e.pointerId);
    } catch {}
  };

  const onPointerMove = (e) => {
    if (!enabled || isBlocked) return;
    if (!swipeRef.current.down) return;
    if (isMultiTouch(e)) return;

    // Ignore moves from other pointers
    if (swipeRef.current.pointerId != null && e.pointerId != null && e.pointerId !== swipeRef.current.pointerId) {
      return;
    }

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

    // If vertical, let it go (for swipe down gesture)
    if (swipeRef.current.axis === "y") {
      setTransformImmediate(0);
      return;
    }

    // We are horizontal: prevent browser scroll / bounce
    try {
      e.preventDefault?.();
    } catch {}

    const w = getStageWidth();
    const goingPrev = dx > 0;
    const goingNext = dx < 0;

    if ((goingPrev && !canPrev) || (goingNext && !canNext)) {
      dx = rubberBand(dx, w);
    }

    const max = Math.max(80, w * 0.95);
    const clamped = Math.max(-max, Math.min(max, dx));

    swipeRef.current.lastDx = clamped;
    setTransformRaf(clamped);
  };

  const springBack = (fromDx) => {
    // Slight overshoot then settle
    const overshoot = Math.max(-40, Math.min(40, -fromDx * 0.12));
    setTransformAnimated(overshoot, `transform ${Math.round(animationMs * 0.7)}ms cubic-bezier(.16,1,.3,1)`);

    const t1 = setTimeout(() => {
      setTransformAnimated(0, `transform ${Math.round(animationMs * 0.55)}ms cubic-bezier(.16,1,.3,1)`);
      const t2 = setTimeout(() => reset(), Math.round(animationMs * 0.55) + 24);
      timeoutsRef.current.push(t2);
    }, Math.round(animationMs * 0.7) + 24);

    timeoutsRef.current.push(t1);
  };

  const commitSlide = (dir, w) => {
    // dir: 1 = next (left), -1 = prev (right)
    const targetX = dir === 1 ? -(w + gapPx) : w + gapPx;
    setTransformAnimated(targetX, `transform ${animationMs}ms cubic-bezier(.16,1,.3,1)`);

    const t = setTimeout(() => {
      if (dir === 1) onNext?.();
      else onPrev?.();
      reset();
    }, animationMs + 24);

    timeoutsRef.current.push(t);
  };

  const onPointerEnd = (e) => {
    if (!enabled || isBlocked) return;
    if (!swipeRef.current.down) return;

    // Ignore other pointers
    if (swipeRef.current.pointerId != null && e.pointerId != null && e.pointerId !== swipeRef.current.pointerId) {
      return;
    }

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

    // Swipe down to close
    if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.25) {
      reset();
      onSwipeDown?.();
      return;
    }

    if (swipeRef.current.axis === "y") {
      reset();
      return;
    }

    const w = getStageWidth();
    const dt = Math.max(1, performance.now() - swipeRef.current.t0);
    const v = dx / dt; // px/ms

    const goingNext = dx < 0;
    const goingPrev = dx > 0;

    if ((goingNext && !canNext) || (goingPrev && !canPrev)) {
      springBack(dx);
      return;
    }

    const commitByDistance = Math.abs(dx) > Math.max(75, w * 0.22);
    const commitByVelocity = Math.abs(v) > 0.65 && Math.abs(dx) > 40;
    const shouldCommit = (commitByDistance || commitByVelocity) && Math.abs(dx) > Math.abs(dy) * 1.15;

    if (!shouldCommit) {
      springBack(dx);
      return;
    }

    const dir = dx < 0 ? 1 : -1;
    commitSlide(dir, w);
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerEnd,
  };
}