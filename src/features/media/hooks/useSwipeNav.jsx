import { useEffect, useMemo, useRef, useState } from "react";

/**
 * iOS-like swipe with interactive drag + edge resistance + spring settle.
 *
 * - Horizontal drag exposes displayX for a carousel translate.
 * - On release: commit to next/prev (slide offscreen then call onNext/onPrev)
 *   or spring back (slight overshoot then settle to 0).
 * - Vertical swipe down triggers onSwipeDown.
 *
 * IMPORTANT:
 * - Only call onPointerEnd once (from pointerup/cancel).
 * - Pass canPrev/canNext so we can rubber-band at edges.
 */
export default function useSwipeNav({
  enabled = true,
  onPrev,
  onNext,
  onSwipeDown,
  isBlocked = false,
  stageRef = null,
  animationMs = 240,
  canPrev = true,
  canNext = true,
}) {
  const swipeRef = useRef({
    down: false,
    x0: 0,
    y0: 0,
    t0: 0,
    axis: null, // 'x' | 'y' | null
    pointerId: null,
    lastDx: 0,
  });

  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [settleX, setSettleX] = useState(0);
  const [direction, setDirection] = useState(0); // -1 prev, +1 next

  const displayX = useMemo(
    () => (isSettling ? settleX : dragX),
    [dragX, isSettling, settleX]
  );

  const getStageWidth = () => {
    const w = stageRef?.current?.clientWidth;
    return typeof w === "number" && w > 0 ? w : window.innerWidth;
  };

  const reset = () => {
    swipeRef.current.down = false;
    swipeRef.current.axis = null;
    swipeRef.current.pointerId = null;
    swipeRef.current.lastDx = 0;

    setDragX(0);
    setIsDragging(false);
    setIsSettling(false);
    setSettleX(0);
    setDirection(0);
  };

  useEffect(() => {
    if (isBlocked) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBlocked]);

  // iOS-ish rubber band curve
  const rubberBand = (dx, dimension) => {
    const d = Math.abs(dx);
    const sign = dx < 0 ? -1 : 1;
    const c = dimension * 0.55; // how "stretchy"
    // (c*d)/(c+d) gives diminishing returns
    return sign * ((c * d) / (c + d));
  };

  const onPointerDown = (e) => {
    if (!enabled || isBlocked) return;
    if (isSettling) return;

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
    setIsSettling(false);
    setDragX(0);
    setSettleX(0);
    setDirection(0);

    // Capture pointer so move/up stay consistent
    try {
      e.currentTarget?.setPointerCapture?.(e.pointerId);
    } catch {}
  };

  const onPointerMove = (e) => {
    if (!enabled || isBlocked) return;
    if (!swipeRef.current.down) return;
    if (isSettling) return;

    const x = e.clientX ?? e.touches?.[0]?.clientX;
    const y = e.clientY ?? e.touches?.[0]?.clientY;
    if (x == null || y == null) return;

    let dx = x - swipeRef.current.x0;
    const dy = y - swipeRef.current.y0;

    // Decide axis after small movement
    if (!swipeRef.current.axis) {
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      if (adx < 6 && ady < 6) return;
      swipeRef.current.axis = adx > ady ? "x" : "y";
    }

    if (swipeRef.current.axis === "y") {
      setDragX(0);
      setDirection(0);
      return;
    }

    const w = getStageWidth();

    // Edge resistance (rubber band) when there's no neighbor
    const goingPrev = dx > 0;
    const goingNext = dx < 0;

    if ((goingPrev && !canPrev) || (goingNext && !canNext)) {
      dx = rubberBand(dx, w);
    }

    // Clamp a little so it doesn't go insane
    const max = Math.max(80, w * 0.95);
    const clamped = Math.max(-max, Math.min(max, dx));

    swipeRef.current.lastDx = clamped;
    setDragX(clamped);
    setDirection(clamped < 0 ? 1 : clamped > 0 ? -1 : 0);
  };

  const springBack = (fromDx) => {
    // two-step settle: small overshoot then 0
    setIsSettling(true);

    const overshoot = Math.max(-32, Math.min(32, -fromDx * 0.08)); // opposite direction
    setSettleX(overshoot);

    // Kick to 0 next frame + timeout for a soft bounce
    requestAnimationFrame(() => {
      setTimeout(() => {
        setSettleX(0);
      }, 90);
    });

    setTimeout(() => {
      reset();
    }, animationMs + 80);
  };

  const commitSlide = (dir, w) => {
    // dir: +1 next (slide left), -1 prev (slide right)
    setDirection(dir);
    setIsSettling(true);
    setSettleX(dir === 1 ? -w : w);

    setTimeout(() => {
      if (dir === 1) onNext?.();
      else onPrev?.();
      reset();
    }, animationMs);
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

    // Vertical swipe down -> close
    if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.25) {
      reset();
      onSwipeDown?.();
      return;
    }

    // If it was a vertical gesture, just reset.
    if (swipeRef.current.axis === "y") {
      reset();
      return;
    }

    const w = getStageWidth();
    const dt = Math.max(1, performance.now() - swipeRef.current.t0);
    const v = dx / dt; // px/ms

    const goingNext = dx < 0;
    const goingPrev = dx > 0;

    // Don't commit into a missing neighbor
    if ((goingNext && !canNext) || (goingPrev && !canPrev)) {
      springBack(dx);
      return;
    }

    const commitByDistance = Math.abs(dx) > Math.max(75, w * 0.22);
    const commitByVelocity = Math.abs(v) > 0.65 && Math.abs(dx) > 40;
    const shouldCommit =
      (commitByDistance || commitByVelocity) && Math.abs(dx) > Math.abs(dy) * 1.15;

    if (!shouldCommit) {
      springBack(dx);
      return;
    }

    const dir = dx < 0 ? 1 : -1; // drag left => next
    commitSlide(dir, w);
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerEnd,

    // touch aliases (mobile browsers sometimes prefer these)
    onTouchStart: onPointerDown,
    onTouchMove: onPointerMove,
    onTouchEnd: onPointerEnd,

    // state for carousel
    dragX,
    displayX,
    direction,
    isDragging,
    isSettling,
  };
}
