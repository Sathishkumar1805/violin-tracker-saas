// ─────────────────────────────────────────────────────────
// lib/supabase.ts  —  DB client + all data-access helpers
//
// MOCK MODE: when NEXT_PUBLIC_SUPABASE_URL is missing or
// starts with "your-", every helper returns empty/null and
// the app falls back to lib/mock-data.ts automatically.
// ─────────────────────────────────────────────────────────

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Profile, PracticeSession, Reward, Achievement } from './types';

// ── Mock-mode detection ───────────────────────────────────
export const IS_MOCK =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('your-') ||
  process.env.NEXT_PUBLIC_SUPABASE_URL === '';

// ── Singleton client factory ──────────────────────────────
let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (IS_MOCK) return null;
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return _client;
}

// ── Auth ──────────────────────────────────────────────────
export async function signInWithEmail(email: string, password: string) {
  const sb = getSupabaseClient();
  if (!sb) throw new Error('Supabase not configured');
  return sb.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
) {
  const sb = getSupabaseClient();
  if (!sb) throw new Error('Supabase not configured');
  return sb.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
}

export async function signOut() {
  const sb = getSupabaseClient();
  await sb?.auth.signOut();
}

// ── Profile ───────────────────────────────────────────────
// Looks up by auth_user_id (Supabase auth UUID), not profiles.id
export async function getProfile(authUserId: string): Promise<Profile | null> {
  const sb = getSupabaseClient();
  if (!sb) return null;
  const { data } = await sb
    .from('profiles')
    .select('*')
    .eq('auth_user_id', authUserId)
    .single();
  return data ?? null;
}

// Fetch by standalone profiles.id (used for child profiles)
export async function getProfileById(profileId: string): Promise<Profile | null> {
  const sb = getSupabaseClient();
  if (!sb) return null;
  const { data } = await sb
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single();
  return data ?? null;
}

export async function updateProfile(
  profileId: string,
  updates: Partial<Pick<Profile, 'display_name' | 'daily_goal_minutes' | 'timezone'>>,
): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) return;
  await sb.from('profiles').update(updates).eq('id', profileId);
}

// Uses SECURITY DEFINER RPC to bypass RLS for gem updates on child profiles
export async function updateGems(profileId: string, newTotal: number): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) return;
  await sb.rpc('set_gems', { p_user_id: profileId, p_amount: newTotal });
}

// ── Child management ──────────────────────────────────────
export async function getChildren(parentProfileId: string): Promise<Profile[]> {
  const sb = getSupabaseClient();
  if (!sb) return [];
  const { data } = await sb
    .from('profiles')
    .select('*')
    .eq('parent_id', parentProfileId)
    .eq('role', 'student')
    .order('created_at', { ascending: true });
  return data ?? [];
}

export async function createChildProfile(
  parentProfileId: string,
  displayName: string,
  dailyGoalMinutes = 20,
  timezone = 'America/Chicago',
): Promise<Profile | null> {
  const sb = getSupabaseClient();
  if (!sb) return null;
  const { data } = await sb
    .from('profiles')
    .insert({
      display_name: displayName,
      role: 'student',
      parent_id: parentProfileId,
      daily_goal_minutes: dailyGoalMinutes,
      timezone,
      auth_user_id: null,
    })
    .select()
    .single();
  return data ?? null;
}

export async function deleteChildProfile(childProfileId: string): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) return;
  await sb.from('profiles').delete().eq('id', childProfileId);
}

// ── Practice Sessions ─────────────────────────────────────
export async function getSessions(profileId: string): Promise<PracticeSession[]> {
  const sb = getSupabaseClient();
  if (!sb) return [];
  const { data } = await sb
    .from('practice_sessions')
    .select('*')
    .eq('user_id', profileId)
    .order('started_at', { ascending: false });
  return data ?? [];
}

export async function saveSession(
  session: Omit<PracticeSession, 'id' | 'created_at'>,
): Promise<PracticeSession | null> {
  const sb = getSupabaseClient();
  if (!sb) return null;
  const { data } = await sb.from('practice_sessions').insert(session).select().single();
  return data ?? null;
}

// ── Rewards ───────────────────────────────────────────────
export async function getRewards(forProfileId: string): Promise<Reward[]> {
  const sb = getSupabaseClient();
  if (!sb) return [];
  const { data } = await sb
    .from('rewards')
    .select('*')
    .eq('for_user', forProfileId)
    .order('gem_cost', { ascending: true });
  return data ?? [];
}

export async function createReward(
  reward: Omit<Reward, 'id' | 'created_at' | 'redeemed_at' | 'approved_at'>,
): Promise<Reward | null> {
  const sb = getSupabaseClient();
  if (!sb) return null;
  const { data } = await sb.from('rewards').insert(reward).select().single();
  return data ?? null;
}

export async function redeemReward(rewardId: string): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) return;
  await sb
    .from('rewards')
    .update({ redeemed_at: new Date().toISOString() })
    .eq('id', rewardId);
}

export async function approveReward(rewardId: string): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) return;
  await sb
    .from('rewards')
    .update({ approved_at: new Date().toISOString() })
    .eq('id', rewardId);
}

// ── Achievements ──────────────────────────────────────────
export async function getAchievements(profileId: string): Promise<Achievement[]> {
  const sb = getSupabaseClient();
  if (!sb) return [];
  const { data } = await sb
    .from('achievements')
    .select('*')
    .eq('user_id', profileId)
    .order('earned_at', { ascending: false });
  return data ?? [];
}

export async function saveAchievement(
  achievement: Omit<Achievement, 'id' | 'earned_at'>,
): Promise<void> {
  const sb = getSupabaseClient();
  if (!sb) return;
  await sb.from('achievements').upsert(achievement, { onConflict: 'user_id,type' });
}
