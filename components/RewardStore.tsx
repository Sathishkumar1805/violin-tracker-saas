// components/RewardStore.tsx — Gem shop with pending/approved states
'use client';

import { useState } from 'react';
import { redeemReward as dbRedeem } from '@/lib/supabase';
import type { Reward } from '@/lib/types';

interface Props {
  rewards: Reward[];
  gems: number;
  isMock: boolean;
  onRedeem: (rewardId: string) => void;
}

// Short triangle-wave chirp on gem spend
function playGemSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.14);
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.start(); osc.stop(ctx.currentTime + 0.45);
  } catch { /* silently skip */ }
}

export default function RewardStore({ rewards, gems, isMock, onRedeem }: Props) {
  const [busy, setBusy]   = useState<string | null>(null);
  const [toast, setToast] = useState('');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function handleRedeem(reward: Reward) {
    if (reward.redeemed_at || busy) return;
    if (gems < reward.gem_cost) {
      showToast('Not enough gems yet — keep practicing! 🎻');
      return;
    }
    setBusy(reward.id);
    if (!isMock) await dbRedeem(reward.id);
    playGemSound();
    onRedeem(reward.id);
    showToast(`🌟 "${reward.title}" sent to Mom & Dad for approval!`);
    setBusy(null);
  }

  const available = rewards.filter((r) => r.is_active && !r.redeemed_at);
  const pending   = rewards.filter((r) => r.is_active && r.redeemed_at && !r.approved_at);
  const approved  = rewards.filter((r) => r.is_active && r.approved_at);

  return (
    <div className="space-y-3">
      {/* Balance chip */}
      <div className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-3xl p-4 text-white">
        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-100 mb-1">Your Balance</p>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 bg-white/30 rounded-md rotate-45 inline-block flex-shrink-0" />
          <span className="text-4xl font-black" style={{ fontFamily: 'Nunito, sans-serif' }}>{gems}</span>
          <span className="text-amber-100 font-semibold text-sm">gems</span>
        </div>
      </div>

      {/* Available rewards */}
      <div className="bg-white rounded-3xl p-4 border border-violet-100">
        <h3 className="text-sm font-black text-indigo-900 mb-3" style={{ fontFamily: 'Nunito, sans-serif' }}>
          Rewards from Mom &amp; Dad 🎁
        </h3>
        {available.length === 0 ? (
          <p className="text-center text-indigo-300 text-sm font-semibold py-4">
            No rewards yet — ask a parent to add some!
          </p>
        ) : (
          <div className="space-y-2">
            {available.map((r) => {
              const can = gems >= r.gem_cost;
              return (
                <button
                  key={r.id}
                  onClick={() => handleRedeem(r)}
                  disabled={!!busy}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all active:scale-95 ${
                    can
                      ? 'border-violet-100 bg-violet-50 hover:bg-indigo-50 hover:border-indigo-200'
                      : 'border-gray-100 bg-gray-50 opacity-55'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl border border-violet-100 shadow-sm flex-shrink-0">
                      {r.emoji}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-indigo-900 leading-tight">{r.title}</p>
                      {r.description && (
                        <p className="text-xs text-indigo-400 font-semibold mt-0.5">{r.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    <span className="w-3 h-3 bg-amber-400 rounded-sm rotate-45 inline-block" />
                    <span className="text-sm font-black text-amber-600" style={{ fontFamily: 'Nunito, sans-serif' }}>
                      {r.gem_cost}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending approval */}
      {pending.length > 0 && (
        <div className="bg-white rounded-3xl p-4 border border-amber-200">
          <h3 className="text-sm font-black text-indigo-900 mb-3" style={{ fontFamily: 'Nunito, sans-serif' }}>
            Waiting for Approval ⏳
          </h3>
          <div className="space-y-2">
            {pending.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-2xl bg-amber-50 border border-amber-100">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{r.emoji}</span>
                  <span className="text-sm font-bold text-amber-900">{r.title}</span>
                </div>
                <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-full">Pending</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved */}
      {approved.length > 0 && (
        <div className="bg-white rounded-3xl p-4 border border-green-200">
          <h3 className="text-sm font-black text-indigo-900 mb-3" style={{ fontFamily: 'Nunito, sans-serif' }}>
            Approved! 🎉
          </h3>
          <div className="space-y-2">
            {approved.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-2xl bg-green-50 border border-green-100">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{r.emoji}</span>
                  <span className="text-sm font-bold text-green-900">{r.title}</span>
                </div>
                <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">Approved ✓</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-xs text-indigo-300 font-semibold py-1">
        Redemptions need a parent&apos;s approval ✓
      </p>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 left-4 right-4 bg-indigo-900 text-white text-center py-3 px-4 rounded-2xl text-sm font-bold z-50 shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
