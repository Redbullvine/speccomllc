-- Basic audit logging table scaffold.

create extension if not exists pgcrypto;

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  table_name text,
  record_id text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

alter table public.activity_logs enable row level security;

drop policy if exists baseline_auth_select on public.activity_logs;
drop policy if exists baseline_auth_insert on public.activity_logs;
drop policy if exists baseline_auth_update on public.activity_logs;
drop policy if exists baseline_auth_delete on public.activity_logs;

create policy baseline_auth_select
on public.activity_logs
for select
to authenticated
using (auth.uid() is not null);

create policy baseline_auth_insert
on public.activity_logs
for insert
to authenticated
with check (auth.uid() is not null);

create policy baseline_auth_update
on public.activity_logs
for update
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

create policy baseline_auth_delete
on public.activity_logs
for delete
to authenticated
using (auth.uid() is not null);

notify pgrst, 'reload schema';
