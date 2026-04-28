'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { IS_MOCK, getSupabaseClient, getProfile, createChildProfile } from '@/lib/supabase';
import { MOCK_PARENT_PROFILE } from '@/lib/mock-data';
import { ChevronRight, Music, Target } from 'lucide-react';

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'Europe/London',
  'Europe/Paris',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Australia/Sydney',
];

export default function OnboardingPage() {
  const router = useRouter();
  const params = useSearchParams();
  const isMock = IS_MOCK || params.get('mock') === 'true';

  const [parentId,  setParentId]  = useState<string | null>(null);
  const [childName, setChildName] = useState('');
  const [goalMins,  setGoalMins]  = useState(20);
  const [timezone,  setTimezone]  = useState('');
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimezone(tz);

    if (isMock) {
      setParentId(MOCK_PARENT_PROFILE.id);
      return;
    }
    (async () => {
      const sb = getSupabaseClient();
      if (!sb) { router.push('/login'); return; }
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const profile = await getProfile(user.id);
      if (!profile) { router.push('/login'); return; }
      setParentId(profile.id);
    })();
  }, [isMock, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!parentId) return;
    setSaving(true);
    setError('');

    if (isMock) {
      setTimeout(() => router.push('/parent?mock=true'), 800);
      return;
    }

    const child = await createChildProfile(parentId, childName.trim(), goalMins, timezone);
    setSaving(false);
    if (!child) {
      setError('Could not create child profile. Please try again.');
      return;
    }
    router.push('/parent');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-indigo-50 to-purple-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-500 shadow-lg shadow-emerald-200 mb-4">
            <span className="text-4xl">👶</span>
          </div>
          <h1 className="text-3xl font-black text-indigo-900" style={{ fontFamily: 'Nunito, sans-serif' }}>
            Add Your First Child
          </h1>
          <p className="text-indigo-400 font-semibold mt-1 text-sm">You can add more children later from the dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Child name */}
          <div className="bg-white rounded-3xl p-4 border border-violet-100 space-y-2">
            <label className="flex items-center gap-2 text-sm font-black text-indigo-900" style={{ fontFamily: 'Nunito, sans-serif' }}>
              <Music size={16} className="text-indigo-400" /> Child&apos;s Name
            </label>
            <input
              type="text"
              placeholder="e.g. Emma, Liam, Mia…"
              value={childName}
              onChange={e => setChildName(e.target.value)}
              required={!isMock}
              maxLength={40}
              className="w-full px-4 py-3 bg-violet-50 border border-violet-100 rounded-2xl text-sm font-medium placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Daily practice goal */}
          <div className="bg-white rounded-3xl p-4 border border-violet-100 space-y-3">
            <label className="flex items-center gap-2 text-sm font-black text-indigo-900" style={{ fontFamily: 'Nunito, sans-serif' }}>
              <Target size={16} className="text-indigo-400" /> Daily Practice Goal
            </label>
            <div className="flex gap-2 flex-wrap">
              {[10, 15, 20, 30, 45].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setGoalMins(m)}
                  className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${
                    goalMins === m
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-violet-50 text-indigo-500 border border-violet-100'
                  }`}
                  style={{ fontFamily: 'Nunito, sans-serif' }}
                >
                  {m} min
                </button>
              ))}
            </div>
          </div>

          {/* Timezone */}
          <div className="bg-white rounded-3xl p-4 border border-violet-100 space-y-2">
            <label className="text-sm font-black text-indigo-900" style={{ fontFamily: 'Nunito, sans-serif' }}>
              Timezone
            </label>
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="w-full px-4 py-3 bg-violet-50 border border-violet-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {TIMEZONES.includes(timezone) ? null : (
                <option value={timezone}>{timezone}</option>
              )}
              {TIMEZONES.map(tz => (
                <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-red-500 text-sm font-semibold text-center">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-2xl font-black text-base shadow-lg shadow-emerald-200 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ fontFamily: 'Nunito, sans-serif' }}
          >
            {saving ? '⏳ Setting up…' : <><span>Let&apos;s start practicing!</span><ChevronRight size={18} /></>}
          </button>
        </form>

        <p className="text-center text-xs text-indigo-300 mt-6 font-medium">
          You can edit these settings any time from the dashboard
        </p>
      </div>
    </div>
  );
}
