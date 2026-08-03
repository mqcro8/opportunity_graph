# HANDOFF.md

## What's been done

Phase 0 (core loop) is complete and **V1 has shipped** — the app is live at https://opportunity-graph.vercel.app (production, `master`) and was submitted to a Devpost hackathon; the `changes_to_opportunities` branch is the staging phase. The per-session notes below (Sessions 2–9) document everything added since. This summary reflects the current tree.

**Infrastructure**
- Next.js 14 App Router project at repo root
- Supabase clients: browser (`lib/db.ts`), server (`lib/supabase/server.ts`), middleware (`lib/supabase/middleware.ts` + `middleware.ts`), service-role admin (`lib/supabase/admin.ts`)
- `.env.local` configured with Supabase keys
- Zod installed for trust boundary validation
- `.gitignore` — covers node_modules, .next, .env.local, build artifacts
- `README.md` — setup instructions, architecture overview, project structure
- `.eslintrc.json` — extends `next/core-web-vitals`, ESLint pinned to v8
- **Deployed to Vercel** — production at https://opportunity-graph.vercel.app (`master` branch); the `changes_to_opportunities` branch is the staging phase (own Vercel preview deployment)
- **Submitted to a Devpost hackathon** (V1)

**Database (Supabase)**
- Full schema migrated: `graph_nodes`, `graph_edges`, `sources`, `opportunities`, `opportunity_nodes`, `profiles`, `profile_nodes`, `interactions`, `ingestion_logs` (migrations 001–005 in `supabase/migrations/`)
- Row Level Security enabled on profiles, profile_nodes, interactions, opportunities; disabled on the reference tables (graph_nodes, graph_edges, opportunity_nodes, sources, ingestion_logs)
- Seed data: 29 graph nodes, 16 real opportunities (scholarships, hackathons, competitions, etc.), 19 graph edges, 36 opportunity-node links (migration 001; migration 003 backfills the 11 category hub nodes)
- Migration 005 expands the taxonomy: new `audience` node type + 24 nodes (6 fields, 4 skills, 3 interests, 5 languages, 5 regions, "Open to All") and 20 edges so new subjects reach the existing hubs (Session 6)
- Live DB contents are in flux — as of the latest check: 13 sources, 3 verified opportunities, 29 in the `pending_review` queue (more are incoming)

**Core lib**
- `lib/recommendations.ts` — Scoring engine: interest (40%), eligibility (25%), deadline (15%), experience (10%), popularity (10%). Uses 2-hop graph expansion. `eligibilityScore`/`experienceScore`/`popularityScore` are stubs. `getRecommendations(profileId, limit?)` — `limit` is optional; when omitted it returns the full ranked list (dashboard paginates over it). `/api/recommendations` still passes an explicit 20 (Session 9)
- `lib/graph.ts` — BFS graph traversal via Supabase queries
- `lib/linking.ts` — Auto-linking: category hub + keyword-matched nodes (`NODE_KEYWORDS`), plus `GOAL_NODE_MAP` so profile goals resolve to real graph nodes. `suggestNodeSlugs()` exposes the auto-link logic; `linkOpportunityToNodes()` accepts explicit slugs so admins can hand-tag (Session 6)
- `lib/explain.ts` — Template-based "why am I seeing this" generation
- `lib/extraction.ts` — Zod schema + Gemini 2.5 Flash extraction (`extractFromUrl`/`extractFromHtml`)
- `lib/admin.ts` — `requireAdmin()` gating (`ADMIN_EMAIL`); middleware redirects for all `/admin/*`
- `lib/errors.ts` — `EmptyProfileError` (thrown when profile has no graph nodes)
- `lib/constants.ts` — `SCORE_MAX` shared between server and client, plus `OPPORTUNITY_TYPES`, `SOURCE_TIERS`, and `PAGE_SIZE` (10) for the filter/pagination UI (Session 9)
- `lib/utils.ts` — `cn`, `slugify`, `formatDate`, `getDeadlineInfo`

**API routes**
- `GET/POST /api/profile` — Read/upsert profile + linked graph nodes; `DELETE` deletes the Supabase account (cascades wipe profile data)
- `GET /api/recommendations` — Returns scored recommendations for authenticated user
- `POST /api/interactions` — Track saved/applied/dismissed
- `GET /api/opportunities/[slug]` — Single opportunity with matched nodes
- `GET|POST /api/ingest/[sourceId]` — Ingestion endpoint protected by `CRON_SECRET`
- `GET /api/admin/ingestion` — Review queue with server-side filters + pagination (`status`, `type`, `tag`, `page`, `pageSize`; returns `{ queue, total, page, pageSize }`) (Session 9)
- `POST /api/admin/opportunities` + `PATCH /api/admin/opportunities/[id]` — Create verified opportunity (auto-links nodes or accepts explicit `tags`) / approve-reject status
- `GET /api/admin/opportunities` + `GET|PUT /api/admin/opportunities/[id]` — List with the same `status`/`type`/`tag`/`page`/`pageSize` filters (count via `{ count: "exact" }` + `.range()`) for the edit index; full edit incl. tags (Session 6; pagination/filters Session 9)
- `GET|POST /api/admin/graph-nodes` — List all graph nodes (grouped by type) and create a tag on the fly (Session 6)
- `POST /api/admin/sources` — Create source
- `/auth/callback` — OAuth callback handler
- `/auth/logout` — Sign out endpoint

**Pages**
- `/login` — Email/password auth (login + signup toggle), sign-up consent checkboxes, "Check your email" confirmation
- `/dashboard` — Server-rendered ranked feed from real recommendation engine + Source Directory card. Filters by type + graph-node tag via URL params (`?type=…&tag=…&page=…`), paginated 10/page (Session 9)
- `/opportunities/[slug]` — Detail page with score breakdown + explanation + Save button
- `/profile` — 4-step onboarding: Grade (Nickname + GPA) → Interests → Languages → Goals, persists to Supabase; danger-zone account deletion. Interest/Language options load from `graph_nodes` (Session 6)
- `/sources` — Full source directory (tier-ordered list with `description` + `last_run_at`); tier chip filter + name search + pagination via URL params (Session 9)
- `/admin` — Admin landing; `/admin/ingestion` (approve/reject) + `/admin/ingestion/[id]` (full review: see all AI-extracted fields, edit, then approve/reject) (Session 7); `/admin/opportunities` (index with Edit links); `/admin/opportunities/new`; `/admin/opportunities/[id]/edit` (Session 6); `/admin/sources/new`. Both list pages gained status/type/tag filters + pagination (Session 9)
- `/terms`, `/privacy` — Legal pages rendered from `TERMS_OF_SERVICE.md` / `PRIVACY_POLICY.md` via `MarkdownPage`

**Components**
- `Nav` — Auth-aware (shows `display_name` or email + logout when signed in) with theme toggle
- `OpportunityRow` — Feed row with match %, deadline badge, all tags (matched highlighted, Session 6)
- `ScoreBreakdown` — Visual progress bars for each scoring dimension
- `SaveButton` — Client-side `fetch` POST to `/api/interactions`
- `SourceDirectory` / `SourceList` — Dashboard source card + shared row markup
- `TagPicker` — Searchable, type-grouped tag multi-select + inline tag creation (Session 6); now exports `TYPE_LABELS` / `TYPE_ORDER` for reuse (Session 9)
- `AdminOpportunityForm` — Shared create/edit form (`components/admin/opportunity-form.tsx`, Session 6). Now `forwardRef`-based: exposes `save()` + an `extraActions` slot, and exports the shared `dbToForm()` helper (Session 7)
- `Pagination` — Numbered pager (prev/next + windowed page links with ellipsis, "X–Y of N"); link-based so it works from server pages (Session 9)
- `OpportunityFilters` — Shared type `<select>` + searchable single-select graph-node tag picker (presentational/controlled; used by admin lists and dashboard) (Session 9)
- `DashboardFilters` — Thin client wrapper wiring `OpportunityFilters` to the dashboard URL (Session 9)
- `SourceFilters` — Tier chips + name search for `/sources` (Session 9)
- `StatusFilter` — All/Pending review/Verified/Archived chips for the admin lists (Session 9)
- `ThemeProvider` / `ThemeToggle` — next-themes dark mode
- `MarkdownPage` — `react-markdown` wrapper with `.prose` styles
- UI primitives: `Button`, `Card`, `Badge`, `ProgressBar`, `Field`

---

## What's left

**Phase 1 — real ingestion**
- [x] Wire Gemini Flash extraction pipeline — `lib/extraction.ts` has the real API call (`extractFromUrl`/`extractFromHtml`, Gemini 2.5 Flash, temperature 0.1, `response_mime_type: application/json`) + prompt, not just the schema. Shipped in Session 3.
- [x] `/api/ingest/[sourceId]/route.ts` — Ingestion endpoint protected by `CRON_SECRET` (query param or header; passes through when the env var is unset). Ships as `pending_review`, logs to `ingestion_logs`, updates `sources.last_run_at`. Tested on MLH in Session 3. No cron schedule yet — see next item.
- [ ] `vercel.json` with cron schedule for tier 1 sources — ingest route exists but nothing triggers it on a schedule yet
- [ ] Interaction tracking feeding the popularity score — `POST /api/interactions` and the Save button exist, but `popularityScore()` is still a flat 50/100 stub (`lib/recommendations.ts:80`)
- [ ] Weekly digest email (Resend + Vercel Cron)

**Phase 1.5 — polish**
- [x] Wire the "Save" button on opportunity detail to `POST /api/interactions` — `components/save-button.tsx` POSTs JSON via `fetch` (shipped in Session 2)
- [ ] Error boundaries / loading states — basic loading states exist on profile and dashboard; no React error boundary components yet
- [ ] `GET /api/opportunities` list endpoint (currently only slug-based detail exists)
- [ ] Dedup check at insert time — slug-exact dedup exists in both the ingest route and `POST /api/admin/opportunities`; fuzzy match on `title + organization` is not implemented
- [ ] Google sign-in/up — Enable Google provider in Supabase Auth dashboard, add OAuth button to login page via `supabase.auth.signInWithOAuth({ provider: 'google' })`
- [x] Source Directory on dashboard — Bottom-of-dashboard card showing the top 3 most relevant sources for the profile (count of recommended opportunities, tie-break tier then name; falls back to tier order in empty states) with the copy *"Don't see what you're looking for? Browse these official directories directly"* and a "View the full list of sources" link. `/sources` lists every source (name + link to `base_url` + tier badge + `description` + `last_run_at`); `sources.description` came from migration 002.

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
- **Login page:** After signup the user sees a "Check your email" confirmation screen (`app/login/page.tsx`) with a "Back to sign in" option. The sign-up mode also requires two checkboxes (13-or-older + ToS/Privacy acceptance) before submit is enabled.
- **Old directory:** The `opportunity-graph-ui/` subdirectory (the pre-root location) no longer exists.
- **Dead code:** `lib/mock-data.ts` was deleted in Session 6 (it no longer compiled after `Opportunity.tags` was added). The only remaining unused export is `isAdminEmail` in `lib/admin.ts`.
- **Tags are graph nodes.** There is no separate `tags` column — an opportunity's tags ARE its `opportunity_nodes` links. Admin-selected tags are authoritative; the category hub is always added. `Opportunity.tags` (all labels) is distinct from `ScoredOpportunity.matchedNodes` (the scoring subset).
- **Scoring stubs:** `eligibilityScore()` always returns 100, and `experienceScore()` / `popularityScore()` always return half the max — the first because real profile-vs-opportunity eligibility matching isn't wired yet, the latter two because interactions don't feed the engine yet.

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

**RLS on reference tables** (applied — the reference tables are public-read and only written via the service role, so their RLS is off)
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

---

## Session 3 — auto-linking, admin forms, and real ingestion

**Auto-linking system** (`lib/linking.ts`)
- Every opportunity now links to a category hub node (hackathons, scholarships, ...) plus any graph nodes matched from title/org/description via a word-boundary keyword map
- `GOAL_NODE_MAP` — profile goals now resolve to real graph nodes, fixing "Join a hackathon" matching nothing
- `linkOpportunityToNodes()` is used by BOTH the admin form and the ingestion pipeline — one linking path

**Gemini extraction pipeline** (`lib/extraction.ts`)
- `extractFromUrl()` / `extractFromHtml()` — fetch page → Gemini 2.5 Flash prompt → JSON → Zod validation (`response_mime_type: application/json`, temperature 0.1)
- Added `description` field to the `ExtractedOpportunity` schema

**Ingestion endpoint** (`app/api/ingest/[sourceId]/route.ts`)
- GET + POST, protected by `CRON_SECRET` (query param `cron_secret` or header `x-cron-secret`); passes through when the env var is unset
- Scrapes `scrape_config.urls` (falls back to `base_url`), inserts as `pending_review`, logs to `ingestion_logs`, updates `sources.last_run_at`
- TESTED: MLH run produced 30 rows (data quality was poor — user deleted them manually, see Notes)

**Admin** (gated by `ADMIN_EMAIL`)
- `lib/admin.ts` `requireAdmin()` + middleware redirect for all `/admin/*`
- `/admin` landing page, `/admin/opportunities/new` (full form incl. eligibility object; saves as `verified`; shows auto-linked nodes as badges), `/admin/sources/new`
- `POST /api/admin/opportunities` (Zod-validated, slug dedup, verified + auto-link) and `POST /api/admin/sources`

**Profile fix** (`app/api/profile/route.ts`)
- Goals now map to nodes via `GOAL_NODE_MAP` instead of exact name matching (which matched nothing)

**Migrations** (run in Supabase SQL editor)
- `002_sources_description.sql` — `sources.description` column (for the Phase 1.5 Source Directory)
- `003_category_nodes.sql` — 11 category hub nodes + backfill links for existing opportunities

**Env vars** (`.env.local`)
- `GEMINI_API_KEY` (from aistudio.google.com/apikey), `CRON_SECRET` (any random string), `ADMIN_EMAIL` (must equal your Supabase account email)

**Shared util**
- `slugify()` moved to `lib/utils.ts` (previously duplicated inline in the ingest route)

**Notes / actions for next session**
- Migrations 002 + 003 are in `supabase/migrations/` and applied to the live DB
- `ADMIN_EMAIL` is set in `.env.local` (must equal your Supabase account email)
- Re-save the profile once (`/profile`) so goal→node mapping applies — already done for the current account
- The 30 MLH-ingested rows were deleted manually (incomplete data); starting fresh with manually-input opportunities via the admin form
- `eligibilityScore` currently always returns 100 — real profile-vs-opportunity matching is not wired yet
- The `401` from `/api/ingest` was a missing `CRON_SECRET` env var, not a code bug

---

## Session 4 — legal pages, dark mode, consent, account deletion, and profile restructure

**Legal pages** (`app/terms/page.tsx`, `app/privacy/page.tsx`, `components/markdown-page.tsx`)
- Installed `react-markdown`; both pages read `TERMS_OF_SERVICE.md` / `PRIVACY_POLICY.md` from disk at build time via the shared `MarkdownPage` wrapper, styled with `.prose` rules in `globals.css`
- ToS links to `/privacy` and Privacy links to `/terms`
- The .md docs were updated in place: self-service account deletion documented in Privacy §6/§8 and ToS §4

**Dark mode** (next-themes)
- Installed `next-themes`; `components/theme-provider.tsx` wraps the app (`attribute="class" defaultTheme="system"`), `suppressHydrationWarning` on `<html>`
- `components/theme-toggle.tsx` — Sun/Moon toggle in the nav
- Home-page SVG got `dark:` fill/stroke variants; everything else was already token-based (`darkMode: "class"` + `.dark` vars pre-existed in `globals.css`)

**Sign-up consent + account deletion**
- Login page: two required checkboxes in sign-up mode — "13 years old or older" and ToS/Privacy acceptance (with links); submit disabled until both checked; states reset on mode switch
- `DELETE /api/profile` — server-client auth check, then `admin.auth.admin.deleteUser(user.id)` via `createAdminClient()`; FK cascades wipe `profiles` / `profile_nodes` / `interactions`
- Profile page: two-step "Delete account" danger zone below the onboarding card; on success signs out and redirects to `/`
- Requires `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`

**Profile restructure** (full_name → display_name)
- Migration `004_profile_display_name.sql` — `rename column full_name to display_name; drop column university_status;`
- `POST /api/profile` accepts `display_name` (nullable) + `gpa`; no longer writes `university_status`
- Grade step now has optional Nickname + GPA (0–4) inputs; both hydrate on load and save via `POST /api/profile`
- Nav shows `display_name` instead of email (falls back to email)
- `eligibilityScore` still a stub (always 100) — GPA is captured but not yet used in scoring

**Sticky footer** (`app/layout.tsx`)
- Body → `flex min-h-screen flex-col`; `<main>` → `flex-1` so the footer anchors to the bottom on short pages

**Deps added:** react-markdown, next-themes

**Actions for next session**
- Migration `004_profile_display_name.sql` is applied in the live DB (renames `full_name` → `display_name`, drops `university_status`)
- Full `full_name` was never shown anywhere; any pre-existing values now live under `display_name`

---

## Session 5 — Source Directory

**Source Directory on dashboard** (`components/source-directory.tsx`, `app/dashboard/page.tsx`)
- New server component: Card with the copy *"Don't see what you're looking for? Browse these official directories directly"*, one row per source (external link to `base_url`, `Tier {n}` badge, `description`, `last_run_at`)
- Dashboard restructured into a single return so the directory renders in every state (feed + no-profile / no-nodes / no-matches empty states)
- `lib/utils.ts`: added `formatDate()` (null → "Never run")

**Relevant sources + full list** (`app/sources/page.tsx`, `lib/types.ts`, `lib/recommendations.ts`)
- Dashboard card now shows the top 3 sources ranked by count of recommended opportunities from that source (`DASHBOARD_SOURCE_LIMIT`), tie-broken by tier then name; empty states fall back to tier/name order
- Added `sourceId` to the `Opportunity` type (`lib/types.ts`) and mapped `source_id` through in `getRecommendations()` — no schema change, the DB query already selected `*`
- "View the full list of sources →" footer link to `/sources`
- New `/sources` page: auth-gated (redirects to `/login`), lists every source ordered by tier then name

**Cardless `/sources`** (`components/source-list.tsx`)
- Extracted the row markup into `SourceList` (+ `DirectorySource` interface) so `/sources` renders the list without the Card/legend; `SourceDirectory` reuses `SourceList` for the dashboard

**Notes / actions for next session**
- DB contents are in flux — more sources and opportunities are actively being added. Verify the live state in Supabase (at one point: 3 sources — MLH, Devpost, IYMC — plus 1 opportunity: "The Qualification Round 026 of IYMC").
- The `/admin/opportunities/new` form always sends an `eligibility` object; leaving it blank stores all-null + `countries: ["*"]` (global). Fine today because `eligibilityScore` is a stub that always returns 100, but wire real matching carefully — all-null eligibility would match everyone
- No migrations, env vars, or dependencies were added this session

---

## Session 6 — opportunity tags, admin tagging, graph-driven profiles

**Manual tags = graph nodes** (`supabase/migrations/005_tags_and_taxonomy.sql`)
- New `audience` node type (for "Open to All" labels); `graph_nodes_type_check` recreated to include it
- Seeded: fields (Math, Physics, Chemistry, Biology, Economics, History), skills (Writing, Debate, Design, Leadership), interests (Music, Art & Design, Literature), the missing languages (French, German, Portuguese, Arabic, Hindi), regions (Europe, Asia, Africa, Oceania, Middle East), audience (Open to All)
- Edges connect new subjects to the existing hubs (e.g. `math` → research / computer-science / data-analysis). Languages/regions/audience stay leaf nodes — they display as labels but never enter a student's graph expansion, so they can't dilute interest scores
- ⚠️ Apply migration 005 in the Supabase SQL editor — not applied to the live DB yet

**Admin tagging**
- `GET|POST /api/admin/graph-nodes` — list graph nodes (grouped by type) and create a tag on the fly; both admin-gated
- `POST /api/admin/opportunities` now accepts `tags` (node slugs): authoritative for linking, category hub always added, empty → auto-link fallback
- `GET /api/admin/opportunities` — list all opportunities for the edit index
- `GET|PUT /api/admin/opportunities/[id]` — full edit incl. tags (PUT deletes existing links and re-links exactly the sent tags + hub); `PATCH` unchanged for approve/reject
- `components/tag-picker.tsx` — searchable, type-grouped multi-select + inline "create a tag" (name + type → POST graph-nodes → auto-selected); created tags merge locally so no refetch needed
- `components/admin/opportunity-form.tsx` — shared create/edit form (fields + eligibility + tags); `/admin/opportunities/new` rebuilt on top of it
- New pages: `/admin/opportunities` (index with Edit links), `/admin/opportunities/[id]/edit`; admin landing gains an "All opportunities" card

**Graph-driven profiles** (`app/profile/page.tsx`)
- Interest + Language options now load from `graph_nodes` (types skill/interest/field and language) instead of hardcoded arrays — new tags surface for students automatically
- Hydration is type-filtered, fixing category/language nodes leaking into the Interests chips (they're now shown in their own steps)
- Goals expanded by 5: "Compete in a competition", "Get a fellowship", "Find a conference", "Earn a certification", "Get a grant" — all mapped in `GOAL_NODE_MAP` (`lib/linking.ts`)

**Tags in the recommendation path** (`lib/types.ts`, `lib/recommendations.ts`, `app/opportunities/[slug]/page.tsx`, `components/opportunity-row.tsx`)
- `Opportunity.tags` = every linked node name (full label set); `ScoredOpportunity.matchedNodes` stays the scoring/explanation subset
- `getRecommendations()` fetches the full tag set per opportunity (`allOppNodes`) in addition to the expansion-filtered matched nodes
- Feed cards and the detail page render ALL tags as badges — matched ones highlighted (`interest` variant), unmatched muted
- Scoring untouched: tags outside a student's 2-hop expansion never count, so descriptive labels ("Open to All", regions) don't change scores

**Housekeeping**
- Deleted `lib/mock-data.ts` (documented dead code; it no longer compiled after `Opportunity.tags` was added)

**Notes / actions for next session**
- Apply migration 005 in the Supabase SQL editor (live DB still lacks the new nodes/edges until then)
- Re-tag existing opportunities via `/admin/opportunities` → Edit (e.g. competitions → `math`, `open-to-all`, `global`)
- Verified: `npm run lint` + `npm run build` pass; no deps, env vars, or scoring changes this session

---

## Session 7 — ingestion review: view + edit before approve/reject

**Review page** (`app/admin/ingestion/[id]/page.tsx`)
- New client page: loads the item via `GET /api/admin/opportunities/[id]` and renders the full `OpportunityForm` pre-filled with everything Gemini captured — every field (description, deadline, eligibility, country, delivery mode, education level, URLs, tags) is visible and editable before you decide
- Header: status badge + "View official page" link (`source_url`, opens new tab) + "Back to review queue"
- **Approve** auto-saves your current edits (PUT) then flips status to `verified` (PATCH), then returns to the queue — no surprises, no forgetting to save; **Reject** archives directly. Save changes keeps it `pending_review`
- No API/DB changes — reuses the existing GET/PUT/PATCH `/api/admin/opportunities/[id]` endpoints

**Queue** (`app/admin/ingestion/page.tsx`)
- Every row now has a "View details" link → `/admin/ingestion/[id]`; pending rows keep inline Approve/Reject

**Shared form** (`components/admin/opportunity-form.tsx`)
- `OpportunityForm` is now `forwardRef`-based: exposes `save(): Promise<boolean>` (used by Approve to persist edits before verifying) and an optional `extraActions` slot rendered next to the Save button
- Exported `dbToForm()` (moved out of the edit page) — one shared DB→form conversion for the review and edit pages

**Edit page** (`app/admin/opportunities/[id]/edit/page.tsx`)
- Now imports the shared `dbToForm`; its inline copy was removed

**Notes / actions for next session**
- Both `PUT` (save edits) and `PATCH` (approve/reject) stamp `last_verified_at`, so "Save changes" on a still-pending item also updates that timestamp — harmless today; consider reserving it for actual verification
- Verified: `npm run lint` + `npm run build` pass; no deps, env vars, API, or DB changes this session

---

## Session 8 — deployment and hackathon submission

**V1 shipped**
- App is live at https://opportunity-graph.vercel.app (production, `master` branch)
- The `changes_to_opportunities` branch is the staging phase (own Vercel preview deployment)
- Submitted the app to a Devpost hackathon

**Live DB at submission**
- 13 sources, 3 verified opportunities, 29 in the `pending_review` queue — more are incoming

**Notes / actions for next session**
- No code, API, or DB changes this session — docs only
- Verified: `npm run lint` + `npm run build` pass
- Remaining open items are unchanged: `vercel.json` cron, weekly digest, fuzzy dedup, error boundaries, `GET /api/opportunities`, Google sign-in (see "What's left")

---

## Session 9 — filters + pagination for admin lists, dashboard, and sources

Motivation: with more opportunities and sources coming in, the admin/opportunities, admin/ingestion, dashboard, and /sources lists were printing everything at once. Added a filter per list and numbered pagination at 10 rows/page, all driven by URL search params so back/forward and shareable links work. No schema/migration changes.

**Shared constants** (`lib/constants.ts`)
- `OPPORTUNITY_TYPES` — the 11-type tuple, now the single source for the filter dropdowns; the zod enums in `POST /api/admin/opportunities` and `PUT /api/admin/opportunities/[id]` were refactored to `z.enum(OPPORTUNITY_TYPES)`
- `SOURCE_TIERS = [1, 2, 3]`, `PAGE_SIZE = 10`

**Server-side filtered + paginated admin APIs**
- `GET /api/admin/opportunities` and `GET /api/admin/ingestion` accept `status`, `type`, `tag` (graph-node slug), `page`, `pageSize`. Tag filter resolves slug → `graph_nodes` id → `opportunity_nodes` opportunity ids → `.in("id", …)`. Pagination uses `{ count: "exact" }` + `.range()`. Responses include `total`/`page`/`pageSize`.
- The `z.enum([...])` in the two write schemas now imports `OPPORTUNITY_TYPES`.

**Admin list pages** (`app/admin/opportunities`, `app/admin/ingestion`)
- Split each into a server `page.tsx` (passes `searchParams` as props) + a client list component (`opportunities-list.tsx` / `ingestion-queue.tsx`). Passing searchParams as props avoids `useSearchParams()`/Suspense on these statically-prerenderable routes.
- Filter UI: `StatusFilter` chips (All/Pending review/Verified/Archived) + `OpportunityFilters` (type `<select>` + searchable single-select tag picker). Changing a filter resets to page 1. List refetches when the URL changes.
- Ingestion rows keep inline Approve/Reject; after resolving, the page refetches so counts and the filtered set stay correct.

**Dashboard** (`app/dashboard/page.tsx`)
- `getRecommendations(profileId, limit?)` — `limit` is now optional and omitted on the dashboard, so pagination can grow past the old 20-cap; `/api/recommendations` still passes an explicit 20 to keep its contract.
- Type + tag filters applied to the scored list (tag matched by name against the opportunity's full `tags`), then sliced 10/page. Graph nodes are fetched server-side (RLS is off on `graph_nodes`) for the filter bar; `DashboardFilters` is a thin client wrapper that writes the URL.

**Sources** (`app/sources/page.tsx`)
- Tier chip filter + name search (`ilike` on `name`) + pagination, all server-side via search params.

**New components**
- `components/pagination.tsx` — link-based pager: Prev/Next + windowed page numbers with ellipsis + "X–Y of N". Renders `null` on a single page so it doesn't duplicate the page headers.
- `components/opportunity-filters.tsx` — presentational/controlled (no router): type select + searchable, type-grouped single-select tag dropdown. Reused by both admin lists and the dashboard.
- `components/dashboard-filters.tsx` — client wrapper wiring `OpportunityFilters` to the dashboard URL.
- `components/source-filters.tsx` — tier chips + debounced-on-Enter/blur name search.
- `components/status-filter.tsx` — admin status chips.
- `components/tag-picker.tsx` — now exports `TYPE_LABELS` / `TYPE_ORDER` so `OpportunityFilters` groups tags the same way.

**Notes / decisions**
- Tag filter is single-select for now; multi-tag AND filtering is a natural follow-up.
- Filters/pagination live in the URL (`?status=…&type=…&tag=…&page=…` / `?tier=…&q=…&page=…`); changing a filter drops `page`.
- The tag dropdown's "Open to All" etc. nodes are listed too — they're valid tags even if they never score.
- Verified: `npm run lint` + `npm run build` pass; no deps, env vars, API (other than the extended GETs), or DB changes this session.

---

## Session 10 — ingestion extraction: nullable application_url + visible validation drops

Diagnosis: the L'SPACE source (`https://www.lspace.asu.edu/our-programs`) reported `itemsFound: 0, itemsAdded: 0` with an empty `errors` array on every run. Reproduced the full pipeline (fetch → `htmlToText` → Gemini → Zod): the page is server-rendered Wix HTML yielding ~2.3k chars of readable text (well past the 100-char threshold, so not the "JS-rendered page" trap); Gemini correctly extracts all 5 programs; but every item was silently dropped by `ExtractedOpportunity.safeParse` because `application_url` was required (`z.string().url()`) while the page text has no per-program apply links — Gemini returned `null` rather than inventing URLs.

**Schema** (`lib/extraction.ts`)
- `application_url` is now `z.string().url().nullable()` — consistent with `delivery_mode`/`country`; the DB column (`application_url text`) was already nullable
- Validation failures now `console.warn` the per-item zod issues instead of dropping them invisibly (the root cause of the silent 0s)

**Ingestion route** (`app/api/ingest/[sourceId]/route.ts`)
- Insert falls back to the scraped page URL when `application_url` is null (`opp.application_url ?? url`) so every row stays actionable for the admin review

**Notes / actions for next session**
- Verified: `npm run lint` + `npx tsc --noEmit` pass; no deps, env vars, or DB changes
- Re-run the L'SPACE source (local or deployed) → expect `itemsFound: 5` (subject to slug dedup)
- If a source still reports 0 with no errors, check server logs for the `console.warn` line — that surfaces dropped-opportunity reasons that were previously invisible
