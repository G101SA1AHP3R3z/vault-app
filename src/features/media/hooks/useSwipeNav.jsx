import { useRef } from "react";

/**
 * Horizontal swipe: prev/next
 * Vertical swipe down: onSwipeDown (Pinterest-like close)
 */
export default function useSwipeNav({
  enabled = true,
  onPrev,
  onNext,
  onSwipeDown,
  isBlocked = false, // e.g. block swipes while add-pin mode
}) {
  const swipeRef = useRef({ down: false, x0: 0, y0: 0 });

  const onPointerDown = (e) => {
    if (!enabled || isBlocked) return;
    const x = e.clientX ?? e.touches?.[0]?.clientX;
    const y = e.clientY ?? e.touches?.[0]?.clientY;
    if (x == null || y == null) return;
    swipeRef.current = { down: true, x0: x, y0: y };
  };

  const onPointerEnd = (e) => {
    if (!enabled || isBlocked) return;
    if (!swipeRef.current.down) return;

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

    swipeRef.current.down = false;
    if (x == null || y == null) return;

    const dx = x - swipeRef.current.x0;
    const dy = y - swipeRef.current.y0;

    // Down swipe -> close
    if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.25) {
      onSwipeDown?.();
      return;
    }

    // Horizontal -> next/prev
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.25) {
      if (dx < 0) onNext?.();
      else onPrev?.();
    }
  };

  return {
    onPointerDown,
    onPointerEnd,
    onTouchStart: onPointerDown,
    onTouchEnd: onPointerEnd,
  };
}
