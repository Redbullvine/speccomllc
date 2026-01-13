-- Migration: splice location photo slots + terminal ports

alter table public.splice_locations
  add column if not exists terminal_ports integer not null default 2;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'splice_locations_terminal_ports_check'
      and conrelid = 'public.splice_locations'::regclass
  ) then
    alter table public.splice_locations
      add constraint splice_locations_terminal_ports_check
      check (terminal_ports between 1 and 8);
  end if;
end $$;

create table if not exists public.splice_location_photos (
  id uuid primary key default gen_random_uuid(),
  splice_location_id uuid not null references public.splice_locations(id) on delete cascade,
  slot_key text not null,
  photo_path text not null,
  taken_at timestamptz not null default now(),
  gps_lat double precision,
  gps_lng double precision,
  gps_accuracy_m double precision,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create unique index if not exists splice_location_photos_slot_unique
  on public.splice_location_photos (splice_location_id, slot_key);

create index if not exists splice_location_photos_location_idx
  on public.splice_location_photos (splice_location_id);

alter table public.splice_location_photos enable row level security;

create policy "splice_location_photos_read_all_authed"
on public.splice_location_photos for select
to authenticated
using (true);

create policy "splice_location_photos_write_job_roles"
on public.splice_location_photos for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('SPLICER','SUB','PRIME','OWNER')
  )
);

create policy "splice_location_photos_update_job_roles"
on public.splice_location_photos for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('SPLICER','SUB','PRIME','OWNER')
  )
);

create or replace function public.fn_require_splice_photos()
returns trigger
language plpgsql
as $$
declare
  required_ports integer;
  missing_ports boolean;
  completion_ok boolean;
begin
  if new.completed is true and (old.completed is distinct from true) then
    required_ports := least(greatest(coalesce(new.terminal_ports, 2), 1), 8);

    select exists (
      select 1
      from generate_series(1, required_ports) s
      left join public.splice_location_photos p
        on p.splice_location_id = new.id
        and p.slot_key = 'port_' || s
      where p.id is null
    ) into missing_ports;

    select exists (
      select 1
      from public.splice_location_photos p
      where p.splice_location_id = new.id
        and p.slot_key = 'splice_completion'
    ) into completion_ok;

    if missing_ports or not completion_ok then
      raise exception 'Splice photos required before completion.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_require_splice_photos on public.splice_locations;
create trigger trg_require_splice_photos
before update on public.splice_locations
for each row execute function public.fn_require_splice_photos();
