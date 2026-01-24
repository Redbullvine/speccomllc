-- Work orders module (Phase 1 + CSV import support)

create type if not exists public.work_order_type as enum (
  'INSTALL',
  'TROUBLE_TICKET',
  'MAINTENANCE',
  'SURVEY'
);

create type if not exists public.work_order_status as enum (
  'NEW',
  'ASSIGNED',
  'EN_ROUTE',
  'ON_SITE',
  'IN_PROGRESS',
  'BLOCKED',
  'COMPLETE',
  'CANCELED'
);

create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  external_source text null,
  external_id text null,
  type public.work_order_type not null,
  status public.work_order_status not null default 'NEW',
  scheduled_start timestamptz null,
  scheduled_end timestamptz null,
  address text null,
  lat double precision null,
  lng double precision null,
  customer_label text null,
  contact_phone text null,
  notes text null,
  priority int not null default 3,
  sla_due_at timestamptz null,
  assigned_to_user_id uuid null references auth.users(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, external_source, external_id)
);

create table if not exists public.work_order_events (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.technician_time_events
  add column if not exists work_order_id uuid references public.work_orders(id);

create index if not exists work_orders_project_id_idx on public.work_orders(project_id);
create index if not exists work_orders_assigned_idx on public.work_orders(assigned_to_user_id);
create index if not exists work_orders_status_idx on public.work_orders(status);
create index if not exists work_orders_schedule_idx on public.work_orders(scheduled_start);
create index if not exists work_order_events_work_order_id_idx on public.work_order_events(work_order_id);

alter table public.work_orders enable row level security;
alter table public.work_order_events enable row level security;

create or replace function public.set_work_orders_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_work_orders_updated_at on public.work_orders;
create trigger trg_work_orders_updated_at
before update on public.work_orders
for each row execute function public.set_work_orders_updated_at();

create or replace function public.enforce_technician_work_order_update()
returns trigger
language plpgsql
as $$
declare
  current_role app_role;
begin
  select role into current_role from public.profiles where id = auth.uid();
  if current_role = 'TECHNICIAN' then
    if new.project_id <> old.project_id
      or new.external_source is distinct from old.external_source
      or new.external_id is distinct from old.external_id
      or new.assigned_to_user_id is distinct from old.assigned_to_user_id
      or new.scheduled_start is distinct from old.scheduled_start
      or new.scheduled_end is distinct from old.scheduled_end
      or new.address is distinct from old.address
      or new.lat is distinct from old.lat
      or new.lng is distinct from old.lng then
      raise exception 'Technicians cannot change assignment or external fields';
    end if;
    if new.status is distinct from old.status then
      if new.status not in ('EN_ROUTE','ON_SITE','IN_PROGRESS','BLOCKED','COMPLETE') then
        raise exception 'Status not allowed';
      end if;
      if old.status = 'ASSIGNED' and new.status not in ('EN_ROUTE','ON_SITE','IN_PROGRESS','BLOCKED') then
        raise exception 'Status transition not allowed';
      elsif old.status = 'EN_ROUTE' and new.status not in ('ON_SITE','IN_PROGRESS','BLOCKED') then
        raise exception 'Status transition not allowed';
      elsif old.status = 'ON_SITE' and new.status not in ('IN_PROGRESS','BLOCKED') then
        raise exception 'Status transition not allowed';
      elsif old.status = 'IN_PROGRESS' and new.status not in ('BLOCKED','COMPLETE') then
        raise exception 'Status transition not allowed';
      elsif old.status = 'BLOCKED' and new.status not in ('IN_PROGRESS','COMPLETE') then
        raise exception 'Status transition not allowed';
      elsif old.status in ('NEW','CANCELED','COMPLETE') then
        raise exception 'Status transition not allowed';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_work_orders_enforce_technician on public.work_orders;
create trigger trg_work_orders_enforce_technician
before update on public.work_orders
for each row execute function public.enforce_technician_work_order_update();

-- RLS: work_orders
drop policy if exists "work_orders_select_admin" on public.work_orders;
create policy "work_orders_select_admin"
on public.work_orders for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and public.is_privileged_role(p.role)
  )
  and exists (
    select 1 from public.project_members pm
    where pm.project_id = project_id and pm.user_id = auth.uid()
  )
);

drop policy if exists "work_orders_write_admin" on public.work_orders;
create policy "work_orders_write_admin"
on public.work_orders for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and public.is_privileged_role(p.role)
  )
  and exists (
    select 1 from public.project_members pm
    where pm.project_id = project_id and pm.user_id = auth.uid()
  )
);

drop policy if exists "work_orders_update_admin" on public.work_orders;
create policy "work_orders_update_admin"
on public.work_orders for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and public.is_privileged_role(p.role)
  )
  and exists (
    select 1 from public.project_members pm
    where pm.project_id = project_id and pm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and public.is_privileged_role(p.role)
  )
);

drop policy if exists "work_orders_delete_admin" on public.work_orders;
create policy "work_orders_delete_admin"
on public.work_orders for delete
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and public.is_privileged_role(p.role)
  )
  and exists (
    select 1 from public.project_members pm
    where pm.project_id = project_id and pm.user_id = auth.uid()
  )
);

drop policy if exists "work_orders_select_tech_assigned" on public.work_orders;
create policy "work_orders_select_tech_assigned"
on public.work_orders for select
to authenticated
using (assigned_to_user_id = auth.uid());

drop policy if exists "work_orders_update_tech_status" on public.work_orders;
create policy "work_orders_update_tech_status"
on public.work_orders for update
to authenticated
using (assigned_to_user_id = auth.uid())
with check (
  assigned_to_user_id = auth.uid()
  and status in ('EN_ROUTE','ON_SITE','IN_PROGRESS','BLOCKED','COMPLETE')
);

-- RLS: work_order_events
drop policy if exists "work_order_events_select_admin" on public.work_order_events;
create policy "work_order_events_select_admin"
on public.work_order_events for select
to authenticated
using (
  exists (
    select 1
    from public.work_orders wo
    join public.project_members pm on pm.project_id = wo.project_id
    join public.profiles p on p.id = auth.uid()
    where wo.id = work_order_id
      and pm.user_id = auth.uid()
      and public.is_privileged_role(p.role)
  )
);

drop policy if exists "work_order_events_select_tech" on public.work_order_events;
create policy "work_order_events_select_tech"
on public.work_order_events for select
to authenticated
using (
  exists (
    select 1 from public.work_orders wo
    where wo.id = work_order_id and wo.assigned_to_user_id = auth.uid()
  )
);

drop policy if exists "work_order_events_insert_admin" on public.work_order_events;
create policy "work_order_events_insert_admin"
on public.work_order_events for insert
to authenticated
with check (
  exists (
    select 1
    from public.work_orders wo
    join public.project_members pm on pm.project_id = wo.project_id
    join public.profiles p on p.id = auth.uid()
    where wo.id = work_order_id
      and pm.user_id = auth.uid()
      and public.is_privileged_role(p.role)
  )
);

drop policy if exists "work_order_events_insert_tech" on public.work_order_events;
create policy "work_order_events_insert_tech"
on public.work_order_events for insert
to authenticated
with check (
  exists (
    select 1 from public.work_orders wo
    where wo.id = work_order_id and wo.assigned_to_user_id = auth.uid()
  )
);

-- Functions
create or replace function public.fn_assign_work_order(work_order_id uuid, technician_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  wo public.work_orders;
begin
  select * into wo from public.work_orders where id = work_order_id;
  if not found then
    raise exception 'work order not found';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and public.is_privileged_role(p.role)
  ) then
    raise exception 'not allowed';
  end if;
  if not exists (
    select 1 from public.project_members pm
    where pm.project_id = wo.project_id and pm.user_id = technician_user_id
  ) then
    raise exception 'technician not in project';
  end if;
  update public.work_orders
    set assigned_to_user_id = technician_user_id,
        status = 'ASSIGNED',
        updated_at = now()
  where id = work_order_id;
  insert into public.work_order_events (work_order_id, actor_user_id, event_type, payload)
  values (work_order_id, auth.uid(), 'ASSIGNED', jsonb_build_object('technician_user_id', technician_user_id));
end;
$$;

create or replace function public.fn_start_work_order(work_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  wo public.work_orders;
  ts public.technician_timesheets;
begin
  select * into wo from public.work_orders where id = work_order_id;
  if not found then
    raise exception 'work order not found';
  end if;
  if wo.assigned_to_user_id <> auth.uid() then
    raise exception 'not allowed';
  end if;
  update public.work_orders
    set status = 'IN_PROGRESS',
        updated_at = now()
  where id = work_order_id;
  insert into public.work_order_events (work_order_id, actor_user_id, event_type, payload)
  values (work_order_id, auth.uid(), 'STARTED', '{}'::jsonb);

  select * into ts
  from public.technician_timesheets
  where user_id = auth.uid() and work_date = current_date
  order by created_at desc
  limit 1;
  if not found then
    select public.fn_start_timesheet(auth.uid(), wo.project_id) into ts;
  end if;

  update public.technician_time_events
    set ended_at = now(),
        duration_minutes = greatest(0, floor(extract(epoch from (now() - started_at)) / 60)::int)
  where timesheet_id = ts.id
    and started_at is not null
    and ended_at is null;

  insert into public.technician_time_events (timesheet_id, event_type, started_at, work_order_id)
  values (ts.id, 'START_JOB', now(), work_order_id);
end;
$$;

create or replace function public.fn_complete_work_order(work_order_id uuid, notes text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  wo public.work_orders;
  ts public.technician_timesheets;
begin
  select * into wo from public.work_orders where id = work_order_id;
  if not found then
    raise exception 'work order not found';
  end if;
  if wo.assigned_to_user_id <> auth.uid() then
    raise exception 'not allowed';
  end if;
  update public.work_orders
    set status = 'COMPLETE',
        updated_at = now(),
        notes = coalesce(notes, wo.notes)
  where id = work_order_id;
  insert into public.work_order_events (work_order_id, actor_user_id, event_type, payload)
  values (work_order_id, auth.uid(), 'COMPLETED', jsonb_build_object('notes', notes));

  select * into ts
  from public.technician_timesheets
  where user_id = auth.uid() and work_date = current_date
  order by created_at desc
  limit 1;
  if found then
    update public.technician_time_events
      set ended_at = now(),
          duration_minutes = greatest(0, floor(extract(epoch from (now() - started_at)) / 60)::int)
    where timesheet_id = ts.id
      and started_at is not null
      and ended_at is null;
    insert into public.technician_time_events (timesheet_id, event_type, started_at, ended_at, duration_minutes, work_order_id)
    values (ts.id, 'END_JOB', now(), now(), 0, work_order_id);
  end if;
end;
$$;
