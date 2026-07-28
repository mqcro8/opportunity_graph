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
  relationship text not null,
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
  scrape_config jsonb,
  last_run_at timestamptz,
  created_at timestamptz not null default now()
);

create table opportunities (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references sources(id),
  slug text not null unique,
  title text not null,
  organization text not null,
  description text,
  opportunity_type text not null check (opportunity_type in
    ('scholarship','hackathon','olympiad','internship','summer_program',
     'conference','fellowship','competition','exchange','certification','grant')),
  application_deadline date,
  eligibility jsonb not null default '{}',
  country text,
  delivery_mode text check (delivery_mode in ('online','in_person','hybrid')),
  education_level text[],
  source_url text not null,
  application_url text,
  status text not null default 'pending_review' check (status in ('pending_review','verified','archived')),
  last_verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table opportunity_nodes (
  opportunity_id uuid references opportunities(id) on delete cascade,
  node_id uuid references graph_nodes(id) on delete cascade,
  relevance numeric not null default 1.0 check (relevance > 0 and relevance <= 1),
  primary key (opportunity_id, node_id)
);

-- ============ STUDENTS ============
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  current_grade text,
  university_status text,
  gpa numeric,
  languages text[] not null default '{}',
  goals text[] not null default '{}',
  preferences jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table profile_nodes (
  profile_id uuid references profiles(id) on delete cascade,
  node_id uuid references graph_nodes(id) on delete cascade,
  weight numeric not null default 1.0 check (weight > 0 and weight <= 1),
  source text not null default 'user_input',
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

-- ============ ROW LEVEL SECURITY ============
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

-- ============ SEED DATA ============

-- Graph nodes
insert into graph_nodes (type, name, slug) values
  ('skill', 'Python', 'python'),
  ('skill', 'JavaScript', 'javascript'),
  ('skill', 'Machine Learning', 'machine-learning'),
  ('skill', 'Web Development', 'web-development'),
  ('skill', 'Data Analysis', 'data-analysis'),
  ('skill', 'Robotics', 'robotics'),
  ('skill', 'Public Speaking', 'public-speaking'),
  ('skill', 'Technical Writing', 'technical-writing'),
  ('skill', 'Research', 'research'),
  ('interest', 'Artificial Intelligence', 'artificial-intelligence'),
  ('interest', 'Climate Science', 'climate-science'),
  ('interest', 'Biomedical Engineering', 'biomedical-engineering'),
  ('interest', 'Entrepreneurship', 'entrepreneurship'),
  ('interest', 'Social Impact', 'social-impact'),
  ('interest', 'Space Exploration', 'space-exploration'),
  ('field', 'Computer Science', 'computer-science'),
  ('field', 'Engineering', 'engineering'),
  ('field', 'Environmental Science', 'environmental-science'),
  ('field', 'Business', 'business'),
  ('field', 'Medicine', 'medicine'),
  ('university', 'MIT', 'mit'),
  ('university', 'Stanford', 'stanford'),
  ('university', 'Georgia Tech', 'georgia-tech'),
  ('language', 'English', 'english'),
  ('language', 'Spanish', 'spanish'),
  ('language', 'Mandarin', 'mandarin'),
  ('region', 'North America', 'north-america'),
  ('region', 'Latin America', 'latin-america'),
  ('region', 'Global', 'global');

-- Graph edges
insert into graph_edges (from_node_id, to_node_id, relationship, weight) values
  ((select id from graph_nodes where slug = 'artificial-intelligence'), (select id from graph_nodes where slug = 'python'), 'requires', 0.9),
  ((select id from graph_nodes where slug = 'artificial-intelligence'), (select id from graph_nodes where slug = 'machine-learning'), 'requires', 0.95),
  ((select id from graph_nodes where slug = 'artificial-intelligence'), (select id from graph_nodes where slug = 'computer-science'), 'part_of', 0.9),
  ((select id from graph_nodes where slug = 'machine-learning'), (select id from graph_nodes where slug = 'data-analysis'), 'related_to', 0.7),
  ((select id from graph_nodes where slug = 'robotics'), (select id from graph_nodes where slug = 'engineering'), 'part_of', 0.85),
  ((select id from graph_nodes where slug = 'robotics'), (select id from graph_nodes where slug = 'python'), 'requires', 0.6),
  ((select id from graph_nodes where slug = 'web-development'), (select id from graph_nodes where slug = 'javascript'), 'requires', 0.95),
  ((select id from graph_nodes where slug = 'web-development'), (select id from graph_nodes where slug = 'computer-science'), 'part_of', 0.5),
  ((select id from graph_nodes where slug = 'climate-science'), (select id from graph_nodes where slug = 'environmental-science'), 'part_of', 0.9),
  ((select id from graph_nodes where slug = 'climate-science'), (select id from graph_nodes where slug = 'data-analysis'), 'related_to', 0.6),
  ((select id from graph_nodes where slug = 'biomedical-engineering'), (select id from graph_nodes where slug = 'engineering'), 'part_of', 0.8),
  ((select id from graph_nodes where slug = 'biomedical-engineering'), (select id from graph_nodes where slug = 'medicine'), 'related_to', 0.7),
  ((select id from graph_nodes where slug = 'entrepreneurship'), (select id from graph_nodes where slug = 'business'), 'part_of', 0.8),
  ((select id from graph_nodes where slug = 'social-impact'), (select id from graph_nodes where slug = 'entrepreneurship'), 'related_to', 0.5),
  ((select id from graph_nodes where slug = 'space-exploration'), (select id from graph_nodes where slug = 'engineering'), 'requires', 0.7),
  ((select id from graph_nodes where slug = 'space-exploration'), (select id from graph_nodes where slug = 'research'), 'related_to', 0.8),
  ((select id from graph_nodes where slug = 'mit'), (select id from graph_nodes where slug = 'computer-science'), 'related_to', 0.8),
  ((select id from graph_nodes where slug = 'stanford'), (select id from graph_nodes where slug = 'computer-science'), 'related_to', 0.8),
  ((select id from graph_nodes where slug = 'georgia-tech'), (select id from graph_nodes where slug = 'engineering'), 'related_to', 0.8);

-- Source
insert into sources (name, tier, base_url) values
  ('Hand-seeded Phase 0', 1, 'https://example.com');

-- Opportunities with slugs
insert into opportunities (source_id, slug, title, organization, description, opportunity_type, application_deadline, eligibility, country, delivery_mode, education_level, source_url, application_url, status) values
  ((select id from sources where name = 'Hand-seeded Phase 0'),
   'regeneron-science-talent-search', 'Regeneron Science Talent Search', 'Regeneron',
   'One of the most prestigious pre-college science competitions in the US. Students submit original research projects in STEM fields.',
   'competition', '2026-11-12',
   '{"min_grade": "12", "max_grade": "12", "countries": ["US"], "age_min": null, "age_max": null}',
   'United States', 'in_person', ARRAY['high_school'],
   'https://www.societyforscience.org/regeneron-sts', 'https://www.societyforscience.org/regeneron-sts/apply', 'verified'),

  ((select id from sources where name = 'Hand-seeded Phase 0'),
   'google-science-fair', 'Google Science Fair', 'Google',
   'A global online science competition for students aged 13-18. Encourages innovative scientific projects.',
   'competition', '2026-10-01',
   '{"min_grade": "9", "max_grade": "12", "countries": ["*"], "age_min": 13, "age_max": 18}',
   'Global', 'online', ARRAY['high_school'],
   'https://www.googlesciencefair.com', 'https://www.googlesciencefair.com/en-us/apply', 'verified'),

  ((select id from sources where name = 'Hand-seeded Phase 0'),
   'mit-beaver-works-summer-institute', 'MIT Beaver Works Summer Institute', 'MIT',
   'A residential summer program in applied engineering and AI for high school students. Hands-on projects with MIT faculty.',
   'summer_program', '2026-10-13',
   '{"min_grade": "10", "max_grade": "12", "countries": ["*"], "age_min": 15, "age_max": 18}',
   'United States', 'in_person', ARRAY['high_school'],
   'https://beaverworks.ll.mit.edu', 'https://beaverworks.ll.mit.edu/bwsi/apply', 'verified'),

  ((select id from sources where name = 'Hand-seeded Phase 0'),
   'first-robotics-competition', 'FIRST Robotics Competition', 'FIRST',
   'An international robotics competition for high school teams. Students build and program robots to compete in annual challenges.',
   'competition', '2026-09-15',
   '{"min_grade": "9", "max_grade": "12", "countries": ["*"], "age_min": 14, "age_max": 18}',
   'Global', 'in_person', ARRAY['high_school'],
   'https://www.firstinspires.org/robotics/frc', 'https://www.firstinspires.org/robotics/frc/apply', 'verified'),

  ((select id from sources where name = 'Hand-seeded Phase 0'),
   'fulbright-garcia-robles-scholarship', 'Fulbright-Garcia Robles Scholarship', 'CONACYT / Fulbright',
   'A binational scholarship funding graduate study and research in the United States for Mexican citizens.',
   'scholarship', '2026-08-27',
   '{"min_grade": null, "max_grade": null, "countries": ["MX"], "age_min": null, "age_max": null}',
   'Mexico', 'hybrid', ARRAY['graduate'],
   'https://fulbright-garciarobles.org.mx', 'https://fulbright-garciarobles.org.mx/apply', 'verified'),

  ((select id from sources where name = 'Hand-seeded Phase 0'),
   'generation-google-scholarship', 'Generation Google Scholarship', 'Google',
   'A scholarship for students in CS, computer engineering, or a closely related field who demonstrate a passion for technology.',
   'scholarship', '2026-12-01',
   '{"min_grade": null, "max_grade": null, "countries": ["US", "CA"], "age_min": null, "age_max": null}',
   'United States', 'online', ARRAY['undergraduate', 'graduate'],
   'https://buildyourfuture.withgoogle.com/scholarships', 'https://buildyourfuture.withgoogle.com/scholarships/generation-google-scholarship/apply', 'verified'),

  ((select id from sources where name = 'Hand-seeded Phase 0'),
   'international-physics-olympiad', 'International Science Olympiad — IPhO', 'International Physics Olympiad',
   'Annual international physics competition for high school students. Each country sends a team of up to 5 students.',
   'olympiad', '2026-07-01',
   '{"min_grade": "9", "max_grade": "12", "countries": ["*"], "age_min": null, "age_max": 20}',
   'Global', 'in_person', ARRAY['high_school'],
   'https://www.ipho-new.org', 'https://www.ipho-new.org/registration', 'verified'),

  ((select id from sources where name = 'Hand-seeded Phase 0'),
   'amazon-future-engineer-scholarship', 'Amazon Future Engineer Scholarship', 'Amazon',
   'A scholarship for high school seniors planning to study computer science. Includes a paid summer internship at Amazon.',
   'scholarship', '2026-03-01',
   '{"min_grade": "12", "max_grade": "12", "countries": ["US"], "age_min": null, "age_max": null}',
   'United States', 'in_person', ARRAY['high_school'],
   'https://www.aboutamazon.com/impact/education/amazon-future-engineer', 'https://www.aboutamazon.com/impact/education/amazon-future-engineer/scholarships', 'verified'),

  ((select id from sources where name = 'Hand-seeded Phase 0'),
   'mit-app-inventor-hackathon', 'MIT App Inventor Hackathon', 'MIT',
   'A beginner-friendly hackathon focused on building mobile apps using MIT App Inventor. Open to students worldwide.',
   'hackathon', '2026-09-20',
   '{"min_grade": "6", "max_grade": "12", "countries": ["*"], "age_min": 11, "age_max": 18}',
   'Global', 'online', ARRAY['middle_school', 'high_school'],
   'https://appinventor.mit.edu', 'https://appinventor.mit.edu/hackathon/register', 'verified'),

  ((select id from sources where name = 'Hand-seeded Phase 0'),
   'stanford-ai4all', 'Stanford AI4ALL', 'Stanford University',
   'A three-week summer program introducing high school students from underrepresented groups to artificial intelligence.',
   'summer_program', '2026-02-01',
   '{"min_grade": "9", "max_grade": "11", "countries": ["US", "CA"], "age_min": 14, "age_max": 17}',
   'United States', 'in_person', ARRAY['high_school'],
   'https://ai4all.io/programs/stanford', 'https://ai4all.io/programs/stanford/apply', 'verified'),

  ((select id from sources where name = 'Hand-seeded Phase 0'),
   'microsoft-imagine-cup', 'Microsoft Imagine Cup', 'Microsoft',
   'A global student technology competition where teams build innovative apps using Microsoft technologies.',
   'competition', '2026-10-15',
   '{"min_grade": null, "max_grade": null, "countries": ["*"], "age_min": 16, "age_max": null}',
   'Global', 'online', ARRAY['undergraduate', 'graduate'],
   'https://imaginecup.microsoft.com', 'https://imaginecup.microsoft.com/en-us/compete', 'verified'),

  ((select id from sources where name = 'Hand-seeded Phase 0'),
   'davidson-fellows-scholarship', 'Davidson Fellows Scholarship', 'Davidson Institute',
   'A scholarship for students 18 and under who have completed a significant piece of work in STEM, literature, music, or philosophy.',
   'scholarship', '2026-09-15',
   '{"min_grade": null, "max_grade": null, "countries": ["US"], "age_min": null, "age_max": 18}',
   'United States', 'online', ARRAY['high_school'],
   'https://www.davidsoninstitute.org/davidson-fellows', 'https://www.davidsoninstitute.org/davidson-fellows/apply', 'verified'),

  ((select id from sources where name = 'Hand-seeded Phase 0'),
   'tec-monterrey-global-innovation-challenge', 'Tec de Monterrey — Global Innovation Challenge', 'Tec de Monterrey',
   'A competition for university students to propose innovative solutions to UN Sustainable Development Goals.',
   'competition', '2026-11-30',
   '{"min_grade": null, "max_grade": null, "countries": ["*"], "age_min": 18, "age_max": 25}',
   'Global', 'hybrid', ARRAY['undergraduate'],
   'https://www.tec.mx/en/innovation-challenge', 'https://www.tec.mx/en/innovation-challenge/register', 'verified'),

  ((select id from sources where name = 'Hand-seeded Phase 0'),
   'jpmorgan-code-for-good-hackathon', 'Code for Good Hackathon', 'JPMorgan Chase',
   'A 24-hour hackathon where students build tech solutions for nonprofit organizations. Teams are mentored by JPMorgan engineers.',
   'hackathon', '2026-10-08',
   '{"min_grade": null, "max_grade": null, "countries": ["US", "UK", "IN"], "age_min": 18, "age_max": 25}',
   'United States', 'in_person', ARRAY['undergraduate'],
   'https://jpmorgan.com/codeforgood', 'https://jpmorgan.com/codeforgood/register', 'verified'),

  ((select id from sources where name = 'Hand-seeded Phase 0'),
   'lorenzo-de-medici-study-abroad-fellowship', 'Lorenzo de Medici — Study Abroad Fellowship', 'Italian Ministry of Education',
   'A fellowship funding study abroad in Italy for international students in arts, humanities, and social sciences.',
   'fellowship', '2026-06-15',
   '{"min_grade": null, "max_grade": null, "countries": ["*"], "age_min": 18, "age_max": 30}',
   'Italy', 'in_person', ARRAY['undergraduate', 'graduate'],
   'https://www.lfrf.it', 'https://www.lfrf.it/apply', 'verified'),

  ((select id from sources where name = 'Hand-seeded Phase 0'),
   'nasa-space-apps-challenge', 'NASA Space Apps Challenge', 'NASA',
   'A global hackathon where teams use NASA data to build solutions to real-world problems on Earth and in space.',
   'hackathon', '2026-10-04',
   '{"min_grade": null, "max_grade": null, "countries": ["*"], "age_min": null, "age_max": null}',
   'Global', 'hybrid', ARRAY['high_school', 'undergraduate', 'graduate'],
   'https://spaceappschallenge.org', 'https://spaceappschallenge.org/register', 'verified');

-- Link opportunities to graph nodes by slug
insert into opportunity_nodes (opportunity_id, node_id, relevance) values
  ((select id from opportunities where slug = 'regeneron-science-talent-search'), (select id from graph_nodes where slug = 'research'), 0.9),
  ((select id from opportunities where slug = 'google-science-fair'), (select id from graph_nodes where slug = 'research'), 0.9),
  ((select id from opportunities where slug = 'google-science-fair'), (select id from graph_nodes where slug = 'data-analysis'), 0.7),
  ((select id from opportunities where slug = 'mit-beaver-works-summer-institute'), (select id from graph_nodes where slug = 'engineering'), 0.8),
  ((select id from opportunities where slug = 'mit-beaver-works-summer-institute'), (select id from graph_nodes where slug = 'artificial-intelligence'), 0.9),
  ((select id from opportunities where slug = 'mit-beaver-works-summer-institute'), (select id from graph_nodes where slug = 'mit'), 0.95),
  ((select id from opportunities where slug = 'first-robotics-competition'), (select id from graph_nodes where slug = 'robotics'), 0.95),
  ((select id from opportunities where slug = 'first-robotics-competition'), (select id from graph_nodes where slug = 'engineering'), 0.7),
  ((select id from opportunities where slug = 'first-robotics-competition'), (select id from graph_nodes where slug = 'python'), 0.5),
  ((select id from opportunities where slug = 'fulbright-garcia-robles-scholarship'), (select id from graph_nodes where slug = 'research'), 0.7),
  ((select id from opportunities where slug = 'fulbright-garcia-robles-scholarship'), (select id from graph_nodes where slug = 'spanish'), 0.9),
  ((select id from opportunities where slug = 'fulbright-garcia-robles-scholarship'), (select id from graph_nodes where slug = 'latin-america'), 0.95),
  ((select id from opportunities where slug = 'generation-google-scholarship'), (select id from graph_nodes where slug = 'computer-science'), 0.95),
  ((select id from opportunities where slug = 'generation-google-scholarship'), (select id from graph_nodes where slug = 'javascript'), 0.6),
  ((select id from opportunities where slug = 'international-physics-olympiad'), (select id from graph_nodes where slug = 'research'), 0.8),
  ((select id from opportunities where slug = 'amazon-future-engineer-scholarship'), (select id from graph_nodes where slug = 'computer-science'), 0.9),
  ((select id from opportunities where slug = 'amazon-future-engineer-scholarship'), (select id from graph_nodes where slug = 'entrepreneurship'), 0.5),
  ((select id from opportunities where slug = 'mit-app-inventor-hackathon'), (select id from graph_nodes where slug = 'web-development'), 0.8),
  ((select id from opportunities where slug = 'mit-app-inventor-hackathon'), (select id from graph_nodes where slug = 'javascript'), 0.7),
  ((select id from opportunities where slug = 'mit-app-inventor-hackathon'), (select id from graph_nodes where slug = 'mit'), 0.7),
  ((select id from opportunities where slug = 'stanford-ai4all'), (select id from graph_nodes where slug = 'artificial-intelligence'), 0.95),
  ((select id from opportunities where slug = 'stanford-ai4all'), (select id from graph_nodes where slug = 'machine-learning'), 0.8),
  ((select id from opportunities where slug = 'stanford-ai4all'), (select id from graph_nodes where slug = 'stanford'), 0.95),
  ((select id from opportunities where slug = 'stanford-ai4all'), (select id from graph_nodes where slug = 'python'), 0.7),
  ((select id from opportunities where slug = 'microsoft-imagine-cup'), (select id from graph_nodes where slug = 'computer-science'), 0.8),
  ((select id from opportunities where slug = 'microsoft-imagine-cup'), (select id from graph_nodes where slug = 'entrepreneurship'), 0.7),
  ((select id from opportunities where slug = 'davidson-fellows-scholarship'), (select id from graph_nodes where slug = 'research'), 0.9),
  ((select id from opportunities where slug = 'tec-monterrey-global-innovation-challenge'), (select id from graph_nodes where slug = 'social-impact'), 0.9),
  ((select id from opportunities where slug = 'tec-monterrey-global-innovation-challenge'), (select id from graph_nodes where slug = 'entrepreneurship'), 0.8),
  ((select id from opportunities where slug = 'jpmorgan-code-for-good-hackathon'), (select id from graph_nodes where slug = 'javascript'), 0.7),
  ((select id from opportunities where slug = 'jpmorgan-code-for-good-hackathon'), (select id from graph_nodes where slug = 'web-development'), 0.8),
  ((select id from opportunities where slug = 'jpmorgan-code-for-good-hackathon'), (select id from graph_nodes where slug = 'social-impact'), 0.7),
  ((select id from opportunities where slug = 'lorenzo-de-medici-study-abroad-fellowship'), (select id from graph_nodes where slug = 'social-impact'), 0.6),
  ((select id from opportunities where slug = 'nasa-space-apps-challenge'), (select id from graph_nodes where slug = 'space-exploration'), 0.95),
  ((select id from opportunities where slug = 'nasa-space-apps-challenge'), (select id from graph_nodes where slug = 'data-analysis'), 0.7),
  ((select id from opportunities where slug = 'nasa-space-apps-challenge'), (select id from graph_nodes where slug = 'machine-learning'), 0.6);
