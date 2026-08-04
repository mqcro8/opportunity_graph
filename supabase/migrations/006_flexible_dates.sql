alter table opportunities
  rename column application_deadline to registration_deadline;

alter table opportunities
  add column if not exists registration_opens date,
  add column if not exists event_start_date date,
  add column if not exists event_end_date date;

drop index if exists idx_opportunities_deadline;
create index idx_opportunities_registration_deadline
  on opportunities (registration_deadline)
  where status = 'verified';
create index idx_opportunities_event_end
  on opportunities (event_end_date)
  where status = 'verified';
