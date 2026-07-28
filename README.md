# Opportunity Graph

A recommendation engine for educational opportunities (scholarships, hackathons, summer programs, competitions) that scores matches against a student's profile and explains why each one made the list.

## Setup

```bash
npm install
```

Create a Supabase project, run the migration in `supabase/migrations/001_initial_schema.sql` via the SQL Editor, then copy your keys into `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

```bash
npm run dev
```

## How it works

The recommendation engine is a single deterministic scoring function — no AI in the loop. For each verified opportunity, it computes a weighted score from five signals: **interest match** (40%), **eligibility** (25%), **deadline proximity** (15%), **experience level** (10%), and **popularity** (10%). Interest matching uses a 2-hop graph traversal — your profile links to nodes (skills, interests, fields), which connect to other nodes, which connect to opportunities. Every recommendation carries a `breakdown` and `matchedNodes` so the "why am I seeing this" text is always generated from computed facts, never from a prompt.

Opportunities are ingested via AI extraction (Gemini Flash), validated with Zod, and land in a `pending_review` queue. Nothing reaches students until an admin marks it `verified`.

## Structure

```
app/
  login/              — email/password auth
  dashboard/          — ranked recommendation feed
  opportunities/[slug]/ — detail + score breakdown
  profile/            — 4-step onboarding (grade, interests, languages, goals)
  admin/ingestion/    — review queue for extracted opportunities
  api/                — profile, recommendations, interactions, opportunities
lib/
  recommendations.ts  — scoring engine
  graph.ts            — 2-hop graph traversal
  explain.ts          — template-based explainability
  extraction.ts       — Zod schema for AI extraction
  db.ts               — browser Supabase client
  supabase/           — server client + middleware
components/
  ui/                 — button, badge, card, progress bar
  nav.tsx             — auth-aware navigation
  opportunity-row.tsx — feed row with match % and deadline
  score-breakdown.tsx — visual breakdown of scoring weights
supabase/
  migrations/         — SQL schema + seed data
```
