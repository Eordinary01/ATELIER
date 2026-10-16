'use client';

import { useState, useEffect } from 'react';

export function LiveAtelierTime() {
  const [timeStr, setTimeStr] = useState<string>('');
  const [isCraftActive, setIsCraftActive] = useState<boolean>(true);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format Indian Standard Time (IST, UTC+5:30)
      const istString = now.toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      const istHour = parseInt(
        now.toLocaleTimeString('en-GB', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          hour12: false,
        }),
        10
      );

      setTimeStr(istString);
      // Active craft from 09:00 to 20:00 IST
      setIsCraftActive(istHour >= 9 && istHour < 20);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="flex items-center space-x-2 font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-[#767872] select-none"
      title="Live Studio Synchronization (New Delhi Atelier, IST)"
    >
      <style>{`
        @keyframes studio-pulse-green {
          0%, 100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(27, 59, 43, 0.6);
            opacity: 0.85;
          }
          50% {
            transform: scale(1.25);
            box-shadow: 0 0 0 5px rgba(27, 59, 43, 0.15);
            opacity: 1;
          }
        }
        @keyframes studio-pulse-nocturne {
          0%, 100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(90, 24, 39, 0.5);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.25);
            box-shadow: 0 0 0 4px rgba(90, 24, 39, 0.15);
            opacity: 1;
          }
        }
        .pulse-craft {
          animation: studio-pulse-green 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .pulse-nocturne {
          animation: studio-pulse-nocturne 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>

      {/* Ambient Breathing Artisan Pulse (Always Active) */}
      <span className="relative flex h-2.5 w-2.5 items-center justify-center">
        {isCraftActive ? (
          <span className="h-1.5 w-1.5 rounded-full bg-[#1B3B2B] pulse-craft" />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-[#5A1827] pulse-nocturne" />
        )}
      </span>

      <span className="text-[#1B1C1A] font-medium tabular-nums">
        New Delhi [{timeStr || '21:30:00'}]
      </span>
      <span className="text-[#A0A29C]">&bull;</span>
      <span className={isCraftActive ? 'text-[#1B3B2B] font-medium' : 'text-[#5A1827] font-medium'}>
        {isCraftActive ? 'Craft Active' : 'Studio Nocturne'}
      </span>
    </div>
  );
}

export default LiveAtelierTime;
