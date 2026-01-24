-- Add TECHNICIAN role + time tracking for company-employed field workers

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app_role as enum ('ADMIN','OWNER','PRIME','TDS','SUB','SPLICER','TECHNICIAN');
  else
    alter type app_role add value if not exists 'TECHNICIAN';
  end if;
end $$;

create type if not exists public.technician_time_event_type as enum (
  'START_JOB',
  'PAUSE_JOB',
  'END_JOB',
  'LUNCH',
  'BREAK_15',
  'TRUCK_INSPECTION'
);

create table if not exists public.technician_timesheets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  work_date date not null default current_date,
  clock_in_at timestamptz,
  clock_out_at timestamptz,
  total_minutes_worked integer,
  created_at timestamptz not null default now(),
  unique (user_id, work_date)
);

create table if not exists public.technician_time_events (
  id uuid primary key default gen_random_uuid(),
  timesheet_id uuid not null references public.technician_timesheets(id) on delete cascade,
  event_type public.technician_time_event_type not null,
  started_at timestamptz,
  ended_at timestamptz,
  duration_minutes integer,
  created_at timestamptz not null default now()
);

create index if not exists technician_time_events_timesheet_id_idx
  on public.technician_time_events (timesheet_id);

alter table public.technician_timesheets enable row level security;
alter table public.technician_time_events enable row level security;

create or replace function public.seed_technician_timesheet_events()
returns trigger
language plpgsql
as $$
begin
  insert into public.technician_time_events (timesheet_id, event_type, duration_minutes)
  values
    (new.id, 'LUNCH', 30),
    (new.id, 'BREAK_15', 15),
    (new.id, 'BREAK_15', 15),
    (new.id, 'TRUCK_INSPECTION', 15),
    (new.id, 'TRUCK_INSPECTION', 15);
  return new;
end;
$$;

drop trigger if exists seed_technician_timesheet_events on public.technician_timesheets;
create trigger seed_technician_timesheet_events
after insert on public.technician_timesheets
for each row execute function public.seed_technician_timesheet_events();

create or replace function public.fn_start_timesheet(p_user_id uuid, p_project_id uuid)
returns public.technician_timesheets
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.technician_timesheets;
begin
  if p_user_id is null or p_project_id is null then
    raise exception 'user_id and project_id are required';
  end if;
  if p_user_id <> auth.uid() then
    raise exception 'not allowed';
  end if;
  if not exists (
    select 1 from public.project_members pm
    where pm.project_id = p_project_id and pm.user_id = p_user_id
  ) then
    raise exception 'not a project member';
  end if;
  select * into existing
  from public.technician_timesheets
  where user_id = p_user_id
    and work_date = current_date
  limit 1;
  if found then
    if existing.clock_out_at is null then
      return existing;
    end if;
    raise exception 'timesheet already closed for today';
  end if;
  insert into public.technician_timesheets (user_id, project_id, work_date, clock_in_at)
  values (p_user_id, p_project_id, current_date, now())
  returning * into existing;
  return existing;
end;
$$;

create or replace function public.fn_log_time_event(p_timesheet_id uuid, p_event_type public.technician_time_event_type)
returns public.technician_time_events
language plpgsql
security definer
set search_path = public
as $$
declare
  ts public.technician_timesheets;
  open_event public.technician_time_events;
  seeded_event public.technician_time_events;
  now_ts timestamptz := now();
  default_minutes integer := null;
begin
  select * into ts
  from public.technician_timesheets
  where id = p_timesheet_id;
  if not found then
    raise exception 'timesheet not found';
  end if;
  if ts.user_id <> auth.uid() then
    raise exception 'not allowed';
  end if;
  if ts.clock_out_at is not null then
    raise exception 'timesheet closed';
  end if;

  select * into open_event
  from public.technician_time_events
  where timesheet_id = p_timesheet_id
    and started_at is not null
    and ended_at is null
  order by started_at desc
  limit 1;
  if found then
    update public.technician_time_events
      set ended_at = now_ts,
          duration_minutes = greatest(0, floor(extract(epoch from (now_ts - started_at)) / 60)::int)
    where id = open_event.id;
  end if;

  if p_event_type in ('LUNCH','BREAK_15','TRUCK_INSPECTION') then
    default_minutes := case p_event_type
      when 'LUNCH' then 30
      when 'BREAK_15' then 15
      when 'TRUCK_INSPECTION' then 15
      else null
    end;
    select * into seeded_event
    from public.technician_time_events
    where timesheet_id = p_timesheet_id
      and event_type = p_event_type
      and started_at is null
      and ended_at is null
    order by created_at
    limit 1;
    if found then
      update public.technician_time_events
        set started_at = now_ts,
            ended_at = now_ts + make_interval(mins => coalesce(seeded_event.duration_minutes, default_minutes)),
            duration_minutes = coalesce(seeded_event.duration_minutes, default_minutes)
      where id = seeded_event.id
      returning * into seeded_event;
      return seeded_event;
    end if;
    insert into public.technician_time_events (timesheet_id, event_type, started_at, ended_at, duration_minutes)
    values (p_timesheet_id, p_event_type, now_ts, now_ts + make_interval(mins => default_minutes), default_minutes)
    returning * into open_event;
    return open_event;
  end if;

  if p_event_type = 'END_JOB' then
    insert into public.technician_time_events (timesheet_id, event_type, started_at, ended_at, duration_minutes)
    values (p_timesheet_id, p_event_type, now_ts, now_ts, 0)
    returning * into open_event;
    return open_event;
  end if;

  insert into public.technician_time_events (timesheet_id, event_type, started_at)
  values (p_timesheet_id, p_event_type, now_ts)
  returning * into open_event;
  return open_event;
end;
$$;

create or replace function public.fn_end_timesheet(p_timesheet_id uuid)
returns public.technician_timesheets
language plpgsql
security definer
set search_path = public
as $$
declare
  ts public.technician_timesheets;
  now_ts timestamptz := now();
  total_minutes integer := 0;
begin
  select * into ts
  from public.technician_timesheets
  where id = p_timesheet_id;
  if not found then
    raise exception 'timesheet not found';
  end if;
  if ts.user_id <> auth.uid() then
    raise exception 'not allowed';
  end if;
  if ts.clock_out_at is not null then
    return ts;
  end if;

  update public.technician_time_events
    set ended_at = now_ts,
        duration_minutes = greatest(0, floor(extract(epoch from (now_ts - started_at)) / 60)::int)
  where timesheet_id = p_timesheet_id
    and started_at is not null
    and ended_at is null;

  select coalesce(sum(
    case
      when event_type in ('START_JOB','TRUCK_INSPECTION')
        and started_at is not null
        and ended_at is not null then coalesce(duration_minutes, 0)
      else 0
    end
  ), 0) into total_minutes
  from public.technician_time_events
  where timesheet_id = p_timesheet_id;

  update public.technician_timesheets
    set clock_out_at = now_ts,
        total_minutes_worked = total_minutes
  where id = p_timesheet_id
  returning * into ts;
  return ts;
end;
$$;

drop policy if exists "technician_timesheets_select_own" on public.technician_timesheets;
create policy "technician_timesheets_select_own"
on public.technician_timesheets for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "technician_timesheets_insert_own" on public.technician_timesheets;
create policy "technician_timesheets_insert_own"
on public.technician_timesheets for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "technician_timesheets_update_own" on public.technician_timesheets;
create policy "technician_timesheets_update_own"
on public.technician_timesheets for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "technician_timesheets_select_admin" on public.technician_timesheets;
create policy "technician_timesheets_select_admin"
on public.technician_timesheets for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and public.is_privileged_role(p.role)
  )
  and exists (
    select 1 from public.project_members pm
    where pm.project_id = project_id and pm.user_id = auth.uid()
      and public.is_privileged_role(pm.role)
  )
);

drop policy if exists "technician_time_events_select_own" on public.technician_time_events;
create policy "technician_time_events_select_own"
on public.technician_time_events for select
to authenticated
using (
  exists (
    select 1 from public.technician_timesheets t
    where t.id = timesheet_id and t.user_id = auth.uid()
  )
);

drop policy if exists "technician_time_events_insert_own" on public.technician_time_events;
create policy "technician_time_events_insert_own"
on public.technician_time_events for insert
to authenticated
with check (
  exists (
    select 1 from public.technician_timesheets t
    where t.id = timesheet_id and t.user_id = auth.uid()
  )
);

drop policy if exists "technician_time_events_select_admin" on public.technician_time_events;
create policy "technician_time_events_select_admin"
on public.technician_time_events for select
to authenticated
using (
  exists (
    select 1
    from public.technician_timesheets t
    join public.project_members pm on pm.project_id = t.project_id and pm.user_id = auth.uid()
    join public.profiles p on p.id = auth.uid()
    where t.id = timesheet_id
      and public.is_privileged_role(p.role)
      and public.is_privileged_role(pm.role)
  )
);
