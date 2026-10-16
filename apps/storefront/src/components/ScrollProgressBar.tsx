'use client';

import { useEffect, useRef } from 'react';

export function ScrollProgressBar() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (barRef.current) {
        barRef.current.style.display = 'none';
      }
      return;
    }

    let rafId: number | null = null;

    const updateScrollProgress = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const totalScroll =
        document.documentElement.scrollHeight - window.innerHeight;

      if (totalScroll > 0 && barRef.current) {
        const progress = Math.min(1, Math.max(0, scrollY / totalScroll));
        barRef.current.style.transform = `scaleX(${progress})`;
      }
    };

    const onScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        updateScrollProgress();
        rafId = null;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    updateScrollProgress();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-transparent pointer-events-none overflow-hidden z-50">
      <div
        ref={barRef}
        className="h-full w-full bg-[#1B1C1A] origin-left will-change-transform"
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  );
}
