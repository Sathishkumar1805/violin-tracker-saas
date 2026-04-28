'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, LogOut } from 'lucide-react';
import {
  IS_MOCK, getSupabaseClient, getProfile, getProfileById,
  getSessions, getRewards, getAchievements,
} from '@/lib/supabase';
import {
  MOCK_PROFILE, MOCK_PROFILE_2, MOCK_SESSIONS, MOCK_SESSIONS_2,
  MOCK_REWARDS, MOCK_REWARDS_2, MOCK_ACHIEVEMENTS, MOCK_ACHIEVEMENTS_2,
} from '@/lib/mock-data';
import { calculateStreak, getWeekPracticeStatus, getPracticedMinutesToday, getPracticedMinutesThisMonth } from '@/lib/streak';
import { evaluateChallenges } from '@/lib/challenges';
import type { Profile, PracticeSession, Reward, Achievement } from '@/lib/types';
import StreakBanner   from '@/components/StreakBanner';
import ViolinProgress from '@/components/ViolinProgress';
import Timer          from '@/components/Timer';
import ChallengesTab  from '@/components/ChallengesTab';
import RewardStore    from '@/components/RewardStore';

type Tab = 'practice' | 'challenges' | 'rewards';

export default function PracticePage() {
  const router   = useRouter();
  const { childId } = useParams<{ childId: string }>();
  const params   = useSearchParams();
  const isMock   = IS_MOCK || params.get('mock') === 'true';

  const [child,        setChild]        = useState<Profile | null>(null);
  const [sessions,     setSessions]     = useState<PracticeSession[]>([]);
  const [rewards,      setRewards]      = useState<Reward[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [activeTab,    setActiveTab]    = useState<Tab>('practice');
  const [loading,      setLoading]      = useState(true);

  const loadData = useCallback(async () => {
    if (isMock) {
      // Support both mock children by id
      const mockChild = childId === 'mock-student-2' ? MOCK_PROFILE_2 : MOCK_PROFILE;
      const mockSess  = childId === 'mock-student-2' ? MOCK_SESSIONS_2  : MOCK_SESSIONS;
      const mockRew   = childId === 'mock-student-2' ? MOCK_REWARDS_2   : MOCK_REWARDS;
      const mockAch   = childId === 'mock-student-2' ? MOCK_ACHIEVEMENTS_2 : MOCK_ACHIEVEMENTS;
      setChild(mockChild); setSessions(mockSess); setRewards(mockRew); setAchievements(mockAch);
      setLoading(false);
      return;
    }

    const sb = getSupabaseClient();
    if (!sb) { router.push('/login'); return; }
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const parent = await getProfile(user.id);
    if (!parent || parent.role !== 'parent') { router.push('/login'); return; }

    const childProfile = await getProfileById(childId);
    if (!childProfile || childProfile.parent_id !== parent.id) {
      router.push('/parent');
      return;
    }

    const [s, r, a] = await Promise.all([
      getSessions(childId),
      getRewards(childId),
      getAchievements(childId),
    ]);
    setChild(childProfile); setSessions(s); setRewards(r); setAchievements(a);
    setLoading(false);
  }, [isMock, childId, router]);

  useEffect(() => { loadData(); }, [loadData]);

  const tz           = child?.timezone ?? 'America/Chicago';
  const streak       = calculateStreak(sessions, tz);
  const weekStatus   = getWeekPracticeStatus(sessions, tz);
  const minutesToday = getPracticedMinutesToday(sessions, tz);
  const goalMinutes  = child?.daily_goal_minutes ?? 20;
  const monthMinutes = getPracticedMinutesThisMonth(sessions, tz);
  const challenges   = evaluateChallenges(sessions, achievements, tz);

  function handleSessionComplete(session: PracticeSession, gemsEarned: number) {
    setSessions(prev => [session, ...prev]);
    setChild(prev => prev ? { ...prev, gems: prev.gems + gemsEarned } : prev);
  }

  function handleRewardRedeemed(rewardId: string) {
    const reward = rewards.find(r => r.id === rewardId);
    if (!reward || !child || child.gems < reward.gem_cost) return;
    setRewards(prev => prev.map(r => r.id === rewardId ? { ...r, redeemed_at: new Date().toISOString() } : r));
    setChild(prev => prev ? { ...prev, gems: prev.gems - reward.gem_cost } : prev);
  }

  if (loading) return (
    <div className="min-h-screen bg-violet-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-bounce">🎻</div>
        <p className="text-indigo-400 font-bold">Loading practice…</p>
      </div>
    </div>
  );
  if (!child) return null;

  return (
    <div className="min-h-screen bg-violet-50">
      <header className="bg-white border-b border-violet-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(isMock ? '/parent?mock=true' : '/parent')}
            className="p-2 rounded-xl text-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-lg shadow-sm">🎻</div>
          <div>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wide">Practice Mode</p>
            <p className="text-base font-black text-indigo-900 leading-tight" style={{ fontFamily: 'Nunito, sans-serif' }}>{child.display_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5">
            <span className="w-3.5 h-3.5 bg-amber-400 rounded-sm rotate-45 inline-block flex-shrink-0" />
            <span className="text-sm font-black text-amber-700" style={{ fontFamily: 'Nunito, sans-serif' }}>{child.gems}</span>
          </div>
          <button
            onClick={async () => { if (!isMock) await getSupabaseClient()?.auth.signOut(); router.push('/login'); }}
            className="p-2 rounded-xl text-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pb-24 space-y-3 pt-3">
        <StreakBanner streak={streak} weekStatus={weekStatus} />

        <div className="flex bg-white rounded-2xl p-1 border border-violet-100 shadow-sm">
          {(['practice', 'challenges', 'rewards'] as Tab[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-sm' : 'text-indigo-400'}`}
              style={{ fontFamily: 'Nunito, sans-serif' }}>
              {tab === 'practice' ? '🎻 Practice' : tab === 'challenges' ? '🏆 Challenges' : '🛍️ Rewards'}
            </button>
          ))}
        </div>

        {activeTab === 'practice' && (
          <>
            <ViolinProgress minutesToday={minutesToday} goalMinutes={goalMinutes} />
            <Timer profile={child} isMock={isMock} onSessionComplete={handleSessionComplete} />
          </>
        )}
        {activeTab === 'challenges' && (
          <ChallengesTab challenges={challenges} achievements={achievements} monthMinutes={monthMinutes} />
        )}
        {activeTab === 'rewards' && (
          <RewardStore rewards={rewards} gems={child.gems} isMock={isMock} onRedeem={handleRewardRedeemed} />
        )}
      </main>

      {isMock && (
        <div className="fixed bottom-0 left-0 right-0 bg-amber-500 text-white text-center py-2 text-xs font-bold z-20">
          🎭 Mock Mode — connect Supabase to save real data
        </div>
      )}
    </div>
  );
}
