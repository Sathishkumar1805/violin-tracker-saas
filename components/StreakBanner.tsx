// components/StreakBanner.tsx — Streak + week-dot banner
'use client';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface Props {
  streak: number;
  weekStatus: boolean[]; // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
}

export default function StreakBanner({ streak, weekStatus }: Props) {
  // Which index is today (Mon=0, Sun=6)
  const dow = new Date().getDay();
  const todayIdx = dow === 0 ? 6 : dow - 1;

  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-4 text-white shadow-lg shadow-indigo-200 relative overflow-hidden">
      {/* Decorative background circle */}
      <div className="absolute -right-6 -top-6 w-28 h-28 bg-white/10 rounded-full pointer-events-none" />

      <div className="flex items-center justify-between relative z-10">
        {/* Streak count */}
        <div className="flex items-center gap-3">
          <span className="text-4xl animate-flame inline-block select-none">🔥</span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
              Current Streak
            </p>
            <p className="text-4xl font-black leading-none" style={{ fontFamily: 'Nunito, sans-serif' }}>
              {streak}
            </p>
            <p className="text-xs font-semibold text-white/80 mt-0.5">
              {streak === 1 ? 'day in a row' : 'days in a row'}
            </p>
          </div>
        </div>

        {/* Week dots */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 text-right mb-2">
            This Week
          </p>
          <div className="flex gap-1.5">
            {weekStatus.map((done, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all select-none ${
                  done
                    ? 'bg-yellow-300 text-yellow-800 shadow shadow-yellow-400/40'
                    : i === todayIdx
                    ? 'bg-white/90 text-indigo-600 scale-110'
                    : 'bg-white/20 text-white/50'
                }`}
                style={{ fontFamily: 'Nunito, sans-serif' }}
              >
                {done ? '✓' : DAY_LABELS[i]}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
