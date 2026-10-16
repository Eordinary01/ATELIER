'use client';

import { useState, useEffect, useRef } from 'react';

export function EditorialCurtain() {
  const [isMounted, setIsMounted] = useState<boolean>(true);
  const curtainRef = useRef<HTMLDivElement>(null);
  const monogramRef = useRef<HTMLDivElement>(null);
  const sublineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    // Dynamically load GSAP for the cinematic curtain sequence
    import('gsap').then((gsapMod) => {
      const gsap = gsapMod.default || gsapMod;
      if (!gsap || !curtainRef.current) {
        // Fallback CSS lift if GSAP fails
        timeoutId = setTimeout(() => setIsMounted(false), 1600);
        return;
      }

      const tl = gsap.timeline({
        onComplete: () => {
          setIsMounted(false);
        },
      });

      // 1. Initial monogram reveal & tracking expansion
      if (monogramRef.current) {
        tl.fromTo(
          monogramRef.current,
          { opacity: 0, y: 16, letterSpacing: '0.2em' },
          { opacity: 1, y: 0, letterSpacing: '0.45em', duration: 0.65, ease: 'power2.out' }
        );
      }

      // 2. Subline fade in
      if (sublineRef.current) {
        tl.fromTo(
          sublineRef.current,
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' },
          '-=0.3'
        );
      }

      // 3. Architectural curtain wipe upward revealing the storefront
      tl.to(
        curtainRef.current,
        {
          yPercent: -100,
          duration: 0.8,
          ease: 'power3.inOut',
        },
        '+=0.35'
      );
    }).catch(() => {
      timeoutId = setTimeout(() => setIsMounted(false), 1600);
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  if (!isMounted) return null;

  return (
    <div
      ref={curtainRef}
      onClick={() => setIsMounted(false)}
      className="fixed inset-0 z-[100] bg-[#FAF9F6] flex flex-col items-center justify-center cursor-pointer select-none"
      style={{ willChange: 'transform' }}
      title="Click anywhere to skip intro"
    >
      <div className="flex flex-col items-center space-y-4 px-6 text-center">
        <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-[#767872]">
          Permanent Wardrobe Architecture
        </span>
        <h1
          ref={monogramRef}
          className="font-headline-lg text-3xl sm:text-5xl text-[#1B1C1A] tracking-[0.45em] uppercase font-medium"
        >
          A T E L I E R
        </h1>
        <div className="w-12 h-[1px] bg-[#D6D3CA] my-1" />
        <div ref={sublineRef} className="flex flex-col items-center space-y-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#5A1827]">
            New Delhi Studio &bull; Series 04
          </span>
          <span className="font-mono text-[9px] text-[#A0A29C] tracking-[0.2em]">
            28°36'N 77°12'E
          </span>
        </div>
      </div>
    </div>
  );
}

export default EditorialCurtain;
