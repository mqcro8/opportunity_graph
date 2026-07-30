# HANDOFF.md

## What's been done (Phase 0 — complete)

**Infrastructure**
- Next.js 14 App Router project at repo root
- Supabase client setup: browser (`lib/db.ts`), server (`lib/supabase/server.ts`), middleware (`middleware.ts`)
- `.env.local` configured with Supabase keys
- Zod installed for trust boundary validation
- `.gitignore` — covers node_modules, .next, .env.local, build artifacts
- `README.md` — setup instructions, architecture overview, project structure
- `.eslintrc.json` — extends `next/core-web-vitals`, ESLint pinned to v8

**Database (Supabase)**
- Full schema migrated: `graph_nodes`, `graph_edges`, `sources`, `opportunities`, `opportunity_nodes`, `profiles`, `profile_nodes`, `interactions`, `ingestion_logs`
- Row Level Security enabled on profiles, profile_nodes, interactions, opportunities
- Seed data: 29 graph nodes, 15 real opportunities (scholarships, hackathons, competitions, etc.), 19 graph edges, ~35 opportunity-node links

**Core lib**
- `lib/recommendations.ts` — Scoring engine: interest (40%), eligibility (25%), deadline (15%), experience (10%), popularity (10%). Uses 2-hop graph expansion.
- `lib/graph.ts` — BFS graph traversal via Supabase queries
- `lib/explain.ts` — Template-based "why am I seeing this" generation
- `lib/extraction.ts` — Zod schema for AI-extracted opportunities
- `lib/errors.ts` — `EmptyProfileError` (thrown when profile has no graph nodes)
- `lib/constants.ts` — `SCORE_MAX` shared between server and client

**API routes**
- `GET/POST /api/profile` — Read/upsert profile + linked graph nodes
- `GET /api/recommendations` — Returns scored recommendations for authenticated user
- `POST /api/interactions` — Track saved/applied/dismissed
- `GET /api/opportunities/[slug]` — Single opportunity with matched nodes
- `POST /api/auth/logout` — Sign out endpoint

**Pages**
- `/login` — Email/password auth (login + signup toggle)
- `/dashboard` — Server-rendered ranked feed from real recommendation engine
- `/opportunities/[slug]` — Detail page with score breakdown + explanation
- `/profile` — 4-step onboarding: Grade → Interests → Languages → Goals, persists to Supabase
- `/admin/ingestion` — Review queue, approve/reject updates status in Supabase
- `/auth/callback` — OAuth callback handler
- `/auth/logout` — Sign out endpoint

**Components**
- `Nav` — Auth-aware (shows email + logout when signed in)
- `OpportunityRow` — Feed row with match %, deadline badge, matched nodes
- `ScoreBreakdown` — Visual progress bars for each scoring dimension
- UI primitives: `Button`, `Card`, `Badge`, `ProgressBar`

---

## What's left

**Phase 1 — real ingestion**
- [ ] Wire Gemini Flash extraction pipeline (`lib/extraction.ts` schema exists, need the actual API call + prompt)
- [ ] `/api/ingest/[sourceId]/route.ts` — Cron-triggered ingestion endpoint protected by `CRON_SECRET`
- [ ] `vercel.json` with cron schedule for tier 1 sources
- [ ] Interaction tracking feeding the popularity score (currently popularity is a flat 5/10)
- [ ] Weekly digest email (Resend + Vercel Cron)

**Phase 1.5 — polish**
- [ ] Wire the "Save" button on opportunity detail to `POST /api/interactions` (currently HTML form, needs client-side fetch for better UX)
- [ ] Error boundaries / loading states on dashboard and profile
- [ ] `GET /api/opportunities` list endpoint (currently only slug-based detail exists)
- [ ] Dedup check at insert time (fuzzy match on title + organization)
- [ ] Google sign-in/up — Enable Google provider in Supabase Auth dashboard, add OAuth button to login page via `supabase.auth.signInWithOAuth({ provider: 'google' })`

**Phase 2 — scale and community**
- [ ] Tier 2 community sources with stricter review
- [ ] User-submitted opportunities with moderation queue
- [ ] Deadline reminders
- [ ] Public read API over verified opportunities
- [ ] Graph visualization page (`/graph` with `react-force-graph`)

---

## Notes

- **No fallbacks by design.** If a precondition fails, the system throws. `EmptyProfileError` surfaces as an onboarding prompt, not fake recommendations.
- **One scoring path.** The weighted formula in `lib/recommendations.ts` is v1. Don't add alternative ranking strategies — wait for usage data first.
- **`SCORE_MAX` is the single source of truth** for progress bar ceilings. Import from `lib/constants.ts`, don't duplicate the numbers.
- **Opportunities need a `slug` column.** The migration includes it; the types expect it. If you add opportunities via API, generate a slug from the title.
- **RLS means client-side reads are safe but writes to opportunities must go through server routes** using the service role key. No client-side insert policy on opportunities exists intentionally.
- **The recommendation engine runs on-demand per request.** No caching layer yet — add one only if query timing proves it's needed.
- **Font:** Newsreader is loaded from Google Fonts via `next/font`. The build warning about font overrides is cosmetic.
- **ESLint:** Pinned to v8 for Next.js 14 compatibility. Don't upgrade to v9+ without also upgrading Next.js.
- **Login page:** After signup, the user is silently flipped back to the login form with no indication they need to check their email. A "Check your email" confirmation screen was attempted but reverted due to a UI issue — revisit in Phase 1.5.
- **Old directory:** The `opportunity-graph-ui/` subdirectory was the original location before moving everything to repo root. It can be deleted if it still exists.

---

## Session 2 — bug fixes and scoring fix

**Logout redirect** (`app/auth/logout/route.ts`)
- Was redirecting to `process.env.NEXT_PUBLIC_SUPABASE_URL/login` (the Supabase dashboard) instead of the app's login page
- Fixed: now accepts `request` param and redirects to `${origin}/login`

**"Save" button on opportunity detail** (`components/save-button.tsx`, `app/opportunities/[slug]/page.tsx`)
- Form was submitting `application/x-www-form-urlencoded` to an endpoint expecting JSON
- Extracted a `SaveButton` client component that POSTs JSON via `fetch()`

**Profile save error visibility** (`app/profile/page.tsx`, `app/api/profile/route.ts`)
- API route's `DELETE` on `profile_nodes` had no error check — silent failures possible
- Client had no error display when `matchedCount === 0`
- Added `saveError` state to profile page showing unmatched names or API errors
- Added `deleteError` check in API route
- Response now includes `unmatchedNames` for debugging

**RLS on reference tables** (run this SQL if not already done)
```sql
alter table graph_nodes disable row level security;
alter table graph_edges disable row level security;
alter table opportunity_nodes disable row level security;
alter table sources disable row level security;
alter table ingestion_logs disable row level security;
```

**Scoring scale fix** (`lib/constants.ts`, `app/opportunities/[slug]/page.tsx`)
- `SCORE_MAX` changed from `{interest: 40, eligibility: 25, deadline: 15, experience: 10, popularity: 10}` to all `100`
- Each component score now returns 0–100, weights produce a true 0–100 final score
- Previously the theoretical max was ~27% — now a perfect match shows 100%
- Detail page breakdown values scaled to match; total uses weighted formula instead of raw sum
