'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Plus, LogOut, Play, UserPlus, Trash2, Copy, RefreshCw, Pencil, X } from 'lucide-react';
import {
  IS_MOCK, getSupabaseClient, getProfile, getChildren,
  getSessions, getRewards, approveReward, createReward, updateReward,
  createChildProfile, deleteChildProfile, generateFamilyCode,
} from '@/lib/supabase';
import {
  MOCK_PARENT_PROFILE, MOCK_CHILDREN,
  MOCK_SESSIONS, MOCK_SESSIONS_2,
  MOCK_REWARDS, MOCK_REWARDS_2,
} from '@/lib/mock-data';
import { calculateStreak, getPracticedMinutesToday, getPracticedMinutesThisMonth } from '@/lib/streak';
import type { Profile, PracticeSession, Reward } from '@/lib/types';
import DonationBanner from '@/components/DonationBanner';
import WeeklyHistory from '@/components/WeeklyHistory';

const EMOJI_OPTS = ['🎬','🎮','🍦','🍕','🌙','🎁','🏖️','🍫','📚','🎪'];

export default function ParentClient() {
  const router = useRouter();
  const params = useSearchParams();
  const isMock = IS_MOCK || params.get('mock') === 'true';

  const [parent,        setParent]        = useState<Profile | null>(null);
  const [children,      setChildren]      = useState<Profile[]>([]);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [sessions,      setSessions]      = useState<PracticeSession[]>([]);
  const [rewards,       setRewards]       = useState<Reward[]>([]);
  const [loading,       setLoading]       = useState(true);

  // Reward form
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [title,    setTitle]    = useState('');
  const [desc,     setDesc]     = useState('');
  const [cost,     setCost]     = useState(50);
  const [emoji,    setEmoji]    = useState('🎁');
  const [saving,   setSaving]   = useState(false);

  // Family code
  const [familyCode,     setFamilyCode]     = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [codeCopied,     setCodeCopied]     = useState(false);

  const [weekOffset, setWeekOffset] = useState(0);

  // Push notifications
  const [pushEnabled,   setPushEnabled]   = useState(false);
  const [pushLoading,   setPushLoading]   = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushError,     setPushError]     = useState<string | null>(null);

  // Reward editing
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc,  setEditDesc]  = useState('');
  const [editCost,  setEditCost]  = useState(50);
  const [editEmoji, setEditEmoji] = useState('🎁');
  const [editSaving, setEditSaving] = useState(false);

  // Add child form
  const [showAddChild, setShowAddChild] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [newChildGoal, setNewChildGoal] = useState(20);
  const [addingChild,  setAddingChild]  = useState(false);

  const activeChild = children.find(c => c.id === activeChildId) ?? null;

  const loadChildData = useCallback(async (childId: string) => {
    if (isMock) {
      setSessions(childId === 'mock-student-2' ? MOCK_SESSIONS_2 : MOCK_SESSIONS);
      setRewards(childId === 'mock-student-2'  ? MOCK_REWARDS_2  : MOCK_REWARDS);
      return;
    }
    const [s, r] = await Promise.all([getSessions(childId), getRewards(childId)]);
    setSessions(s); setRewards(r);
  }, [isMock]);

  const loadData = useCallback(async () => {
    if (isMock) {
      setParent(MOCK_PARENT_PROFILE);
      setChildren(MOCK_CHILDREN);
      setActiveChildId(MOCK_CHILDREN[0]?.id ?? null);
      setSessions(MOCK_SESSIONS);
      setRewards(MOCK_REWARDS);
      setLoading(false);
      return;
    }
    const sb = getSupabaseClient();
    if (!sb) { router.push('/login'); return; }
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { router.push('/login'); return; }
    const p = await getProfile(user.id);
    if (!p || p.role !== 'parent') { router.push('/dashboard'); return; }
    const kids = await getChildren(p.id);
    setParent(p);
    setFamilyCode(p.family_code ?? null);
    setChildren(kids);
    if (kids.length === 0) { router.push('/onboarding'); return; }
    const first = kids[0];
    setActiveChildId(first.id);
    const [s, r] = await Promise.all([getSessions(first.id), getRewards(first.id)]);
    setSessions(s); setRewards(r);
    setLoading(false);
  }, [isMock, router]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const hasVapid = !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const hasBrowserSupport = 'serviceWorker' in navigator && 'PushManager' in window;
    setPushSupported(hasVapid && hasBrowserSupport);
    if (hasVapid && hasBrowserSupport) {
      import('@/lib/push').then(({ checkPushStatus }) => checkPushStatus().then(setPushEnabled));
    }
  }, []);

  async function handleTogglePush() {
    if (!parent || !pushSupported) return;
    setPushLoading(true);
    setPushError(null);
    const { subscribeToPush, unsubscribeFromPush } = await import('@/lib/push');
    if (pushEnabled) {
      await unsubscribeFromPush(parent.id);
      setPushEnabled(false);
    } else {
      const ok = await subscribeToPush(parent.id);
      if (!ok) {
        const blocked = Notification.permission === 'denied';
        setPushError(blocked ? 'Notifications blocked — check browser settings' : 'Could not enable reminders');
      }
      setPushEnabled(ok);
    }
    setPushLoading(false);
  }

  async function handleSelectChild(childId: string) {
    setActiveChildId(childId);
    setWeekOffset(0);
    await loadChildData(childId);
  }

  async function handleAddChild(e: React.FormEvent) {
    e.preventDefault();
    if (!parent) return;
    setAddingChild(true);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (isMock) {
      const fake: Profile = {
        id: `mock-student-${Date.now()}`, auth_user_id: null,
        display_name: newChildName, role: 'student', parent_id: parent.id,
        daily_goal_minutes: newChildGoal, gems: 0, timezone: tz,
        family_code: null, mascot_type: null,
        created_at: new Date().toISOString(),
      };
      setChildren(prev => [...prev, fake]);
      setActiveChildId(fake.id);
      setSessions([]); setRewards([]);
    } else {
      const child = await createChildProfile(parent.id, newChildName.trim(), newChildGoal, tz);
      if (child) {
        setChildren(prev => [...prev, child]);
        setActiveChildId(child.id);
        setSessions([]); setRewards([]);
      }
    }
    setNewChildName(''); setNewChildGoal(20); setShowAddChild(false); setAddingChild(false);
  }

  async function handleDeleteChild(childId: string) {
    if (!confirm('Remove this child? All their practice data will be deleted.')) return;
    if (!isMock) await deleteChildProfile(childId);
    const remaining = children.filter(c => c.id !== childId);
    setChildren(remaining);
    if (activeChildId === childId) {
      const next = remaining[0] ?? null;
      setActiveChildId(next?.id ?? null);
      if (next) await loadChildData(next.id);
      else { setSessions([]); setRewards([]); }
    }
  }

  async function handleApprove(id: string) {
    if (!isMock) await approveReward(id);
    setRewards(prev => prev.map(r => r.id === id ? { ...r, approved_at: new Date().toISOString() } : r));
  }

  async function handleAddReward(e: React.FormEvent) {
    e.preventDefault();
    if (!activeChild || !parent) return;
    setSaving(true);
    const draft: Reward = {
      id: `r-${Date.now()}`, created_by: parent.id, for_user: activeChild.id,
      title, description: desc || null, gem_cost: cost, emoji,
      is_active: true, redeemed_at: null, approved_at: null,
      created_at: new Date().toISOString(),
    };
    if (!isMock) {
      const saved = await createReward({
        created_by: parent.id, for_user: activeChild.id,
        title, description: desc || null, gem_cost: cost, emoji, is_active: true,
      });
      if (saved) draft.id = saved.id;
    }
    setRewards(prev => [...prev, draft]);
    setTitle(''); setDesc(''); setCost(50); setEmoji('🎁');
    setShowRewardForm(false); setSaving(false);
  }

  function startEditReward(r: Reward) {
    setEditingRewardId(r.id);
    setEditTitle(r.title);
    setEditDesc(r.description ?? '');
    setEditCost(r.gem_cost);
    setEditEmoji(r.emoji);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingRewardId) return;
    setEditSaving(true);
    const updates = { title: editTitle, description: editDesc || null, gem_cost: editCost, emoji: editEmoji };
    if (!isMock) await updateReward(editingRewardId, updates);
    setRewards(prev => prev.map(r => r.id === editingRewardId ? { ...r, ...updates } : r));
    setEditingRewardId(null);
    setEditSaving(false);
  }

  async function handleGenerateCode() {
    if (!parent) return;
    setGeneratingCode(true);
    const code = isMock ? 'VLN4X2' : await generateFamilyCode(parent.id);
    if (code) setFamilyCode(code);
    setGeneratingCode(false);
  }

  async function handleCopyCode() {
    if (!familyCode) return;
    await navigator.clipboard.writeText(familyCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }

  if (loading) return (
    <div className="min-h-screen bg-violet-50 flex items-center justify-center">
      <div className="text-center"><div className="text-5xl mb-4">👩‍👧</div><p className="text-indigo-400 font-bold">Loading…</p></div>
    </div>
  );

  const tz        = activeChild?.timezone ?? 'America/Chicago';
  const streak    = calculateStreak(sessions, tz);
  const todayMins = getPracticedMinutesToday(sessions, tz);
  const monthMins = getPracticedMinutesThisMonth(sessions, tz);
  const pending   = rewards.filter(r => r.redeemed_at && !r.approved_at);

  return (
    <div className="min-h-screen bg-violet-50">
      {/* Header */}
      <header className="bg-white border-b border-violet-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-lg shadow-sm">👩‍👧</div>
          <div>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wide">Parent Dashboard</p>
            <p className="text-base font-black text-indigo-900 leading-tight" style={{ fontFamily: 'Nunito, sans-serif' }}>
              {parent?.display_name ?? 'My Family'}
            </p>
          </div>
        </div>
        <button onClick={async () => { if (!isMock) await getSupabaseClient()?.auth.signOut(); router.push('/login'); }}
          className="p-2 rounded-xl text-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
          <LogOut size={18} />
        </button>
      </header>

      <main className="max-w-md mx-auto px-4 py-4 space-y-4 pb-16">

        {/* ── Child selector ─────────────────────────────── */}
        <div className="bg-white rounded-3xl p-4 border border-violet-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-indigo-900" style={{ fontFamily: 'Nunito, sans-serif' }}>My Children</h3>
            <button onClick={() => setShowAddChild(v => !v)}
              className="flex items-center gap-1 text-xs font-black text-indigo-500 hover:text-indigo-700 px-2 py-1 rounded-xl hover:bg-indigo-50 transition-colors"
              style={{ fontFamily: 'Nunito, sans-serif' }}>
              <UserPlus size={14} /> Add Child
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {children.map(c => (
              <div key={c.id} className="flex items-center gap-1">
                <button onClick={() => handleSelectChild(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-black transition-all ${activeChildId === c.id ? 'bg-indigo-600 text-white shadow-sm' : 'bg-violet-50 text-indigo-500 border border-violet-100'}`}
                  style={{ fontFamily: 'Nunito, sans-serif' }}>
                  {c.display_name}
                </button>
                {children.length > 1 && (
                  <button onClick={() => handleDeleteChild(c.id)}
                    className="p-1 text-indigo-200 hover:text-rose-400 transition-colors rounded-lg hover:bg-rose-50">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {showAddChild && (
            <form onSubmit={handleAddChild} className="mt-3 bg-violet-50 rounded-2xl p-3 border border-violet-100 space-y-3">
              <input type="text" placeholder="Child's name" value={newChildName}
                onChange={e => setNewChildName(e.target.value)} required={!isMock}
                className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <div>
                <p className="text-xs font-bold text-indigo-400 mb-1">Daily goal</p>
                <div className="flex gap-2">
                  {[10, 15, 20, 30].map(m => (
                    <button key={m} type="button" onClick={() => setNewChildGoal(m)}
                      className={`px-3 py-1 rounded-xl text-xs font-black ${newChildGoal === m ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-400 border border-violet-100'}`}
                      style={{ fontFamily: 'Nunito, sans-serif' }}>{m}m</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowAddChild(false)}
                  className="flex-1 py-2 rounded-xl border border-violet-200 text-sm font-bold text-indigo-400">Cancel</button>
                <button type="submit" disabled={addingChild}
                  className="flex-1 py-2 bg-emerald-500 text-white rounded-xl text-sm font-black active:scale-95 disabled:opacity-60"
                  style={{ fontFamily: 'Nunito, sans-serif' }}>{addingChild ? 'Adding…' : 'Add'}</button>
              </div>
            </form>
          )}
        </div>

        {/* ── Family Code ───────────────────────────────── */}
        <div className="bg-white rounded-3xl p-4 border border-violet-100">
          <h3 className="text-sm font-black text-indigo-900 mb-1" style={{ fontFamily: 'Nunito, sans-serif' }}>Family Code</h3>
          <p className="text-xs text-indigo-400 font-medium mb-3">Share this code with your child so they can join your family on their own account.</p>
          {familyCode ? (
            <div className="flex items-center gap-2">
              <span className="flex-1 text-center text-2xl font-black tracking-widest text-indigo-900 bg-violet-50 border border-violet-200 rounded-2xl py-2 px-4" style={{ fontFamily: 'monospace' }}>
                {familyCode}
              </span>
              <button onClick={handleCopyCode}
                className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition-all"
                title="Copy code">
                <Copy size={16} />
              </button>
              <button onClick={handleGenerateCode} disabled={generatingCode}
                className="p-2.5 rounded-xl bg-violet-100 text-indigo-500 hover:bg-violet-200 active:scale-95 transition-all disabled:opacity-50"
                title="Generate new code">
                <RefreshCw size={16} className={generatingCode ? 'animate-spin' : ''} />
              </button>
            </div>
          ) : (
            <button onClick={handleGenerateCode} disabled={generatingCode}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-2xl text-sm font-black transition-all disabled:opacity-60"
              style={{ fontFamily: 'Nunito, sans-serif' }}>
              {generatingCode ? '⏳ Generating…' : '🔑 Generate Code'}
            </button>
          )}
          {codeCopied && <p className="text-xs text-green-600 font-bold text-center mt-2">Copied!</p>}
        </div>

        {/* ── Practice Mode button ───────────────────────── */}
        {activeChild && (
          <button
            onClick={() => router.push(isMock ? `/practice/${activeChild.id}?mock=true` : `/practice/${activeChild.id}`)}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-2xl font-black text-base shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
            style={{ fontFamily: 'Nunito, sans-serif' }}>
            <Play size={18} fill="white" />
            Open Practice Mode for {activeChild.display_name}
          </button>
        )}

        {activeChild ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon:'🔥', val: String(streak),                             label:'day streak' },
                { icon:'⏱️', val:`${todayMins}m`,                            label:'today'      },
                { icon:'📅', val:`${Math.floor(monthMins/60)}h${monthMins%60}m`, label:'this month' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl p-3 border border-violet-100 text-center">
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <p className="text-xl font-black text-indigo-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{s.val}</p>
                  <p className="text-xs text-indigo-400 font-semibold">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Weekly history with navigation */}
            <WeeklyHistory
              sessions={sessions}
              timezone={tz}
              weekOffset={weekOffset}
              onWeekChange={setWeekOffset}
              goalMinutes={activeChild.daily_goal_minutes ?? 20}
              childName={activeChild.display_name}
            />

            {/* Pending approvals */}
            {pending.length > 0 && (
              <div className="bg-amber-50 rounded-3xl p-4 border border-amber-200">
                <h3 className="text-sm font-black text-amber-800 mb-3" style={{ fontFamily: 'Nunito, sans-serif' }}>⏳ Approval Needed ({pending.length})</h3>
                <div className="space-y-2">
                  {pending.map(r => (
                    <div key={r.id} className="flex items-center justify-between bg-white rounded-2xl p-3 border border-amber-100">
                      <div className="flex items-center gap-2"><span className="text-xl">{r.emoji}</span><span className="text-sm font-bold text-indigo-900">{r.title}</span></div>
                      <button onClick={() => handleApprove(r.id)}
                        className="flex items-center gap-1 bg-green-500 text-white px-3 py-1.5 rounded-xl text-xs font-black active:scale-95"
                        style={{ fontFamily: 'Nunito, sans-serif' }}>
                        <CheckCircle size={14} /> Approve
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rewards */}
            <div className="bg-white rounded-3xl p-4 border border-violet-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black text-indigo-900" style={{ fontFamily: 'Nunito, sans-serif' }}>Rewards for {activeChild.display_name}</h3>
                <button onClick={() => setShowRewardForm(v => !v)}
                  className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-xs font-black active:scale-95"
                  style={{ fontFamily: 'Nunito, sans-serif' }}>
                  <Plus size={14} /> Add
                </button>
              </div>
              {showRewardForm && (
                <form onSubmit={handleAddReward} className="bg-violet-50 rounded-2xl p-3 mb-3 space-y-3 border border-violet-100">
                  <div>
                    <label className="text-xs font-bold text-indigo-500 mb-1 block">Reward Name *</label>
                    <input type="text" placeholder="e.g. Pick Friday movie" value={title} onChange={e => setTitle(e.target.value)} required
                      className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-indigo-500 mb-1 block">Description</label>
                    <input type="text" placeholder="Any details…" value={desc} onChange={e => setDesc(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs font-bold text-indigo-500 mb-1 block">Gem Cost</label>
                      <input type="number" min={10} max={500} step={10} value={cost} onChange={e => setCost(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-bold text-indigo-500 mb-1 block">Icon</label>
                      <select value={emoji} onChange={e => setEmoji(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400">
                        {EMOJI_OPTS.map(em => <option key={em} value={em}>{em}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowRewardForm(false)}
                      className="flex-1 py-2 rounded-xl border border-violet-200 text-sm font-bold text-indigo-400">Cancel</button>
                    <button type="submit" disabled={saving}
                      className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-black active:scale-95 disabled:opacity-60"
                      style={{ fontFamily: 'Nunito, sans-serif' }}>{saving ? 'Saving…' : 'Add Reward'}</button>
                  </div>
                </form>
              )}
              <div className="space-y-2">
                {rewards.filter(r => r.is_active).map(r => (
                  <div key={r.id}>
                    {editingRewardId === r.id ? (
                      <form onSubmit={handleSaveEdit} className="bg-violet-50 rounded-2xl p-3 border border-indigo-200 space-y-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-black text-indigo-500">Edit Reward</p>
                          <button type="button" onClick={() => setEditingRewardId(null)} className="text-indigo-300 hover:text-indigo-500"><X size={14} /></button>
                        </div>
                        <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} required
                          className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                        <input type="text" placeholder="Description" value={editDesc} onChange={e => setEditDesc(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <label className="text-xs font-bold text-indigo-500 mb-1 block">Gem Cost</label>
                            <input type="number" min={10} max={500} step={10} value={editCost} onChange={e => setEditCost(Number(e.target.value))}
                              className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                          </div>
                          <div className="flex-1">
                            <label className="text-xs font-bold text-indigo-500 mb-1 block">Icon</label>
                            <select value={editEmoji} onChange={e => setEditEmoji(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl border border-violet-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400">
                              {EMOJI_OPTS.map(em => <option key={em} value={em}>{em}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setEditingRewardId(null)}
                            className="flex-1 py-2 rounded-xl border border-violet-200 text-sm font-bold text-indigo-400">Cancel</button>
                          <button type="submit" disabled={editSaving}
                            className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-black active:scale-95 disabled:opacity-60"
                            style={{ fontFamily: 'Nunito, sans-serif' }}>{editSaving ? 'Saving…' : 'Save'}</button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-violet-50 border border-violet-100">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{r.emoji}</span>
                          <div><p className="text-sm font-bold text-indigo-900">{r.title}</p><p className="text-xs text-indigo-400 font-semibold">{r.gem_cost} gems</p></div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${r.approved_at ? 'bg-green-100 text-green-600' : r.redeemed_at ? 'bg-amber-100 text-amber-600' : 'bg-violet-100 text-violet-500'}`}>
                            {r.approved_at ? '✓ Done' : r.redeemed_at ? 'Pending' : 'Active'}
                          </span>
                          {!r.redeemed_at && (
                            <button onClick={() => startEditReward(r)}
                              className="p-1.5 rounded-lg text-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Edit reward">
                              <Pencil size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {rewards.filter(r => r.is_active).length === 0 && (
                  <p className="text-sm text-indigo-300 font-semibold text-center py-2">No rewards yet — add one!</p>
                )}
              </div>
            </div>

            {/* Recent sessions */}
            <div className="bg-white rounded-3xl p-4 border border-violet-100">
              <h3 className="text-sm font-black text-indigo-900 mb-3" style={{ fontFamily: 'Nunito, sans-serif' }}>Recent Sessions</h3>
              {sessions.slice(0, 7).map(s => {
                const dur = s.duration_seconds ?? 0;
                return (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b border-violet-50 last:border-0">
                    <span className="text-sm font-semibold text-indigo-700">
                      {new Date(s.started_at).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })}
                    </span>
                    <span className="text-sm font-black text-indigo-900" style={{ fontFamily: 'Nunito, sans-serif' }}>
                      {Math.floor(dur/60)}m {dur%60}s
                    </span>
                  </div>
                );
              })}
              {sessions.length === 0 && <p className="text-sm text-indigo-300 font-semibold text-center py-2">No sessions yet</p>}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-3xl p-8 border border-violet-100 text-center">
            <div className="text-5xl mb-3">👶</div>
            <p className="text-indigo-900 font-black text-base mb-1" style={{ fontFamily: 'Nunito, sans-serif' }}>No children yet</p>
            <p className="text-indigo-400 text-sm font-medium">Use &quot;Add Child&quot; above to get started.</p>
          </div>
        )}

        {/* Practice notifications toggle */}
        <div className="bg-white px-4 py-3 rounded-2xl border border-violet-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{pushEnabled ? '🔔' : '🔕'}</span>
              <div>
                <p className="text-xs font-black text-indigo-900">Practice notifications</p>
                <p className="text-[10px] text-indigo-400 font-medium">
                  {!pushSupported ? 'Not available in this browser' : "Get notified when your child practices"}
                </p>
              </div>
            </div>
            <button onClick={handleTogglePush} disabled={pushLoading || !pushSupported}
              className={`relative w-11 h-6 rounded-full transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${pushEnabled ? 'bg-indigo-600' : 'bg-indigo-200'}`}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${pushEnabled ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
          {pushError && <p className="text-[10px] text-red-500 font-semibold mt-1.5">{pushError}</p>}
        </div>

        {/* Donation */}
        <DonationBanner />
      </main>

      {isMock && <div className="fixed bottom-0 left-0 right-0 bg-amber-500 text-white text-center py-2 text-xs font-bold z-20">🎭 Mock Mode</div>}
    </div>
  );
}
