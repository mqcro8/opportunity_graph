-- Add description column to sources for the Source Directory feature
alter table sources add column if not exists description text;
