'use client';

export function ArchivalTicker() {
  const tickerItems = [
    'Series 2025: Volume 04',
    'Milled in Flanders & Gujarat',
    'Hand-Finished in New Delhi Atelier',
    'Raw Fibre Purity',
    'Permanent Wardrobe Architecture',
    'Limited Run Commissions',
    'Complimentary Studio Alterations',
    'Established MMXXIV',
  ];

  return (
    <div
      className="relative w-full bg-[#F4F3F0] border-b border-[#E5E3DC] py-2.5 overflow-hidden select-none"
      role="region"
      aria-label="Atelier Archival Provenance"
    >
      <style>{`
        @keyframes atelier-ltr {
          0% { transform: translate3d(-100%, 0, 0); }
          100% { transform: translate3d(0%, 0, 0); }
        }
        .atelier-ticker-track {
          display: flex;
          align-items: center;
          flex-shrink: 0;
          animation: atelier-ltr 22s linear infinite;
          will-change: transform;
        }
      `}</style>

      <div className="flex w-max">
        {/* Track 1 */}
        <div className="atelier-ticker-track">
          {tickerItems.map((item, index) => (
            <div key={`track1-${index}`} className="flex items-center">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#767872] hover:text-[#1B1C1A] transition-colors whitespace-nowrap px-6">
                {item}
              </span>
              <span className="text-[#A0A29C] text-[10px]">&bull;</span>
            </div>
          ))}
        </div>

        {/* Track 2 (duplicate for seamless infinite loop) */}
        <div className="atelier-ticker-track" aria-hidden="true">
          {tickerItems.map((item, index) => (
            <div key={`track2-${index}`} className="flex items-center">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#767872] hover:text-[#1B1C1A] transition-colors whitespace-nowrap px-6">
                {item}
              </span>
              <span className="text-[#A0A29C] text-[10px]">&bull;</span>
            </div>
          ))}
        </div>

        {/* Track 3 (safeguard for wide viewports) */}
        <div className="atelier-ticker-track" aria-hidden="true">
          {tickerItems.map((item, index) => (
            <div key={`track3-${index}`} className="flex items-center">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#767872] hover:text-[#1B1C1A] transition-colors whitespace-nowrap px-6">
                {item}
              </span>
              <span className="text-[#A0A29C] text-[10px]">&bull;</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ArchivalTicker;
