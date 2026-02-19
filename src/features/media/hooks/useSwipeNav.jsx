import { useEffect, useRef } from "react";

/**
 * iOS-like swipe with interactive drag and slide.
 * Bypasses React state entirely for 60fps native-feeling dragging.
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

  const getStageWidth = () => {
    const w = stageRef?.current?.clientWidth;
    return typeof w === "number" && w > 0 ? w : window.innerWidth;
  };

  const setTransform = (x, transition = "none") => {
    if (!carouselRef?.current) return;
    carouselRef.current.style.transition = transition;
    carouselRef.current.style.transform = `translate3d(${x}px, 0, 0)`;
  };

  const reset = () => {
    swipeRef.current.down = false;
    swipeRef.current.axis = null;
    swipeRef.current.pointerId = null;
    swipeRef.current.lastDx = 0;
    setTransform(0, "none");
  };

  useEffect(() => {
    if (isBlocked) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBlocked]);

  const rubberBand = (dx, dimension) => {
    const d = Math.abs(dx);
    const sign = dx < 0 ? -1 : 1;
    const c = dimension * 0.55;
    return sign * ((c * d) / (c + d));
  };

  const onPointerDown = (e) => {
    if (!enabled || isBlocked) return;
    
    // KILL SWITCH: If touching a button or interactive UI, abort the swipe immediately.
    if (e.target.closest('button') || e.target.closest('[data-noswipe]')) return;

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

    setTransform(0, "none");

    try {
      e.currentTarget?.setPointerCapture?.(e.pointerId);
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

    const w = getStageWidth();
    const goingPrev = dx > 0;
    const goingNext = dx < 0;

    if ((goingPrev && !canPrev) || (goingNext && !canNext)) {
      dx = rubberBand(dx, w);
    }

    const max = Math.max(80, w * 0.95);
    const clamped = Math.max(-max, Math.min(max, dx));

    swipeRef.current.lastDx = clamped;
    setTransform(clamped, "none");
  };

  const springBack = (fromDx) => {
    const overshoot = Math.max(-32, Math.min(32, -fromDx * 0.08));
    setTransform(overshoot, `transform ${animationMs * 0.6}ms cubic-bezier(0.22, 1, 0.36, 1)`);

    setTimeout(() => {
      setTransform(0, `transform ${animationMs * 0.4}ms ease-out`);
      setTimeout(() => {
        reset();
      }, animationMs * 0.4 + 20);
    }, animationMs * 0.6 + 20);
  };

  const commitSlide = (dir, w) => {
    const targetX = dir === 1 ? -w : w;
    setTransform(targetX, `transform ${animationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`);

    setTimeout(() => {
      if (dir === 1) onNext?.();
      else onPrev?.();
      reset();
    }, animationMs + 20);
  };

  const onPointerEnd = (e) => {
    if (!enabled || isBlocked) return;
    if (!swipeRef.current.down) return;

    swipeRef.current.down = false;

    const x = e.clientX ?? e.changedTouches?.[0]?.clientX ?? e.touches?.[0]?.clientX ?? null;
    const y = e.clientY ?? e.changedTouches?.[0]?.clientY ?? e.touches?.[0]?.clientY ?? null;

    const dx = x == null ? swipeRef.current.lastDx : x - swipeRef.current.x0;
    const dy = y == null ? 0 : y - swipeRef.current.y0;

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
    const v = dx / dt;

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