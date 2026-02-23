-- Persist per-project KMZ import state (rows + folder tree + layer catalog)

create table if not exists public.project_kmz_snapshots (
  project_id uuid primary key references public.projects(id) on delete cascade,
  kmz_rows jsonb not null default '[]'::jsonb,
  kmz_layer_names text[] not null default '{}'::text[],
  kmz_folder_tree jsonb null,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create index if not exists project_kmz_snapshots_updated_at_idx
  on public.project_kmz_snapshots(updated_at desc);

alter table public.project_kmz_snapshots enable row level security;

drop policy if exists "project_kmz_snapshots_read_members" on public.project_kmz_snapshots;
create policy "project_kmz_snapshots_read_members"
on public.project_kmz_snapshots for select
to authenticated
using (public.has_project_access(project_id));

drop policy if exists "project_kmz_snapshots_write_members" on public.project_kmz_snapshots;
create policy "project_kmz_snapshots_write_members"
on public.project_kmz_snapshots for insert
to authenticated
with check (public.has_project_access(project_id));

drop policy if exists "project_kmz_snapshots_update_members" on public.project_kmz_snapshots;
create policy "project_kmz_snapshots_update_members"
on public.project_kmz_snapshots for update
to authenticated
using (public.has_project_access(project_id))
with check (public.has_project_access(project_id));

drop policy if exists "project_kmz_snapshots_delete_members" on public.project_kmz_snapshots;
create policy "project_kmz_snapshots_delete_members"
on public.project_kmz_snapshots for delete
to authenticated
using (public.has_project_access(project_id));
