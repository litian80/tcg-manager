# BracketOps

A modern tournament management companion app for Pokémon TCG events. Built with **Next.js 16**, **Supabase**, and **Tailwind CSS 4**, deployed on **Vercel**.

## What It Does

BracketOps serves as a **live visibility layer** and **roster management tool** that works alongside the official Tournament Operations Manager (TOM) software:

- **Pre-Tournament**: Player registration, roster building, deck list submission, TDF file generation
- **During Tournament**: Live pairings, standings (auto-synced from TOM), penalty tracking, deck checks
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

