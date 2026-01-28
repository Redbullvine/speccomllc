-- Site pin workflow tables + RLS

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  notes text null,
  gps_lat double precision null,
  gps_lng double precision null,
  gps_accuracy_m double precision null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.site_media (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  media_path text not null,
  gps_lat double precision null,
  gps_lng double precision null,
  gps_accuracy_m double precision null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.site_codes (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  code text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.site_entries (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  description text not null,
  quantity numeric null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists sites_project_id_idx on public.sites(project_id);
create index if not exists site_media_site_id_idx on public.site_media(site_id);
create index if not exists site_codes_site_id_idx on public.site_codes(site_id);
create index if not exists site_entries_site_id_idx on public.site_entries(site_id);

alter table public.sites enable row level security;
alter table public.site_media enable row level security;
alter table public.site_codes enable row level security;
alter table public.site_entries enable row level security;

create or replace function public.project_id_for_site(p_site_id uuid)
returns uuid
language sql
security definer
set search_path = public
as $$
  select project_id from public.sites where id = p_site_id;
$$;

-- RLS policies

drop policy if exists "sites_read_project_members" on public.sites;
create policy "sites_read_project_members"
on public.sites for select
to authenticated
using (public.has_project_access(project_id));

drop policy if exists "sites_write_project_members" on public.sites;
create policy "sites_write_project_members"
on public.sites for insert
to authenticated
with check (public.has_project_access(project_id));

drop policy if exists "sites_update_project_members" on public.sites;
create policy "sites_update_project_members"
on public.sites for update
to authenticated
using (public.has_project_access(project_id));

drop policy if exists "sites_delete_project_members" on public.sites;
create policy "sites_delete_project_members"
on public.sites for delete
to authenticated
using (public.has_project_access(project_id));

-- Media policies

drop policy if exists "site_media_read_project_members" on public.site_media;
create policy "site_media_read_project_members"
on public.site_media for select
to authenticated
using (public.has_project_access(public.project_id_for_site(site_id)));

drop policy if exists "site_media_write_project_members" on public.site_media;
create policy "site_media_write_project_members"
on public.site_media for insert
to authenticated
with check (public.has_project_access(public.project_id_for_site(site_id)));

drop policy if exists "site_media_update_project_members" on public.site_media;
create policy "site_media_update_project_members"
on public.site_media for update
to authenticated
using (public.has_project_access(public.project_id_for_site(site_id)));

drop policy if exists "site_media_delete_project_members" on public.site_media;
create policy "site_media_delete_project_members"
on public.site_media for delete
to authenticated
using (public.has_project_access(public.project_id_for_site(site_id)));

-- Code policies

drop policy if exists "site_codes_read_project_members" on public.site_codes;
create policy "site_codes_read_project_members"
on public.site_codes for select
to authenticated
using (public.has_project_access(public.project_id_for_site(site_id)));

drop policy if exists "site_codes_write_project_members" on public.site_codes;
create policy "site_codes_write_project_members"
on public.site_codes for insert
to authenticated
with check (public.has_project_access(public.project_id_for_site(site_id)));

drop policy if exists "site_codes_update_project_members" on public.site_codes;
create policy "site_codes_update_project_members"
on public.site_codes for update
to authenticated
using (public.has_project_access(public.project_id_for_site(site_id)));

drop policy if exists "site_codes_delete_project_members" on public.site_codes;
create policy "site_codes_delete_project_members"
on public.site_codes for delete
to authenticated
using (public.has_project_access(public.project_id_for_site(site_id)));

-- Entry policies

drop policy if exists "site_entries_read_project_members" on public.site_entries;
create policy "site_entries_read_project_members"
on public.site_entries for select
to authenticated
using (public.has_project_access(public.project_id_for_site(site_id)));

drop policy if exists "site_entries_write_project_members" on public.site_entries;
create policy "site_entries_write_project_members"
on public.site_entries for insert
to authenticated
with check (public.has_project_access(public.project_id_for_site(site_id)));

drop policy if exists "site_entries_update_project_members" on public.site_entries;
create policy "site_entries_update_project_members"
on public.site_entries for update
to authenticated
using (public.has_project_access(public.project_id_for_site(site_id)));

drop policy if exists "site_entries_delete_project_members" on public.site_entries;
create policy "site_entries_delete_project_members"
on public.site_entries for delete
to authenticated
using (public.has_project_access(public.project_id_for_site(site_id)));
