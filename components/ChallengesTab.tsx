// components/ChallengesTab.tsx — Weekly/monthly challenges + badges
'use client';

import type { Challenge, Achievement } from '@/lib/types';

interface Props {
  challenges: Challenge[];
  achievements: Achievement[];
  monthMinutes: number;
}

const BADGE_LABELS: Record<string, string> = {
  first_session: 'First Note',
  streak_3: '3-Day Flame',
  streak_5: '5-Day Hero',
  monthly_5h: '5-Hr Month',
  monthly_10h: '10-Hr Hero',
};
const BADGE_EMOJI: Record<string, string> = {
  first_session: '🎵', streak_3: '🔥', streak_5: '🏆',
  monthly_5h: '⭐', monthly_10h: '🌟',
};

export default function ChallengesTab({ challenges, achievements, monthMinutes }: Props) {
  const earnedIds = new Set([
    ...achievements.map((a) => a.type),
    ...challenges.filter((c) => c.completed).map((c) => c.id),
  ]);

  return (
    <div className="space-y-3">
      {/* Challenge cards (2-column grid) */}
      <div className="grid grid-cols-2 gap-3">
        {challenges.map((ch) => {
          const pct = Math.min(100, Math.round((ch.current / ch.target) * 100));
          return (
            <div
              key={ch.id}
              className={`rounded-2xl p-4 border ${
                ch.completed
                  ? 'bg-amber-50 border-amber-300'
                  : 'bg-white border-violet-100'
              }`}
            >
              <span className="text-2xl block mb-1 leading-none">{ch.emoji}</span>
              <p
                className="text-xs font-black text-indigo-900 leading-tight mb-1"
                style={{ fontFamily: 'Nunito, sans-serif' }}
              >
                {ch.title}
              </p>
              <p className="text-xs text-indigo-400 font-semibold mb-2">
                {ch.completed ? 'Completed! ✓' : `${ch.current} / ${ch.target}`}
              </p>
              <div className="h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    ch.completed ? 'bg-amber-400' : 'bg-indigo-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {!ch.completed && (
                <span className="inline-block mt-2 text-xs font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">
                  +{ch.gemsReward} 💎
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Badge cabinet */}
      <div className="bg-white rounded-3xl p-4 border border-violet-100">
        <h3 className="text-sm font-black text-indigo-900 mb-3" style={{ fontFamily: 'Nunito, sans-serif' }}>
          Badges Earned
        </h3>
        <div className="flex gap-5 flex-wrap">
          {Object.entries(BADGE_EMOJI).map(([type, emoji]) => {
            const earned = earnedIds.has(type);
            return (
              <div key={type} className="text-center">
                <div className={`text-3xl leading-none ${earned ? '' : 'grayscale opacity-20'}`}>
                  {emoji}
                </div>
                <p
                  className={`text-[10px] font-bold mt-1 ${earned ? 'text-amber-600' : 'text-indigo-200'}`}
                >
                  {BADGE_LABELS[type]}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Monthly total */}
      <div className="bg-indigo-600 rounded-3xl p-4 text-white">
        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200 mb-1">
          This Month
        </p>
        <p className="text-3xl font-black" style={{ fontFamily: 'Nunito, sans-serif' }}>
          {Math.floor(monthMinutes / 60)}h {monthMinutes % 60}m
        </p>
        <p className="text-xs text-indigo-300 font-semibold mt-0.5">total practice time</p>
      </div>
    </div>
  );
}
