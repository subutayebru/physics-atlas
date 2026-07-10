import { useEffect, useRef } from 'react';

// Interactive elements the ring should grow over. Graph nodes live on a
// canvas (no DOM :hover), so GraphView dispatches a `cursor-hover` event too.
const INTERACTIVE =
  'a,button,input,select,textarea,label,[role="button"],.goal-chip,.prereq-chip,' +
  '.mode-tab,.filter-chip,.curriculum-head,.search-result,.map-card-close,.app-wordmark';

/**
 * A dreiraum-style custom cursor: a small blend-mode dot that tracks the
 * pointer exactly, plus a ring that eases behind it and swells over anything
 * clickable. Fine-pointer devices only; degrades to the native cursor when
 * JS is off, on touch, or under reduced-motion the lag is dropped.
 */
export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = document.documentElement;
    const dot = dotRef.current!;
    const ring = ringRef.current!;
    root.classList.add('has-custom-cursor');

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let raf = 0;
    let shown = false;

    const place = (el: HTMLElement, x: number, y: number) => {
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    };

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      place(dot, mx, my);
      if (!shown) {
        shown = true;
        root.classList.add('cursor-active');
      }
      if (reduced) {
        rx = mx;
        ry = my;
        place(ring, rx, ry);
      }
    };

    const onLeave = () => {
      shown = false;
      root.classList.remove('cursor-active');
    };
    const onDown = () => root.classList.add('cursor-down');
    const onUp = () => root.classList.remove('cursor-down');

    const onOver = (e: Event) => {
      if ((e.target as Element)?.closest?.(INTERACTIVE)) root.classList.add('cursor-hovering');
    };
    const onOut = (e: Event) => {
      if ((e.target as Element)?.closest?.(INTERACTIVE)) root.classList.remove('cursor-hovering');
    };
    const onGraphHover = (e: Event) =>
      root.classList.toggle('cursor-hovering', (e as CustomEvent).detail === true);

    const loop = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      place(ring, rx, ry);
      raf = requestAnimationFrame(loop);
    };
    if (!reduced) raf = requestAnimationFrame(loop);

    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    document.addEventListener('mouseover', onOver, true);
    document.addEventListener('mouseout', onOut, true);
    window.addEventListener('cursor-hover', onGraphHover as EventListener);

    return () => {
      cancelAnimationFrame(raf);
      root.classList.remove('has-custom-cursor', 'cursor-active', 'cursor-hovering', 'cursor-down');
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      document.removeEventListener('mouseover', onOver, true);
      document.removeEventListener('mouseout', onOut, true);
      window.removeEventListener('cursor-hover', onGraphHover as EventListener);
    };
  }, []);

  return (
    <>
      <div ref={ringRef} className="cursor-ring" aria-hidden />
      <div ref={dotRef} className="cursor-dot" aria-hidden />
    </>
  );
}
