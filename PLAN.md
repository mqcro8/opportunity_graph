# Educational Opportunity Graph — Architecture & Implementation Plan

## 0. Assumptions and framing

This plan makes three deliberate calls that diverge slightly from the original vision doc, all in the direction of "ship something real with the stack you already know":

1. **No dedicated graph database.** Neo4j (or similar) buys you traversal syntax you don't need at this scale and a second piece of infrastructure to deploy, monitor, and pay for. Two Postgres tables (`graph_nodes`, `graph_edges`) model the same graph and live in the Supabase project you already run. Revisit only if you're doing 4+ hop traversals at high QPS — you won't be for a long time.
2. **The recommendation engine is pure Postgres + TypeScript, not an AI call.** This is the whole point of the "knowledge-first" pivot, so it's non-negotiable: the scoring function must be one deterministic code path with no LLM in the loop.
3. **Phased build, not one big launch.** Phase 0 is what you can demo in days with hand-seeded data. Phase 1 turns on real ingestion. Phase 2 is scale/community. Don't start Phase 1 work before Phase 0 is demoable end-to-end with real data — a working loop on 50 opportunities beats a half-built pipeline for 5,000.

Everything below assumes: Next.js 14+ (App Router), Supabase (Postgres + Auth + Storage), Tailwind, deployed on Vercel. That's it — one stack, no alternates.

---

## 1. Tech stack decisions

| Concern | Choice | Why (single reason, not a comparison) |
|---|---|---|
| App framework | Next.js App Router | You already ship on this. |
| Database | Supabase Postgres | Graph, opportunities, and profiles all live as relational tables — one database, one connection pool. |
| Auth | Supabase Auth | Already integrated into your workflow from StudyPal. |
| Styling | Tailwind + shadcn/ui | Matches your existing components. |
| Extraction AI | Gemini 2.5 Flash | Cheap and fast enough to run against many pages during ingestion; this is a bulk, low-reasoning task. |
| Coaching/explanation AI (optional, Phase 1+) | Claude (Sonnet) | Higher-quality reasoning for essay review or open-ended Q&A — a genuinely different job from extraction, so it's fine that it's a different model. |
| Scheduled jobs | Vercel Cron | No new infra; triggers your own API routes. |
| Validation at trust boundaries | Zod | Enforced wherever untrusted data enters the system: AI extraction output, external API responses, form input. |
| Hosting | Vercel | Where you already deploy. |

Two AI providers is not a violation of "one way to do things" — extraction and coaching are different responsibilities with different quality/cost tradeoffs, so each gets its own single, fixed choice. What you should *not* do is let either subsystem fall back between providers at runtime ("try Gemini, fall back to Claude if it fails") — if extraction fails, it should throw and land in a retry queue, not silently switch models.

---

## 2. Data model

The graph is two tables. Everything else hangs off it.

```sql
create extension if not exists "pgcrypto";

-- ============ GRAPH ============
create table graph_nodes (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in
    ('skill','interest','field','university','category','language','region','age_group')),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table graph_edges (
  id uuid primary key default gen_random_uuid(),
  from_node_id uuid not null references graph_nodes(id) on delete cascade,
  to_node_id uuid not null references graph_nodes(id) on delete cascade,
  relationship text not null, -- 'related_to' | 'part_of' | 'leads_to' | 'requires'
  weight numeric not null default 1.0 check (weight > 0 and weight <= 1),
  created_at timestamptz not null default now(),
  unique (from_node_id, to_node_id, relationship)
);

-- ============ OPPORTUNITIES ============
create table sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tier smallint not null check (tier in (1,2,3)),
  base_url text not null,
  scrape_config jsonb,           -- crawl seeds / selectors, tier 2-3 only
  last_run_at timestamptz,
  created_at timestamptz not null default now()
);

create table opportunities (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references sources(id),
  title text not null,
  organization text not null,
  description text,
  opportunity_type text not null check (opportunity_type in
    ('scholarship','hackathon','olympiad','internship','summer_program',
     'conference','fellowship','competition','exchange','certification','grant')),
  application_deadline date,
  eligibility jsonb not null default '{}',  -- {min_grade, max_grade, countries[], age_min, age_max}
  country text,
  delivery_mode text check (delivery_mode in ('online','in_person','hybrid')),
  education_level text[],
  source_url text not null,
  application_url text,
  status text not null default 'pending_review' check (status in ('pending_review','verified','archived')),
  last_verified_at timestamptz,
  created_at timestamptz not null default now()
);

-- Opportunities link to the graph — this IS the category system.
-- There is no separate freeform `categories text[]` column: one taxonomy, not two.
create table opportunity_nodes (
  opportunity_id uuid references opportunities(id) on delete cascade,
  node_id uuid references graph_nodes(id) on delete cascade,
  relevance numeric not null default 1.0 check (relevance > 0 and relevance <= 1),
  primary key (opportunity_id, node_id)
);

-- ============ STUDENTS ============
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  current_grade text,
  gpa numeric,
  languages text[] not null default '{}',
  goals text[] not null default '{}',
  preferences jsonb not null default '{}', -- {online_only, regions[], free_only, beginner_friendly}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

> The live schema matches this (migration 004 renamed `full_name` → `display_name` and dropped `university_status`).

```sql
create table profile_nodes (
  profile_id uuid references profiles(id) on delete cascade,
  node_id uuid references graph_nodes(id) on delete cascade,
  weight numeric not null default 1.0 check (weight > 0 and weight <= 1),
  source text not null default 'user_input', -- 'user_input' | 'inferred'
  primary key (profile_id, node_id)
);

create table interactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  opportunity_id uuid references opportunities(id) on delete cascade,
  status text not null check (status in
    ('viewed','saved','applied','accepted','rejected','dismissed')),
  created_at timestamptz not null default now(),
  unique (profile_id, opportunity_id, status)
);

create table ingestion_logs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references sources(id),
  run_at timestamptz not null default now(),
  items_found int not null default 0,
  items_added int not null default 0,
  errors jsonb not null default '[]'
);

-- Indexes for the queries the recommendation engine actually runs
create index idx_opportunities_deadline on opportunities (application_deadline) where status = 'verified';
create index idx_opportunity_nodes_node on opportunity_nodes (node_id);
create index idx_profile_nodes_node on profile_nodes (node_id);
create index idx_interactions_opportunity on interactions (opportunity_id);
```

**Design simplification worth flagging:** the original doc lists a per-opportunity "refresh schedule" field. That's dropped here — refresh cadence lives on the `source` (via cron frequency), not on every individual row. One place to configure it, not thousands.

### Row Level Security

```sql
alter table profiles enable row level security;
create policy "Users manage own profile" on profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);

alter table profile_nodes enable row level security;
create policy "Users manage own profile nodes" on profile_nodes for all
  using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

alter table interactions enable row level security;
create policy "Users manage own interactions" on interactions for all
  using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

alter table opportunities enable row level security;
create policy "Public read verified opportunities" on opportunities for select
  using (status = 'verified');
-- Writes to opportunities happen only via the service role from server routes —
-- no client-side insert policy exists, intentionally.
```

**In the live DB, the reference tables are RLS-*disabled*** (`graph_nodes`, `graph_edges`, `opportunity_nodes`, `sources`, `ingestion_logs`): they're public/reference data that's only written via the service role (admin routes, ingestion), and the app reads them with the anon key for scoring/linking. Only the four user-facing tables above keep RLS on.

---

## 3. Recommendation engine

One function, one scoring path, no fallback strategy. If a required input is missing, it throws — it does not degrade to "just show popular stuff."

```ts
// lib/recommendations.ts

const WEIGHTS = {
  interest: 0.40,
  eligibility: 0.25,
  deadline: 0.15,
  experience: 0.10,
  popularity: 0.10,
} as const;

export async function getRecommendations(profileId: string, limit = 20) {
  const profileNodeIds = await getProfileNodeIds(profileId);

  if (profileNodeIds.length === 0) {
    // No silent fallback to "generic popular opportunities" — a profile with
    // zero graph nodes can't produce an explainable match. Surface that as
    // an explicit onboarding state in the UI, not a fake recommendation.
    throw new EmptyProfileError(profileId);
  }

  const expandedNodeIds = await expandGraph(profileNodeIds, { hops: 2 });
  const candidates = await getOpportunitiesByNodes(expandedNodeIds);

  const scored = candidates.map((opp) => {
    const interest = interestScore(opp.matchedNodeNames, profileNodeNames, expandedNodeNames);
    const eligibility = eligibilityScore(opp.eligibility); // assumes validated eligibility JSON
    const deadline = deadlineScore(opp.application_deadline);
    const experience = experienceScore();
    const popularity = popularityScore();

    const score =
      interest * WEIGHTS.interest +
      eligibility * WEIGHTS.eligibility +
      deadline * WEIGHTS.deadline +
      experience * WEIGHTS.experience +
      popularity * WEIGHTS.popularity;

    return {
      opportunity: opp,
      score,
      breakdown: { interest, eligibility, deadline, experience, popularity },
      matchedNodes: matchedNodeNames(opp, profileNodeIds),
    };
  });

  return scored
    .filter((s) => s.breakdown.eligibility > 0) // hard filter — ineligible is not "low score"
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
```

`eligibilityScore` assumes the `eligibility` jsonb column already matches the shape enforced at write time (Section 5). If a row is malformed, that's a data bug to fix at the source, not a runtime case to handle defensively here — matching the "throw errors, fail fast" rule rather than adding a fallback parser.

**Current implementation status:** `eligibilityScore()` is a stub that always returns `SCORE_MAX` (100), and `experienceScore()` / `popularityScore()` always return half of `SCORE_MAX`. Real profile-vs-opportunity eligibility matching and interaction-fed popularity are not wired yet — see §8 for what's open.

Start by computing scores on-demand per request. Materialize into a cached table only once you have evidence (query timing, not a hunch) that it's too slow — don't pre-build caching infrastructure for a load you don't have yet.

---

## 4. Explainability layer

Every recommendation carries its own `breakdown` and `matchedNodes` — the "why am I seeing this" copy is generated from that data, not from a separate AI call that could invent a reason:

```ts
function explain(rec: ScoredOpportunity): string {
  const nodes = rec.matchedNodes.join(', ');
  return `Because you're interested in ${nodes}, and this ${rec.opportunity.opportunity_type} ` +
         `accepts applicants matching your profile.`;
}
```

This is deliberately a template, not a prompt. If you later want more natural phrasing, you can pass `{ nodes, opportunity }` to an LLM call — but the LLM only rephrases facts you already computed; it never decides which facts to include.

---

## 5. Ingestion pipeline (AI's actual job)

AI touches this system in exactly one core place: turning an unstructured page into a structured row. It never invents an opportunity, never decides eligibility on its own judgment, and never picks what to recommend.

```ts
import { z } from 'zod';

const ExtractedOpportunity = z.object({
  title: z.string().min(3),
  organization: z.string().min(2),
  description: z.string().optional(),
  opportunity_type: z.enum([
    'scholarship','hackathon','olympiad','internship','summer_program',
    'conference','fellowship','competition','exchange','certification','grant',
  ]),
  application_deadline: z.string().date().nullable(),
  eligibility: z.object({
    min_grade: z.string().nullable(),
    max_grade: z.string().nullable(),
    countries: z.array(z.string()),
    age_min: z.number().nullable(),
    age_max: z.number().nullable(),
  }),
  country: z.string().nullable(),
  delivery_mode: z.enum(['online','in_person','hybrid']).nullable(),
  application_url: z.string().url(),
});

// If this throws, the item is logged to ingestion_logs.errors and skipped.
// Do not retry with a loosened schema and do not fill in defaults —
// a bad extraction is evidence the source page needs a human look, not a reason to guess.
const parsed = ExtractedOpportunity.parse(aiJsonOutput);
```

**Implementation status:** this is built, not just a schema — `lib/extraction.ts` implements `extractFromUrl()` / `extractFromHtml()` (fetch page → Gemini 2.5 Flash prompt with `response_mime_type: application/json`, temperature 0.1 → Zod-validate each item, dropping malformed rows), and `/api/ingest/[sourceId]` feeds it. Only the `vercel.json` cron trigger is missing.

New rows land with `status = 'pending_review'`. Nothing reaches a student's dashboard (`status = 'verified'`) without passing through the admin review screen described in Section 7. That single status field is your entire trust boundary between "AI extracted this" and "this is safe to recommend."

**Source tiers**, matching the original doc:
- **Tier 1** — official pages (universities, government, olympiad orgs). Hand-seed these first; automate later.
- **Tier 2** — community sources (Devpost, student orgs). Same extraction pipeline, held to the same review gate, just a lower prior on trust.
- **Tier 3** is not really a separate data source — it's the AI extraction step itself, applied to Tier 1/2 pages. The three-tier framing in the vision doc describes *trust levels of the source*, not three separate pipelines; build one pipeline and vary the review scrutiny by tier.

---

## 6. Application architecture

```
/app
  page.tsx                       -- marketing home
  layout.tsx                     -- Nav + footer + ThemeProvider
  login/page.tsx                 -- email/password, sign-up consent, "Check your email"
  dashboard/page.tsx             -- ranked feed + Source Directory card
  opportunities/[slug]/page.tsx  -- detail + "why you're seeing this" + Save button
  profile/page.tsx               -- 4-step onboarding + account deletion
  sources/page.tsx               -- full source directory
  terms/page.tsx, privacy/page.tsx
  admin/page.tsx                 -- landing
  admin/ingestion/page.tsx       -- pending_review queue, approve/reject
  admin/opportunities/new/page.tsx
  admin/sources/new/page.tsx
  auth/callback/route.ts         -- OAuth callback handler
  auth/logout/route.ts           -- sign out endpoint
  /api
    /recommendations/route.ts
    /opportunities/[slug]/route.ts  -- list endpoint (GET /api/opportunities) is a TODO
    /profile/route.ts               -- GET/POST + DELETE (account deletion)
    /interactions/route.ts
    /admin/ingestion/route.ts
    /admin/opportunities/route.ts
    /admin/opportunities/[id]/route.ts
    /admin/sources/route.ts
    /ingest/[sourceId]/route.ts     -- for Vercel Cron, protected by CRON_SECRET
/lib
  /db.ts                  -- browser Supabase client
  /supabase/server.ts     -- server client (cookies)
  /supabase/middleware.ts -- session refresh for middleware
  /supabase/admin.ts      -- service-role client (admin routes + ingestion)
  /graph.ts               -- node expansion / traversal
  /recommendations.ts     -- Section 3
  /extraction.ts          -- Section 5 (implemented)
  /linking.ts             -- auto-link opportunities to graph nodes
  /admin.ts               -- requireAdmin() gating
  /explain.ts             -- Section 4
  /types.ts, /constants.ts, /errors.ts, /utils.ts
/supabase
  /migrations/001..004.sql
```

Notes on the current tree: `GET /api/opportunities` (list) doesn't exist yet — only the slug-based detail route does. `lib/mock-data.ts` is dead code and unused.

Optional stretch, genuinely worth it for a hackathon demo: a `/graph` page with a force-directed visualization (e.g. `react-force-graph`) of a student's expanded node neighborhood. It's the single most legible way to show a judge *why* the system isn't "just another wrapper." Build it after Phase 0's core loop works, not before.

---

## 7. Deployment and ops

**Environment variables:**
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — client-side
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, used by `/api/ingest/*` and admin routes to write `opportunities`
- `GEMINI_API_KEY` — extraction pipeline (implemented; needed by `lib/extraction.ts`)
- `ANTHROPIC_API_KEY` — only if/when you build the Phase 1+ coaching feature
- `CRON_SECRET` — checked in every `/api/ingest/*` route so it can't be triggered by anyone who finds the URL
- `ADMIN_EMAIL` — gates `/admin/*` and `/api/admin/*` (must equal the Supabase user's email)

**`vercel.json`:**
```json
{
  "crons": [
    { "path": "/api/ingest/tier1", "schedule": "0 6 * * *" }
  ]
}
```

The `vercel.json` cron is **not deployed yet** — `/api/ingest/[sourceId]` works on demand, it just isn't scheduled.

**Data quality note for Phase 1+:** once you have more than one source, you will get duplicate opportunities (the same scholarship listed on the university site and a Discord). Handle this with a single dedup check at insert time (fuzzy match on `title + organization`, flag as `pending_review` with a `duplicate_of` note) rather than building a separate dedup service — it's a five-line query, not a subsystem.

---

## 8. Phased build plan

**Phase 0 — demoable core loop** ✅ complete
- [x] Hand-seeded real opportunities (15 in migration 001)
- [x] Build the graph: 29 nodes covering fields/skills/universities + 11 category hubs (migrations 001, 003)
- [x] Profile creation (4-step short form: Grade/Nickname/GPA → Interests → Languages → Goals)
- [x] Recommendation engine v1 exactly as in Section 3
- [x] Dashboard with visible score breakdown and explain() copy
- Skips that later shipped anyway: automated scraping (Phase 1) and the admin review queue (Phase 1)

**Phase 1 — real ingestion**
- [x] Tier 1 extraction for a handful of official sources — Gemini 2.5 Flash pipeline + `/api/ingest/[sourceId]` (Session 3)
- [x] Admin review UI (`/admin/ingestion`) to move rows from `pending_review` to `verified`
- [x] Interaction tracking (`saved`/`applied`/`dismissed`) — `POST /api/interactions` + Save button; the popularity score does **not** consume it yet (flat stub)
- [ ] Weekly digest email (Resend + Vercel Cron)
- [ ] `vercel.json` cron schedule (ingest route works on demand only)
- [ ] Dedup at insert time (only slug-exact dedup exists so far; fuzzy `title + organization` is the plan)

**Phase 1.5 — polish** (mostly done)
- [x] Source Directory on dashboard + `/sources` page (Session 5)
- [x] Save button wired to `POST /api/interactions` (Session 2)
- [ ] Error boundaries / loading states — basic loading states exist; no error boundary components
- [ ] `GET /api/opportunities` list endpoint — only slug-based detail exists
- [ ] Google sign-in/up — provider not configured yet

**Phase 2 — scale and community** 🔒 all open
- [ ] Tier 2 community sources with stricter review scrutiny
- [ ] User-submitted opportunities with a moderation queue
- [ ] Deadline reminders, basic trend analytics
- [ ] Public read API over verified opportunities

---

## 9. Working with your coding agent

Put this in `CLAUDE.md` (or your agent's equivalent config) at the repo root:

```md
# Working agreement

## Debugging protocol
1. State a theory of the crime before touching code — what's broken, and why you think so.
2. Collect evidence: minimal, targeted logging or a direct query that would confirm or kill the theory.
3. Only after the evidence confirms the theory, make the fix.
4. Fixes are surgical — touch only the files and lines the root cause requires.
5. If the first fix doesn't work, that means the theory was wrong. Go back to step 1 — don't layer a second fix on top of an unconfirmed one.

## Code rules
- One way to do things: no second code path "just in case."
- No fallbacks: if a precondition fails, throw. Don't silently degrade (see the recommendation
  engine's EmptyProfileError for the pattern).
- No backup tables, no duplicate Supabase clients, no cached copies of data Postgres already owns.
- Let TypeScript catch type errors. Reserve runtime validation (Zod) for actual trust boundaries:
  AI extraction output, external API responses, user input. Don't re-validate data that already
  passed through one of those boundaries.
- Every recommendation must remain explainable from `breakdown` + `matchedNodes`. If a change to
  the scoring function can't be described in one sentence of the form "because you're interested
  in X," it doesn't belong in this function.
```

---

## 10. Explicit non-goals for v1

Naming these prevents scope creep mid-build:

- No dedicated graph database (Neo4j, etc.) — Postgres tables are the graph.
- No vector search / embeddings in the recommendation path — it would make scores unexplainable, which is the entire premise of this system. (Embeddings are fine as a *dedup* aid in Phase 1+ ingestion — that's a different job.)
- No ML-trained ranking model — the weighted formula in Section 3 is v1 and stays v1 until you have usage data suggesting otherwise.
- No multi-tenant/org accounts, no payments, no mobile app.
- No automated scraping in Phase 0 — hand-seeded data is faster to trust and faster to demo.
