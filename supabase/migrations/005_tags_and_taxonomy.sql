-- Expand the taxonomy so opportunities can carry rich labels beyond their
-- single opportunity_type: subjects (Math, Physics...), skills (Writing,
-- Debate...), regions, languages, and an 'audience' node type for labels
-- like "Open to All".

-- New node type for descriptive audience labels ("for everyone").
alter table graph_nodes drop constraint graph_nodes_type_check;
alter table graph_nodes add constraint graph_nodes_type_check check (type in
  ('skill','interest','field','university','category','language','region','age_group','audience'));

-- New subject / skill / interest nodes.
insert into graph_nodes (type, name, slug) values
  ('field', 'Math', 'math'),
  ('field', 'Physics', 'physics'),
  ('field', 'Chemistry', 'chemistry'),
  ('field', 'Biology', 'biology'),
  ('field', 'Economics', 'economics'),
  ('field', 'History', 'history'),
  ('skill', 'Writing', 'writing'),
  ('skill', 'Debate', 'debate'),
  ('skill', 'Design', 'design'),
  ('skill', 'Leadership', 'leadership'),
  ('interest', 'Music', 'music'),
  ('interest', 'Art & Design', 'art-design'),
  ('interest', 'Literature', 'literature');

-- Languages the profile already offered but that had no graph node, so
-- selecting them never produced a profile_nodes link.
insert into graph_nodes (type, name, slug) values
  ('language', 'French', 'french'),
  ('language', 'German', 'german'),
  ('language', 'Portuguese', 'portuguese'),
  ('language', 'Arabic', 'arabic'),
  ('language', 'Hindi', 'hindi');

-- Region labels for tagging opportunities by where they're open/held.
insert into graph_nodes (type, name, slug) values
  ('region', 'Europe', 'europe'),
  ('region', 'Asia', 'asia'),
  ('region', 'Africa', 'africa'),
  ('region', 'Oceania', 'oceania'),
  ('region', 'Middle East', 'middle-east');

-- Audience labels. Kept as leaf nodes (no edges) so they display as labels
-- but never enter a student's graph expansion and dilute interest scores.
insert into graph_nodes (type, name, slug) values
  ('audience', 'Open to All', 'open-to-all');

-- Edges from the new subjects so they reach the existing hubs. Math is the
-- big one: it must be reachable from research / CS / data-analysis paths.
insert into graph_edges (from_node_id, to_node_id, relationship, weight) values
  ((select id from graph_nodes where slug = 'math'), (select id from graph_nodes where slug = 'research'), 'related_to', 0.8),
  ((select id from graph_nodes where slug = 'math'), (select id from graph_nodes where slug = 'computer-science'), 'related_to', 0.6),
  ((select id from graph_nodes where slug = 'math'), (select id from graph_nodes where slug = 'data-analysis'), 'related_to', 0.7),
  ((select id from graph_nodes where slug = 'physics'), (select id from graph_nodes where slug = 'engineering'), 'part_of', 0.8),
  ((select id from graph_nodes where slug = 'physics'), (select id from graph_nodes where slug = 'research'), 'related_to', 0.8),
  ((select id from graph_nodes where slug = 'physics'), (select id from graph_nodes where slug = 'math'), 'requires', 0.9),
  ((select id from graph_nodes where slug = 'chemistry'), (select id from graph_nodes where slug = 'research'), 'related_to', 0.7),
  ((select id from graph_nodes where slug = 'chemistry'), (select id from graph_nodes where slug = 'medicine'), 'related_to', 0.5),
  ((select id from graph_nodes where slug = 'biology'), (select id from graph_nodes where slug = 'medicine'), 'related_to', 0.7),
  ((select id from graph_nodes where slug = 'biology'), (select id from graph_nodes where slug = 'biomedical-engineering'), 'related_to', 0.8),
  ((select id from graph_nodes where slug = 'economics'), (select id from graph_nodes where slug = 'business'), 'part_of', 0.8),
  ((select id from graph_nodes where slug = 'economics'), (select id from graph_nodes where slug = 'data-analysis'), 'related_to', 0.6),
  ((select id from graph_nodes where slug = 'history'), (select id from graph_nodes where slug = 'research'), 'related_to', 0.6),
  ((select id from graph_nodes where slug = 'writing'), (select id from graph_nodes where slug = 'technical-writing'), 'related_to', 0.8),
  ((select id from graph_nodes where slug = 'writing'), (select id from graph_nodes where slug = 'literature'), 'related_to', 0.7),
  ((select id from graph_nodes where slug = 'debate'), (select id from graph_nodes where slug = 'public-speaking'), 'related_to', 0.85),
  ((select id from graph_nodes where slug = 'leadership'), (select id from graph_nodes where slug = 'social-impact'), 'related_to', 0.6),
  ((select id from graph_nodes where slug = 'leadership'), (select id from graph_nodes where slug = 'entrepreneurship'), 'related_to', 0.5),
  ((select id from graph_nodes where slug = 'music'), (select id from graph_nodes where slug = 'art-design'), 'related_to', 0.7),
  ((select id from graph_nodes where slug = 'literature'), (select id from graph_nodes where slug = 'technical-writing'), 'related_to', 0.6);
