// components/ViolinProgress.tsx
// Animated SVG violin that fills with warm amber color as practice accumulates.
// Fill grows from the bottom; a shine overlay fades in above 60%; sparkles at 100%.
'use client';

import { useEffect, useRef } from 'react';

interface Props {
  minutesToday: number;
  goalMinutes: number;
}

export default function ViolinProgress({ minutesToday, goalMinutes }: Props) {
  const pct = Math.min(1, minutesToday / goalMinutes);

  // Violin body occupies y=20 to y=190 (170px tall in SVG coords)
  const BODY_TOP = 20;
  const BODY_BOTTOM = 190;
  const BODY_H = BODY_BOTTOM - BODY_TOP; // 170

  const fillPx = Math.round(BODY_H * pct);          // pixels filled from bottom
  const fillY  = BODY_BOTTOM - fillPx;              // rect's top edge

  const isComplete = pct >= 1;
  const shineOpacity = pct > 0.6 ? Math.min(1, (pct - 0.6) / 0.4) : 0;

  const milestones = [0.25, 0.5, 0.75, 1.0].map((p) => ({
    label: p < 1 ? `${Math.round(p * goalMinutes)}m` : 'Done!',
    hit: pct >= p,
  }));

  // Animate milestone star pop when newly hit
  const prevPct = useRef(pct);
  useEffect(() => {
    prevPct.current = pct;
  }, [pct]);

  return (
    <div className="bg-white rounded-3xl p-4 border border-violet-100 shadow-sm">
      {/* Header row */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-black text-sm text-indigo-900" style={{ fontFamily: 'Nunito, sans-serif' }}>
          Today&apos;s Practice
        </h2>
        <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full">
          {minutesToday} / {goalMinutes} min
        </span>
      </div>

      {/* SVG violin */}
      <div className="flex justify-center relative my-2">
        {/* Goal-complete glow ring */}
        {isComplete && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-36 h-36 rounded-full bg-amber-300/30 animate-glow-pulse" />
          </div>
        )}

        <svg width="110" height="200" viewBox="0 0 130 210" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {/* Clips all fill layers to the violin body shape */}
            <clipPath id="violin-body-clip">
              <path d="M65,20 C85,20 100,33 100,50 C100,63 92,70 92,80 C92,88 98,94 98,105 C98,116 92,122 92,130 C92,140 100,147 100,160 C100,177 85,190 65,190 C45,190 30,177 30,160 C30,147 38,140 38,130 C38,122 32,116 32,105 C32,94 38,88 38,80 C38,70 30,63 30,50 C30,33 45,20 65,20 Z" />
            </clipPath>
            <linearGradient id="wood-dark" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#7A4A10" />
              <stop offset="100%" stopColor="#5A3208" />
            </linearGradient>
            <linearGradient id="wood-amber" x1="0" y1="0" x2="0.8" y2="1">
              <stop offset="0%" stopColor="#F5C872" />
              <stop offset="100%" stopColor="#C17B2F" />
            </linearGradient>
            <linearGradient id="shine-grad" x1="0.3" y1="0" x2="0.7" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>

          {/* Dark base body (always visible) */}
          <path
            d="M65,20 C85,20 100,33 100,50 C100,63 92,70 92,80 C92,88 98,94 98,105 C98,116 92,122 92,130 C92,140 100,147 100,160 C100,177 85,190 65,190 C45,190 30,177 30,160 C30,147 38,140 38,130 C38,122 32,116 32,105 C32,94 38,88 38,80 C38,70 30,63 30,50 C30,33 45,20 65,20 Z"
            fill="url(#wood-dark)" stroke="#4A2008" strokeWidth="1.5"
          />

          {/* Amber fill — grows from the bottom */}
          <g clipPath="url(#violin-body-clip)">
            <rect x="0" y={fillY} width="130" height={fillPx} fill="url(#wood-amber)" />
          </g>

          {/* Shine overlay — fades in when >60% full */}
          {shineOpacity > 0 && (
            <g clipPath="url(#violin-body-clip)">
              <rect
                x="30" y="25" width="40" height="110"
                fill="url(#shine-grad)"
                rx="18"
                opacity={shineOpacity}
              />
            </g>
          )}

          {/* Body outline (on top of fill) */}
          <path
            d="M65,20 C85,20 100,33 100,50 C100,63 92,70 92,80 C92,88 98,94 98,105 C98,116 92,122 92,130 C92,140 100,147 100,160 C100,177 85,190 65,190 C45,190 30,177 30,160 C30,147 38,140 38,130 C38,122 32,116 32,105 C32,94 38,88 38,80 C38,70 30,63 30,50 C30,33 45,20 65,20 Z"
            fill="none" stroke="#3A1A08" strokeWidth="2"
          />

          {/* F-holes */}
          <path d="M52,95 C52,90 56,87 56,92 C56,97 52,100 52,105 C52,108 54,110 54,113" fill="none" stroke="#2A1008" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M78,95 C78,90 74,87 74,92 C74,97 78,100 78,105 C78,108 76,110 76,113" fill="none" stroke="#2A1008" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="52" cy="88" r="2.5" fill="#2A1008" />
          <circle cx="54" cy="115" r="2.5" fill="#2A1008" />
          <circle cx="78" cy="88" r="2.5" fill="#2A1008" />
          <circle cx="76" cy="115" r="2.5" fill="#2A1008" />

          {/* Neck */}
          <path d="M57,20 L57,3 L73,3 L73,20" fill="#8B6914" stroke="#5A3208" strokeWidth="1.2" />
          {/* Scroll */}
          <ellipse cx="65" cy="3" rx="12" ry="5" fill="#8B6914" stroke="#5A3208" strokeWidth="1" />

          {/* Tailpiece */}
          <path d="M55,185 L75,185 L70,200 L60,200 Z" fill="#5A3208" stroke="#3A2008" strokeWidth="1" />

          {/* Strings */}
          {[59, 63, 67, 71].map((x) => (
            <line key={x} x1={x} y1="5" x2={x} y2="193" stroke="#C8B89A" strokeWidth="0.8" opacity="0.65" />
          ))}

          {/* Bridge */}
          <rect x="56" y="103" width="18" height="4" rx="1" fill="#D4A853" stroke="#8B6914" strokeWidth="0.8" />

          {/* Tuning pegs */}
          {[{ cx: 57, cy: 7 }, { cx: 63, cy: 5 }, { cx: 67, cy: 5 }, { cx: 73, cy: 7 }].map((p, i) => (
            <circle key={i} cx={p.cx} cy={p.cy} r="2.5" fill="#C89A4A" stroke="#8B6914" strokeWidth="0.8" />
          ))}

          {/* Sparkles at 100% */}
          {isComplete && (
            <>
              <text x="13" y="52" fontSize="14" textAnchor="middle">✦</text>
              <text x="117" y="62" fontSize="11" textAnchor="middle">✦</text>
              <text x="11" y="148" fontSize="10" textAnchor="middle">✦</text>
              <text x="119" y="152" fontSize="14" textAnchor="middle">✦</text>
            </>
          )}
        </svg>
      </div>

      {/* Progress label */}
      <p className="text-center text-sm font-bold text-indigo-400 mt-1">
        {isComplete
          ? '🎉 Goal smashed! Amazing work!'
          : `Keep going! ${minutesToday} of ${goalMinutes} min`}
      </p>

      {/* Milestone stars */}
      <div className="flex justify-around mt-3">
        {milestones.map(({ label, hit }) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <span className={`text-xl transition-all duration-300 ${hit ? 'opacity-100' : 'opacity-20'}`}>
              ⭐
            </span>
            <span className="text-[10px] font-bold text-indigo-300">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
