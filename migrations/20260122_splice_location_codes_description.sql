-- Add work codes + brief description to splice locations
alter table public.splice_locations
  add column if not exists work_codes text[] not null default '{}'::text[];

alter table public.splice_locations
  add column if not exists work_description text not null default '';
