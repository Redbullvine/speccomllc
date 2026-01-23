-- Demo environment: flags, users, policies, and seed data

create extension if not exists pgcrypto;

-- 1) Flags
alter table public.projects
  add column if not exists is_demo boolean not null default false;

alter table public.profiles
  add column if not exists is_demo boolean not null default false;

-- 2) Helper functions
create or replace function public.is_demo_user()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce((select is_demo from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_demo_project(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce((select is_demo from public.projects where id = p_project_id), false);
$$;

create or replace function public.is_demo_profile(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce((select is_demo from public.profiles where id = p_user_id), false);
$$;

-- 3) Demo project(s)
insert into public.projects (name, location, job_number, active, is_demo)
values ('SpecCom Demo Environment', 'Houston, TX', 'DEMO-001', true, true)
on conflict (name) do update set is_demo = true;

insert into public.projects (name, location, job_number, active, is_demo)
values ('SpecCom Demo West', 'Phoenix, AZ', 'DEMO-002', true, true)
on conflict (name) do update set is_demo = true;

-- 4) Demo auth users (password: DemoOnly-2026!)
do $$
declare
  admin_id uuid;
  supervisor_id uuid;
  splicer_id uuid;
begin
  select id into admin_id from auth.users where email = 'demo_admin@speccom.llc';
  if admin_id is null then
    admin_id := gen_random_uuid();
    insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
    values (
      admin_id,
      'demo_admin@speccom.llc',
      crypt('DemoOnly-2026!', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      'authenticated',
      'authenticated'
    );
    insert into auth.identities (id, user_id, identity_data, provider, created_at, updated_at)
    values (
      gen_random_uuid(),
      admin_id,
      jsonb_build_object('sub', admin_id::text, 'email', 'demo_admin@speccom.llc'),
      'email',
      now(),
      now()
    );
  end if;

  select id into supervisor_id from auth.users where email = 'demo_supervisor@speccom.llc';
  if supervisor_id is null then
    supervisor_id := gen_random_uuid();
    insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
    values (
      supervisor_id,
      'demo_supervisor@speccom.llc',
      crypt('DemoOnly-2026!', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      'authenticated',
      'authenticated'
    );
    insert into auth.identities (id, user_id, identity_data, provider, created_at, updated_at)
    values (
      gen_random_uuid(),
      supervisor_id,
      jsonb_build_object('sub', supervisor_id::text, 'email', 'demo_supervisor@speccom.llc'),
      'email',
      now(),
      now()
    );
  end if;

  select id into splicer_id from auth.users where email = 'demo_splicer@speccom.llc';
  if splicer_id is null then
    splicer_id := gen_random_uuid();
    insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
    values (
      splicer_id,
      'demo_splicer@speccom.llc',
      crypt('DemoOnly-2026!', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      'authenticated',
      'authenticated'
    );
    insert into auth.identities (id, user_id, identity_data, provider, created_at, updated_at)
    values (
      gen_random_uuid(),
      splicer_id,
      jsonb_build_object('sub', splicer_id::text, 'email', 'demo_splicer@speccom.llc'),
      'email',
      now(),
      now()
    );
  end if;
end $$;

-- 5) Demo profiles (mapped to existing app roles to avoid breaking production logic)
insert into public.profiles (id, display_name, role, is_demo)
select u.id, 'Demo Admin', 'PRIME'::app_role, true
from auth.users u
where u.email = 'demo_admin@speccom.llc'
on conflict (id) do update set is_demo = true, display_name = excluded.display_name, role = excluded.role;

insert into public.profiles (id, display_name, role, is_demo)
select u.id, 'Demo Supervisor', 'SUB'::app_role, true
from auth.users u
where u.email = 'demo_supervisor@speccom.llc'
on conflict (id) do update set is_demo = true, display_name = excluded.display_name, role = excluded.role;

insert into public.profiles (id, display_name, role, is_demo)
select u.id, 'Demo Splicer', 'SPLICER'::app_role, true
from auth.users u
where u.email = 'demo_splicer@speccom.llc'
on conflict (id) do update set is_demo = true, display_name = excluded.display_name, role = excluded.role;

-- 6) Demo project membership
insert into public.project_members (project_id, user_id, role)
select p.id, u.id,
  case u.email
    when 'demo_admin@speccom.llc' then 'PRIME'::app_role
    when 'demo_supervisor@speccom.llc' then 'SUB'::app_role
    else 'SPLICER'::app_role
  end
from public.projects p
join auth.users u on u.email in ('demo_admin@speccom.llc','demo_supervisor@speccom.llc','demo_splicer@speccom.llc')
where p.is_demo = true
on conflict (project_id, user_id) do nothing;

-- 7) Demo data seeding (projects -> nodes -> splice locations -> photos -> invoices -> locations)
with demo_projects as (
  select id, name
  from public.projects
  where is_demo = true
),
demo_nodes as (
  insert into public.nodes (node_number, project_id, description, status, started_at, allowed_units, used_units, ready_for_billing, created_at)
  select *
  from (
    values
      ('DEMO-NODE-1001', (select id from demo_projects where name = 'SpecCom Demo Environment'), 'Fiber rebuild - Central Loop', 'ACTIVE', now() - interval '2 days', 120, 46, true, now() - interval '2 days'),
      ('DEMO-NODE-1002', (select id from demo_projects where name = 'SpecCom Demo Environment'), 'Backbone splice - North Park', 'NOT_STARTED', null, 80, 0, false, now() - interval '1 day'),
      ('DEMO-NODE-1003', (select id from demo_projects where name = 'SpecCom Demo Environment'), 'Storm repair - Sector 3', 'ACTIVE', now() - interval '6 hours', 95, 22, false, now() - interval '6 hours'),
      ('DEMO-NODE-2001', (select id from demo_projects where name = 'SpecCom Demo West'), 'New build - West Mesa', 'ACTIVE', now() - interval '1 day', 110, 58, true, now() - interval '1 day'),
      ('DEMO-NODE-2002', (select id from demo_projects where name = 'SpecCom Demo West'), 'Hub cutover - Apache Trail', 'NOT_STARTED', null, 70, 0, false, now() - interval '12 hours')
  ) as v(node_number, project_id, description, status, started_at, allowed_units, used_units, ready_for_billing, created_at)
  where v.project_id is not null
  on conflict (node_number) do update
    set project_id = excluded.project_id,
        description = excluded.description,
        status = excluded.status,
        allowed_units = excluded.allowed_units,
        used_units = excluded.used_units,
        ready_for_billing = excluded.ready_for_billing
  returning id, node_number
),
demo_locations as (
  insert into public.splice_locations (node_id, label, location_label, completed, terminal_ports, sort_order, created_at)
  select n.id, v.label, v.location_label, v.completed, v.terminal_ports, v.sort_order, v.created_at
  from (
    values
      ('DEMO-NODE-1001','Cabinet A','Cabinet A', true, 4, 1, now() - interval '2 days'),
      ('DEMO-NODE-1001','Cabinet B','Cabinet B', false, 4, 2, now() - interval '1 day'),
      ('DEMO-NODE-1002','Vault 12','Vault 12', false, 6, 1, now() - interval '18 hours'),
      ('DEMO-NODE-1003','Pole 44','Pole 44', false, 2, 1, now() - interval '6 hours'),
      ('DEMO-NODE-2001','Splice Case 7','Splice Case 7', true, 4, 1, now() - interval '1 day'),
      ('DEMO-NODE-2001','Splice Case 9','Splice Case 9', true, 4, 2, now() - interval '20 hours'),
      ('DEMO-NODE-2002','Vault 2','Vault 2', false, 2, 1, now() - interval '12 hours')
  ) as v(node_number, label, location_label, completed, terminal_ports, sort_order, created_at)
  join demo_nodes n on n.node_number = v.node_number
  where not exists (
    select 1
    from public.splice_locations sl
    where sl.node_id = n.id
      and sl.sort_order = v.sort_order
      and sl.location_label = v.location_label
  )
  returning id, node_id
)
insert into public.splice_location_photos (splice_location_id, slot_key, photo_path, taken_at, uploaded_by)
select dl.id, v.slot_key, v.photo_path, v.taken_at, u.id
from (
  values
    ('port_1','demo/port_1.jpg', now() - interval '1 day'),
    ('splice_completion','demo/splice_completion.jpg', now() - interval '1 day')
) as v(slot_key, photo_path, taken_at)
join demo_locations dl on true
join auth.users u on u.email = 'demo_splicer@speccom.llc'
on conflict (splice_location_id, slot_key) do update
  set photo_path = excluded.photo_path,
      taken_at = excluded.taken_at,
      uploaded_by = excluded.uploaded_by;

-- Demo invoices (location billing)
insert into public.invoices (project_id, location_id, invoice_number, status, notes, subtotal, tax, total, created_by, created_at)
select p.id, sl.id, 'DEMO-INV-1001', 'draft', 'Initial demo invoice', 1200, 0, 1200, u.id, now() - interval '1 day'
from public.projects p
join public.nodes n on n.project_id = p.id
join public.splice_locations sl on sl.node_id = n.id
join auth.users u on u.email = 'demo_supervisor@speccom.llc'
where p.name = 'SpecCom Demo Environment'
limit 1
on conflict (invoice_number) do nothing;

insert into public.invoices (project_id, location_id, invoice_number, status, notes, subtotal, tax, total, created_by, created_at)
select p.id, sl.id, 'DEMO-INV-2001', 'ready', 'Awaiting approval', 980, 0, 980, u.id, now() - interval '8 hours'
from public.projects p
join public.nodes n on n.project_id = p.id
join public.splice_locations sl on sl.node_id = n.id
join auth.users u on u.email = 'demo_admin@speccom.llc'
where p.name = 'SpecCom Demo West'
limit 1
on conflict (invoice_number) do nothing;

-- Demo crew locations
insert into public.user_locations (user_id, lat, lng, heading, speed, accuracy, updated_at)
select u.id,
  case u.email
    when 'demo_admin@speccom.llc' then 29.7604
    when 'demo_supervisor@speccom.llc' then 29.7490
    else 29.7700
  end,
  case u.email
    when 'demo_admin@speccom.llc' then -95.3698
    when 'demo_supervisor@speccom.llc' then -95.3580
    else -95.3920
  end,
  120, 0.5, 8, now()
from auth.users u
where u.email in ('demo_admin@speccom.llc','demo_supervisor@speccom.llc','demo_splicer@speccom.llc')
on conflict (user_id) do update
  set lat = excluded.lat,
      lng = excluded.lng,
      heading = excluded.heading,
      speed = excluded.speed,
      accuracy = excluded.accuracy,
      updated_at = excluded.updated_at;

-- 8) Demo-safe policies
drop policy if exists "profiles_read_demo_users" on public.profiles;
create policy "profiles_read_demo_users"
on public.profiles for select
to authenticated
using (public.is_demo_user() and is_demo = true);

drop policy if exists "user_locations_select_all_authed" on public.user_locations;
create policy "user_locations_select_all_authed"
on public.user_locations for select
to authenticated
using (
  public.is_demo_user() = false
  or (public.is_demo_user() = true and public.is_demo_profile(user_id))
);

-- Restrict demo users from creating/updating invoices and billing artifacts
drop policy if exists "invoices_read_job_roles" on public.invoices;
drop policy if exists "invoices_write_job_roles" on public.invoices;
drop policy if exists "invoices_update_job_roles" on public.invoices;

create policy "invoices_read_job_roles"
on public.invoices for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('SPLICER','SUB','PRIME','OWNER','TDS')
  )
  and (
    public.is_demo_user() = false
    or (project_id is not null and public.is_demo_project(project_id))
  )
);

create policy "invoices_write_job_roles"
on public.invoices for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('SPLICER','SUB','PRIME','OWNER','TDS')
  )
  and public.is_demo_user() = false
);

create policy "invoices_update_job_roles"
on public.invoices for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('SPLICER','SUB','PRIME','OWNER','TDS')
  )
  and public.is_demo_user() = false
);

drop policy if exists "invoice_items_read_all_authed" on public.invoice_items;
drop policy if exists "invoice_items_write_job_roles" on public.invoice_items;
drop policy if exists "invoice_items_update_job_roles" on public.invoice_items;

create policy "invoice_items_read_all_authed"
on public.invoice_items for select
to authenticated
using (
  public.is_demo_user() = false
  or exists (
    select 1 from public.invoices i
    where i.id = invoice_id and public.is_demo_project(i.project_id)
  )
);

create policy "invoice_items_write_job_roles"
on public.invoice_items for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('SPLICER','SUB','PRIME','OWNER','TDS')
  )
  and public.is_demo_user() = false
);

create policy "invoice_items_update_job_roles"
on public.invoice_items for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('SPLICER','SUB','PRIME','OWNER','TDS')
  )
  and public.is_demo_user() = false
);

-- Restrict demo users from inserting/updating project members
drop policy if exists "project_members_write_owner_prime" on public.project_members;
drop policy if exists "project_members_update_owner_prime" on public.project_members;

create policy "project_members_write_owner_prime"
on public.project_members for insert
to authenticated
with check (public.is_prime_or_owner() and public.is_demo_user() = false);

create policy "project_members_update_owner_prime"
on public.project_members for update
to authenticated
using (public.is_prime_or_owner() and public.is_demo_user() = false);

-- Restrict demo users from inserting/updating sub/prime invoices
drop policy if exists "sub_invoices_read_sub_prime_owner" on public.sub_invoices;
drop policy if exists "sub_invoices_write_sub_owner" on public.sub_invoices;
drop policy if exists "sub_invoices_update_sub_prime_owner" on public.sub_invoices;

create policy "sub_invoices_read_sub_prime_owner"
on public.sub_invoices for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('SUB','PRIME','OWNER')
  )
  and (
    public.is_demo_user() = false
    or public.is_demo_project(public.project_id_for_node(node_id))
  )
);

create policy "sub_invoices_write_sub_owner"
on public.sub_invoices for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('SUB','OWNER')
  )
  and public.is_demo_user() = false
);

create policy "sub_invoices_update_sub_prime_owner"
on public.sub_invoices for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('SUB','PRIME','OWNER')
  )
  and public.is_demo_user() = false
);

drop policy if exists "prime_invoices_read_prime_tds_owner" on public.prime_invoices;
drop policy if exists "prime_invoices_write_prime_owner" on public.prime_invoices;
drop policy if exists "prime_invoices_update_prime_tds_owner" on public.prime_invoices;

create policy "prime_invoices_read_prime_tds_owner"
on public.prime_invoices for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('PRIME','TDS','OWNER')
  )
  and (
    public.is_demo_user() = false
    or public.is_demo_project(public.project_id_for_node(node_id))
  )
);

create policy "prime_invoices_write_prime_owner"
on public.prime_invoices for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('PRIME','OWNER')
  )
  and public.is_demo_user() = false
);

create policy "prime_invoices_update_prime_tds_owner"
on public.prime_invoices for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('PRIME','TDS','OWNER')
  )
  and public.is_demo_user() = false
);
