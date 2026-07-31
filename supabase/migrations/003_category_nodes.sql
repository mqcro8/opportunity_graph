-- Category nodes: one hub per opportunity_type so every opportunity of a
-- given type is guaranteed to be reachable from the matching profile goal.
insert into graph_nodes (type, name, slug) values
  ('category', 'Hackathons', 'hackathons'),
  ('category', 'Scholarships', 'scholarships'),
  ('category', 'Olympiads', 'olympiads'),
  ('category', 'Internships', 'internships'),
  ('category', 'Summer Programs', 'summer-programs'),
  ('category', 'Conferences', 'conferences'),
  ('category', 'Fellowships', 'fellowships'),
  ('category', 'Competitions', 'competitions'),
  ('category', 'Exchanges', 'exchanges'),
  ('category', 'Certifications', 'certifications'),
  ('category', 'Grants', 'grants');

-- Backfill: link every existing opportunity to its category node so the
-- recommendation engine finds them via the category hub.
insert into opportunity_nodes (opportunity_id, node_id, relevance)
select o.id, n.id, 0.8
from opportunities o
join graph_nodes n
  on n.slug = case o.opportunity_type
    when 'hackathon' then 'hackathons'
    when 'scholarship' then 'scholarships'
    when 'olympiad' then 'olympiads'
    when 'internship' then 'internships'
    when 'summer_program' then 'summer-programs'
    when 'conference' then 'conferences'
    when 'fellowship' then 'fellowships'
    when 'competition' then 'competitions'
    when 'exchange' then 'exchanges'
    when 'certification' then 'certifications'
    when 'grant' then 'grants'
  end
on conflict (opportunity_id, node_id) do nothing;
