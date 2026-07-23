# BracketOps

A modern tournament management companion app for Pokémon TCG events. Built with **Next.js 16**, **Supabase**, and **Tailwind CSS 4**, deployed on **Vercel**.

## What It Does

BracketOps serves as both a **standalone tournament engine** and a **live visibility layer** that works alongside the official Tournament Operations Manager (TOM) software:

- **Pre-Tournament**: Player registration, roster building, deck list submission, TDF file generation
- **During Tournament**: Live Swiss pairings (via built-in Blossom algorithm engine or synced from TOM), tiebreaker standings, single-elimination top cut brackets, penalty tracking, deck checks
- **Post-Tournament**: Penalty export, tournament history

## Roles

| Role | Capabilities |
|---|---|
| **Admin** | Full access — user/tournament management, all organiser + judge capabilities |
| **Organiser** | TOM file upload, judge panel, match result editing (own tournaments) |
| **Judge** | Judge panel access, penalty/deck check management (assigned tournaments) |
| **Player** | View tournaments, register, submit deck lists |

## Getting Started

### Prerequisites
- Node.js 20+
- A Supabase project with the schema from `db/schema/`
- Google OAuth configured in Supabase

### Development
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables
Copy `.env.local.example` to `.env.local` and configure:
- `NEXT_PUBLIC_SUPABASE_URL` — Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Your Supabase anon key

### Deployment
```bash
# Push to main → Vercel auto-deploys
git add . && git commit -m "description" && git push
```

## Project Structure

```
app/            → Next.js App Router pages & route-level components
actions/        → Server Actions (grouped by domain)
components/     → React components (grouped by feature)
  ├── ui/       → Shared shadcn/ui primitives
  ├── tournament/
  ├── judge/
  ├── admin/
  └── ...
lib/            → Auth, RBAC, types, utilities
  ├── core-ops/ → Built-in Swiss pairing engine (Blossom algorithm), tiebreakers, brackets
hooks/          → Custom React hooks
utils/supabase/ → Supabase client factories & types
supabase/       → Migrations & local dev config
```

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL + Auth + RLS)
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Deployment**: Vercel
- **File Sync**: TOM ↔ Web via `.tdf` files

## Hosting & Free-Tier Capacity

The app is designed to stay within the **Supabase Free** and **Vercel Hobby** tiers.
Approximate ceilings (verify current values — providers change them):

| Resource | Free-tier ceiling | How the app stays under it |
|---|---|---|
| Supabase egress | ~5 GB/mo | Public reads (tournament/matches/roster) served from a shared anon cache (`lib/cached-queries.ts`, 5–60s TTL) → egress scales with **number of tournaments**, not viewers |
| Supabase Realtime | 200 concurrent conns / 2M msgs/mo | Only **participants + staff** hold a Realtime socket; spectators poll a CDN-cached fingerprint (`/api/tournaments/[id]/live-version`) → scales with **players**, not audience |
| Supabase Auth | 50k MAU | Well within reach for event-scale usage |
| Supabase DB / Storage | 500 MB / 1 GB | Rows are KB-scale; TDF files are small XML |
| Vercel bandwidth | ~100 GB/mo | Static assets + small JSON payloads |
| Vercel Edge Middleware | ~1M invocations/mo | Middleware does the profile read only on protected routes; `/api` is excluded from the matcher |

**Scheduling** runs on Supabase `pg_cron` (payment expiry, queue drops, deck reminders),
**not** Vercel Cron — this avoids Hobby's "cron once per day" limit, and the 15-min
reminder job keeps the project from the 7-day inactivity pause.

**Practical capacity:** comfortably handles multiple concurrent tournaments of typical
size (tens to low-hundreds of players) with **unlimited spectators**. The binding
constraint is ~200 concurrent *participants + staff* (Realtime connections) summed
across all simultaneously-live tournaments.

> ⚠️ **Vercel Hobby is non-commercial only.** Because this app takes payments (Stripe)
> and runs real events, move to **Vercel Pro** before operating it commercially.
> (Supabase's free tier permits commercial use.)

