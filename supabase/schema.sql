-- ============================================================
-- Violin Practice Tracker (SaaS) — Supabase Database Schema
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- ── 1. Profiles ────────────────────────────────────────────
-- profiles.id is a standalone UUID so parents can create child
-- profiles without those children needing their own auth accounts.
-- auth_user_id links to auth.users only for accounts that log in (parents).

CREATE TABLE IF NOT EXISTS profiles (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  display_name         TEXT NOT NULL,
  role                 TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'parent')),
  parent_id            UUID REFERENCES profiles(id) ON DELETE CASCADE,
  daily_goal_minutes   INTEGER NOT NULL DEFAULT 20,
  gems                 INTEGER NOT NULL DEFAULT 0,
  timezone             TEXT NOT NULL DEFAULT 'America/Chicago',
  family_code          TEXT UNIQUE,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Add family_code to existing databases
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS family_code TEXT UNIQUE;

-- Auto-create a profile on sign-up; role comes from signup metadata (default 'parent')
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (auth_user_id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'parent')
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Helper: resolve auth.uid() → profiles.id (used in all RLS policies)
CREATE OR REPLACE FUNCTION get_current_profile_id()
RETURNS UUID AS $$
  SELECT id FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ── 2. Practice Sessions ───────────────────────────────────
CREATE TABLE IF NOT EXISTS practice_sessions (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  started_at       TIMESTAMPTZ NOT NULL,
  ended_at         TIMESTAMPTZ,
  duration_seconds INTEGER,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Rewards ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rewards (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by   UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  for_user     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  gem_cost     INTEGER NOT NULL CHECK (gem_cost > 0),
  emoji        TEXT DEFAULT '🎁',
  is_active    BOOLEAN DEFAULT TRUE,
  redeemed_at  TIMESTAMPTZ,
  approved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. Achievements ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS achievements (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type         TEXT NOT NULL,
  gems_awarded INTEGER DEFAULT 0,
  earned_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, type)
);

-- ── 5. Row-Level Security ──────────────────────────────────
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards           ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements      ENABLE ROW LEVEL SECURITY;

-- Profiles: parent owns their own row
CREATE POLICY "profile: own row"
  ON profiles FOR ALL
  USING (auth_user_id = auth.uid());

-- Profiles: any authenticated user can find a parent by family_code (for join flow)
CREATE POLICY "profile: read by family code"
  ON profiles FOR SELECT
  USING (family_code IS NOT NULL AND role = 'parent');

-- Profiles: parent can read children
CREATE POLICY "profile: parent reads children"
  ON profiles FOR SELECT
  USING (parent_id = get_current_profile_id());

-- Profiles: parent can insert child profiles (parent_id must match caller)
CREATE POLICY "profile: parent inserts children"
  ON profiles FOR INSERT
  WITH CHECK (parent_id = get_current_profile_id());

-- Profiles: parent can update and delete children
CREATE POLICY "profile: parent manages children"
  ON profiles FOR UPDATE
  USING (parent_id = get_current_profile_id());

CREATE POLICY "profile: parent deletes children"
  ON profiles FOR DELETE
  USING (parent_id = get_current_profile_id());

-- Sessions: parent fully manages all children's sessions (for Practice Mode)
CREATE POLICY "session: parent manages children"
  ON practice_sessions FOR ALL
  USING (user_id IN (
    SELECT id FROM profiles WHERE parent_id = get_current_profile_id()
  ));

-- Sessions: student with own auth account manages their own sessions
CREATE POLICY "session: student owns own"
  ON practice_sessions FOR ALL
  USING (user_id = get_current_profile_id());

-- Rewards: parent (creator) or child (recipient) can read/write
CREATE POLICY "reward: creator or recipient"
  ON rewards FOR ALL
  USING (
    created_by = get_current_profile_id()
    OR for_user = get_current_profile_id()
    OR created_by IN (SELECT id FROM profiles WHERE parent_id = get_current_profile_id())
    OR for_user  IN (SELECT id FROM profiles WHERE parent_id = get_current_profile_id())
  );

-- Achievements: parent manages children's achievements
CREATE POLICY "achievement: parent manages children"
  ON achievements FOR ALL
  USING (user_id IN (
    SELECT id FROM profiles WHERE parent_id = get_current_profile_id()
  ));

-- Achievements: student with own auth account manages their own achievements
CREATE POLICY "achievement: student owns own"
  ON achievements FOR ALL
  USING (user_id = get_current_profile_id());

-- ── 6. Indexes ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user    ON profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_parent       ON profiles(parent_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_started ON practice_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_rewards_for_user      ON rewards(for_user, is_active);
CREATE INDEX IF NOT EXISTS idx_achievements_user     ON achievements(user_id);

-- ── 7. Helper: increment gems (SECURITY DEFINER — bypasses RLS safely) ─
CREATE OR REPLACE FUNCTION increment_gems(p_user_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles SET gems = gems + p_amount WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION increment_gems TO authenticated;

-- ── 8. Helper: set gems to an absolute value ───────────────
CREATE OR REPLACE FUNCTION set_gems(p_user_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles SET gems = p_amount WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION set_gems TO authenticated;

-- ── 9. Helper: student claims a family invite code ─────────
CREATE OR REPLACE FUNCTION claim_family_code(p_code TEXT)
RETURNS JSONB AS $$
DECLARE
  v_parent_id   UUID;
  v_parent_name TEXT;
  v_caller_id   UUID;
BEGIN
  SELECT id, display_name INTO v_parent_id, v_parent_name
    FROM profiles WHERE family_code = upper(p_code) AND role = 'parent' LIMIT 1;
  IF v_parent_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid code');
  END IF;

  SELECT id INTO v_caller_id FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  UPDATE profiles SET parent_id = v_parent_id
    WHERE id = v_caller_id AND role = 'student' AND parent_id IS NULL;

  RETURN jsonb_build_object('success', true, 'parentName', v_parent_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION claim_family_code TO authenticated;

-- ── 10. Mascot & Push Notifications ───────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mascot_type TEXT DEFAULT 'bird';

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  subscription JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push: own subscriptions"
  ON push_subscriptions FOR ALL
  USING (user_id = get_current_profile_id());
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

-- ── 11. Notification deduplication log ────────────────────
-- Prevents the hourly send-reminders edge function from sending the same
-- notification twice in one day. Only the service role accesses this table.
CREATE TABLE IF NOT EXISTS notification_log (
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type       TEXT NOT NULL,
  local_date TEXT NOT NULL,  -- YYYY-MM-DD in the user's local timezone
  sent_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, type, local_date)
);
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
-- No user-level policies: only the service role (edge functions / API routes) can access.
CREATE INDEX IF NOT EXISTS idx_notification_log_user ON notification_log(user_id, sent_at);
