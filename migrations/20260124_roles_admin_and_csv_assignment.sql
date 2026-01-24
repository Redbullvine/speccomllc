-- Add ADMIN role + privileged helper + deterministic assignment identifiers

do $$
begin
  if exists (select 1 from pg_type where typname = 'app_role') then
    alter type app_role add value if not exists 'ADMIN';
  else
    create type app_role as enum ('ADMIN','OWNER','PRIME','TDS','SUB','SPLICER','TECHNICIAN');
  end if;
end $$;

create or replace function public.is_privileged_role(p_role app_role)
returns boolean
language sql
stable
as $$
  select p_role::text in ('ADMIN','OWNER','PRIME');
$$;

alter table public.profiles
  add column if not exists work_email text,
  add column if not exists employee_id text;

create unique index if not exists profiles_work_email_unique
  on public.profiles (lower(work_email))
  where work_email is not null;

create unique index if not exists profiles_employee_id_unique
  on public.profiles (employee_id)
  where employee_id is not null;

create or replace function public.fn_resolve_user_id(identifier text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text := lower(trim(identifier));
  raw_identifier text := trim(identifier);
  current_role app_role;
  result uuid;
begin
  select role into current_role from public.profiles where id = auth.uid();
  if not public.is_privileged_role(current_role) then
    raise exception 'not allowed';
  end if;
  if raw_identifier is null or raw_identifier = '' then
    raise exception 'identifier required';
  end if;
  select id into result
  from public.profiles
  where (work_email is not null and lower(work_email) = normalized)
     or (employee_id is not null and employee_id = raw_identifier)
  limit 1;
  if result is null then
    raise exception 'user not found';
  end if;
  return result;
end;
$$;

-- Update technician admin policies to use is_privileged_role
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

-- Update work order guard + policies
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
