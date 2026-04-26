// ─────────────────────────────────────────────────────────
// lib/challenges.ts  —  Challenge evaluation engine
// ─────────────────────────────────────────────────────────

import type { PracticeSession, Achievement, Challenge } from './types';
import {
  calculateStreak,
  getPracticedMinutesThisMonth,
} from './streak';

/**
 * Evaluates all challenges given current session data.
 * Called client-side after every session end.
 * For production, mirror this logic in a Supabase Edge Function.
 */
export function evaluateChallenges(
  sessions: PracticeSession[],
  achievements: Achievement[],
  timezone: string,
): Challenge[] {
  const streak = calculateStreak(sessions, timezone);
  const monthMinutes = getPracticedMinutesThisMonth(sessions, timezone);
  const completedSessions = sessions.filter((s) => s.ended_at !== null).length;
  const earnedTypes = new Set(achievements.map((a) => a.type));

  return [
    {
      id: 'first_session',
      title: 'First Note!',
      description: 'Complete your very first practice session',
      emoji: '🎵',
      type: 'onetime',
      gemsReward: 25,
      current: Math.min(completedSessions, 1),
      target: 1,
      completed: earnedTypes.has('first_session') || completedSessions >= 1,
    },
    {
      id: 'streak_3',
      title: '3-Day Rockstar',
      description: 'Practice 3 days in a row',
      emoji: '🎸',
      type: 'weekly',
      gemsReward: 30,
      current: Math.min(streak, 3),
      target: 3,
      completed: earnedTypes.has('streak_3') || streak >= 3,
    },
    {
      id: 'streak_5',
      title: '5-Day Hero',
      description: 'Practice 5 days in a row',
      emoji: '🏆',
      type: 'weekly',
      gemsReward: 50,
      current: Math.min(streak, 5),
      target: 5,
      completed: earnedTypes.has('streak_5') || streak >= 5,
    },
    {
      id: 'monthly_5h',
      title: '5-Hour Month',
      description: 'Practice 5 total hours this month',
      emoji: '⭐',
      type: 'monthly',
      gemsReward: 100,
      current: Math.min(monthMinutes, 300),
      target: 300,
      completed: earnedTypes.has('monthly_5h') || monthMinutes >= 300,
    },
    {
      id: 'monthly_10h',
      title: '10-Hour Hero',
      description: 'Practice 10 total hours this month',
      emoji: '🌟',
      type: 'monthly',
      gemsReward: 200,
      current: Math.min(monthMinutes, 600),
      target: 600,
      completed: earnedTypes.has('monthly_10h') || monthMinutes >= 600,
    },
  ];
}

/** Returns challenges newly completed (not yet in achievements table) */
export function getNewlyCompleted(
  challenges: Challenge[],
  existingAchievements: Achievement[],
): Challenge[] {
  const earnedTypes = new Set(existingAchievements.map((a) => a.type));
  return challenges.filter((c) => c.completed && !earnedTypes.has(c.id));
}
