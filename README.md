# 🎻 Violin Practice Tracker — SaaS Edition

A Duolingo-style daily practice tracker for young violin students. Multi-tenant SaaS version supporting multiple families, each with their own parent account and one or more child profiles.

Features a live practice timer, animated violin progress, gem rewards, daily streaks, a mascot buddy with mood expressions, weekly history navigation, and daily push notification reminders — all in a mobile-first Next.js PWA backed by Supabase.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔥 Daily Streak | Timezone-aware streak counter with flame animation and Mon–Sun week dots |
| 🎻 Violin Progress | SVG violin that fills with amber color as practice accumulates; glows at 100% |
| ⏱️ Practice Timer | Start/stop with localStorage persistence (survives page refresh) |
| 🎵 Ding Sound | Web Audio API fanfare plays when a session ends — no audio files needed |
| 🐦 Mascot Buddy | Duolingo-style animal companion (bird, dog, cat, rabbit, bear, fox) with 5 mood states — celebrating when goal is hit, worried when a streak is at risk |
| 🏆 Challenges | Weekly/monthly progress bars and collectable badges |
| 🛍️ Reward Shop | Spend gems on rewards parents define; approval queue in parent view |
| 👩‍👧 Parent Dashboard | Manage multiple children, add/edit rewards, approve redemptions |
| 📅 Weekly History | Prev/Next week navigation with per-day bar chart per child; green = goal met |
| 👨‍👩‍👧 Family Join Code | Parent generates a 6-character code; child enters it to link accounts |
| 🔔 Push Notifications | Daily reminder if the student hasn't practiced; mascot-personalised message via Supabase Edge Function |
| 🎭 Mock Mode | Full app preview with two sample children — zero setup, zero database |

---

## 🚀 Quick Start (Mock Mode — No Database Required)

```bash
git clone https://github.com/Sathishkumar1805/violin-tracker-saas.git
cd violin-tracker-saas
npm install
npm run dev
```

Open **http://localhost:3000** → choose **Parent** or **Student** login → full UI with two sample children. No Supabase account needed.

---

## 🗄️ Full Supabase Setup

### Step 1 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → **Start for Free**
2. Create a new project (save the database password somewhere safe)
3. Wait ~2 minutes for provisioning

### Step 2 — Run the Schema

1. In your project: **SQL Editor → New query**
2. Paste the entire contents of `supabase/schema.sql`
3. Click **Run** → you should see "Success. No rows returned"

### Step 3 — Get API Keys

**Settings → API**:
- **Project URL**: looks like `https://xxxxxxxxxxxx.supabase.co`
- **anon / public key**: the long JWT string under "Project API keys"
- **service_role key**: used only for the edge function (never exposed to browser)

### Step 4 — Set Environment Variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Optional — required only for push notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
```

### Step 5 — Create Your First Family

1. In Supabase: **Authentication → Users → Invite user** — create a parent account (e.g. `parent@family.com`)
2. After first login, the app auto-creates a `profiles` row with `role = 'parent'` and a `family_code`
3. From the parent dashboard, tap **Add Child** to create child profiles directly in the app
4. Share the displayed family code with the child; the child enters it on their dashboard to link accounts

### Step 6 — Run

```bash
npm run dev
```

Visit **http://localhost:3000/login** → log in as parent → student dashboard shows up when logging in as a child account.

---

## 🔔 Push Notifications Setup (Optional)

The `send-reminders` Supabase Edge Function fires daily, checks each subscribed student's timezone, and sends a push notification only if they haven't practiced today. The message text is personalised to the student's chosen mascot animal.

### 1. Generate VAPID Keys

```bash
npx web-push generate-vapid-keys
```

Copy the output — you'll need both keys.

### 2. Add Environment Variables

**Vercel** (Project → Settings → Environment Variables):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | The public key from step 1 |

**Supabase** (Dashboard → Settings → Edge Functions → Secrets):

| Variable | Value |
|---|---|
| `VAPID_PUBLIC_KEY` | The public key from step 1 |
| `VAPID_PRIVATE_KEY` | The private key from step 1 |
| `VAPID_SUBJECT` | `mailto:you@example.com` |
| `CRON_SECRET` | Any random secret string |

### 3. Deploy the Edge Function

```bash
supabase functions deploy send-reminders
```

### 4. Set Up a Daily Cron

In Supabase Dashboard → **Edge Functions → send-reminders → Cron**, add a schedule:

```
0 17 * * *
```

(Fires at 17:00 UTC daily. Adjust to a suitable time for your users' timezones.)

Or trigger it from a Vercel Cron Job with:

```
Authorization: Bearer YOUR_CRON_SECRET
```

### 5. Enable Notifications per Student

In the student dashboard → **Practice tab** → toggle the 🔔 **Practice reminders** switch. The browser will ask for permission.

---

## 🌐 Deploying to Vercel (Free Tier)

### 1. Push to GitHub

```bash
git init && git add . && git commit -m "initial commit"
# Create repo on github.com then:
git remote add origin https://github.com/YOUR-USERNAME/violin-tracker-saas.git
git push -u origin main
```

### 2. Import on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repository
3. Framework preset: **Next.js** (auto-detected)
4. Click **Deploy** — first deploy runs in Mock Mode (no env vars yet)

### 3. Add Environment Variables

In Vercel: **Project → Settings → Environment Variables**

Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, then:

**Deployments → ⋯ → Redeploy**

Your live URL is now fully connected to Supabase. 🎉

---

## 📱 iPhone Home Screen (PWA)

### Method A — Safari "Add to Home Screen" (Simplest, 30 seconds)

1. Open your Vercel URL in **Safari** on the iPhone
2. Tap the **Share** button (box with upward arrow)
3. Scroll down → **Add to Home Screen**
4. Name it **"Violin Tracker"** → tap **Add**

The app opens full-screen from the home screen with no browser chrome.

### Method B — True PWA Icons (Optional)

Create `public/icon-192.png` and `public/icon-512.png`:
- 192×192 and 512×512 PNG files
- Suggested design: violet `#5B4FCF` background, 🎻 emoji centered
- A free tool: [favicon.io](https://favicon.io/emoji-favicons/violin/)

---

## 📁 Project Structure

```
violin-tracker-saas/
├── app/
│   ├── globals.css               # Tailwind + custom animations (mascot wobble)
│   ├── layout.tsx                # Root layout, PWA metadata, service worker
│   ├── page.tsx                  # Redirects / → /dashboard
│   ├── login/page.tsx            # Login page
│   ├── signup/page.tsx           # Self-service signup
│   ├── onboarding/page.tsx       # First-run setup (name, timezone, goal)
│   ├── dashboard/page.tsx        # Student dashboard (3 tabs)
│   └── parent/page.tsx           # Parent dashboard (multi-child)
├── components/
│   ├── StreakBanner.tsx           # Flame streak + Mon–Sun week dots
│   ├── ViolinProgress.tsx        # Animated SVG violin
│   ├── Timer.tsx                 # Start/stop with Web Audio ding
│   ├── ChallengesTab.tsx         # Weekly/monthly challenges + badges
│   ├── RewardStore.tsx           # Gem shop with pending/approved states
│   ├── Mascot.tsx                # Mascot animal with mood expressions
│   ├── MascotPicker.tsx          # Animal switcher (6 options)
│   ├── WeeklyHistory.tsx         # Parent weekly bar chart with prev/next navigation
│   └── ServiceWorkerRegister.tsx # Registers /sw.js on mount
├── lib/
│   ├── types.ts                  # All TypeScript interfaces
│   ├── supabase.ts               # DB client + data helpers (IS_MOCK flag)
│   ├── mock-data.ts              # Sample data — two children for Mock Mode
│   ├── streak.ts                 # Timezone-aware streak, analytics & week details
│   ├── challenges.ts             # Challenge evaluation engine
│   └── push.ts                   # Web Push subscribe/unsubscribe helpers
├── public/
│   ├── sw.js                     # Service worker (handles push events)
│   └── manifest.json             # PWA manifest
├── supabase/
│   ├── schema.sql                # Full DB schema + RLS policies + indexes
│   └── functions/
│       └── send-reminders/
│           └── index.ts          # Edge Function: daily push notifications
├── .env.local.example            # Environment variable template
└── README.md
```

---

## 🔧 Customisation

| What to change | Where |
|---|---|
| Daily goal default | `profiles.daily_goal_minutes` in DB (default: 20 min) |
| Gems per minute | `GEMS_PER_MINUTE` constant in `components/Timer.tsx` (default: 5) |
| Default mascot | `profiles.mascot_type` in DB — one of: `bird`, `dog`, `cat`, `rabbit`, `bear`, `fox` |
| Notification time | Cron schedule on `send-reminders` edge function |
| Add challenges | Edit the array returned by `evaluateChallenges()` in `lib/challenges.ts` |
| Colour scheme | Edit Tailwind classes (primary: `indigo-600`, accent: `amber-400`) |

---

## 🔒 Security Notes

- All tables use **Row-Level Security (RLS)** — users can only read/write their own data
- Parents can read their children's data via a policy join on `parent_id`; children cannot read other families' data
- Family codes are single-use from a linking perspective — once a child is linked, the code still exists but the child already has a `parent_id`
- Push subscriptions are stored per-user; the `service_role` key is used only inside the edge function and is never sent to the browser
- The edge function endpoint is protected by `CRON_SECRET` — without the correct `Authorization` header it returns 401
- Supabase anon key is safe to expose client-side — it can only do what RLS allows

---

## 📜 License

MIT — free to fork, modify, and use.
