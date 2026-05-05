// Supabase Edge Function — send daily practice reminders via Web Push
//
// Deploy:  supabase functions deploy send-reminders
// Trigger: Supabase Dashboard → Edge Functions → Cron  (daily at 17:00 UTC)
//          or Vercel cron → POST https://<project>.supabase.co/functions/v1/send-reminders
//
// Required env vars (set in Supabase Dashboard → Settings → Edge Functions):
//   VAPID_PUBLIC_KEY   — from: npx web-push generate-vapid-keys
//   VAPID_PRIVATE_KEY  — from: npx web-push generate-vapid-keys
//   VAPID_SUBJECT      — mailto:you@example.com
//   CRON_SECRET        — a random string to authenticate cron calls

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @ts-ignore — npm: specifier supported in Supabase Deno runtime
import webpush from 'npm:web-push';

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC_KEY      = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY     = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT         = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:support@violintracker.app';
const CRON_SECRET           = Deno.env.get('CRON_SECRET');

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const MASCOT_MESSAGES: Record<string, {
  title: string;
  body: (name: string, streak: number) => string;
}> = {
  bird:   { title: '🐦 Chirpy needs you!',   body: (n, s) => s > 0 ? `Chirpy is worried! ${n}'s ${s}-day streak is at risk! 😟` : `Chirpy says it's time to practice, ${n}! 🎻` },
  dog:    { title: '🐶 Buddy is waiting!',    body: (n, s) => s > 0 ? `Buddy is pacing around! Don't break ${n}'s ${s}-day streak! 😟` : `Buddy says: let's practice today, ${n}! 🎻` },
  cat:    { title: '🐱 Whiskers is worried!', body: (n, s) => s > 0 ? `Whiskers is meowing sadly! ${n}'s ${s}-day streak is at risk! 😟` : `Whiskers says: practice time, ${n}! 🎻` },
  rabbit: { title: '🐰 Hoppy is hopping!',    body: (n, s) => s > 0 ? `Hoppy can't sit still! ${n}'s ${s}-day streak needs you! 😟` : `Hoppy says: let's practice today, ${n}! 🎻` },
  bear:   { title: '🐻 Bruno is grumbling!',  body: (n, s) => s > 0 ? `Bruno is grumbling! ${n}'s ${s}-day streak is at risk! 😟` : `Bruno says: time to practice, ${n}! 🎻` },
  fox:    { title: '🦊 Rusty is fretting!',   body: (n, s) => s > 0 ? `Rusty is worried! ${n}'s ${s}-day streak is at risk! 😟` : `Rusty says: let's play today, ${n}! 🎻` },
};

function toLocalDate(date: Date, timezone: string): string {
  return date.toLocaleDateString('en-CA', { timeZone: timezone });
}

function calcStreak(sessions: { started_at: string }[], timezone: string): number {
  const dates = [...new Set(sessions.map(s => toLocalDate(new Date(s.started_at), timezone)))]
    .sort().reverse();
  if (!dates.length) return 0;
  const yesterday = toLocalDate(new Date(Date.now() - 86_400_000), timezone);
  if (dates[0] !== yesterday) return 0;
  let streak = 0;
  let cursor = yesterday;
  for (const d of dates) {
    if (d !== cursor) break;
    streak++;
    const prev = new Date(`${cursor}T12:00:00`);
    prev.setDate(prev.getDate() - 1);
    cursor = toLocalDate(prev, timezone);
  }
  return streak;
}

Deno.serve(async (req) => {
  if (CRON_SECRET && req.headers.get('authorization') !== `Bearer ${CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Load all push subscriptions with student profile data
  const { data: subs, error } = await sb
    .from('push_subscriptions')
    .select('user_id, subscription, profiles(display_name, timezone, mascot_type)');

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  if (!subs?.length) return new Response(JSON.stringify({ sent: 0, skipped: 0 }), { status: 200 });

  // Load recent sessions for all subscribed students
  const userIds = subs.map(s => s.user_id);
  const { data: sessions } = await sb
    .from('practice_sessions')
    .select('user_id, started_at')
    .in('user_id', userIds)
    .not('ended_at', 'is', null)
    .gte('started_at', new Date(Date.now() - 8 * 86_400_000).toISOString()); // last 8 days

  const now = new Date();
  let sent = 0, skipped = 0, errors = 0;

  for (const sub of subs) {
    const profile = sub.profiles as { display_name: string; timezone: string; mascot_type: string } | null;
    if (!profile) continue;

    const tz = profile.timezone ?? 'America/Chicago';
    const todayLocal = toLocalDate(now, tz);
    const userSessions = (sessions ?? []).filter(s => s.user_id === sub.user_id);

    // Skip if already practiced today
    if (userSessions.some(s => toLocalDate(new Date(s.started_at), tz) === todayLocal)) {
      skipped++; continue;
    }

    const streak = calcStreak(userSessions, tz);
    const mascot = profile.mascot_type ?? 'bird';
    const msg = MASCOT_MESSAGES[mascot] ?? MASCOT_MESSAGES['bird'];

    try {
      await webpush.sendNotification(
        sub.subscription,
        JSON.stringify({ title: msg.title, body: msg.body(profile.display_name, streak) })
      );
      sent++;
    } catch (err) {
      console.error(`Failed for user ${sub.user_id}:`, err);
      // Remove stale/expired subscriptions
      if ((err as { statusCode?: number }).statusCode === 410) {
        await sb.from('push_subscriptions').delete().eq('user_id', sub.user_id);
      }
      errors++;
    }
  }

  return new Response(JSON.stringify({ sent, skipped, errors }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
