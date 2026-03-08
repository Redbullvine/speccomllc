-- SpecCom live demo account setup
-- Target account: demo_admin@speccom.llc
-- Run in Supabase SQL editor after creating the auth user in Authentication > Users.

do $$
declare
  v_demo_email constant text := 'demo_admin@speccom.llc';
  v_demo_name constant text := 'SpecCom Demo Admin';
  v_org_name constant text := 'SpecCom Demo Org';
  v_project_name constant text := 'SpecCom Demo Project';
  v_user_id uuid;
  v_org_id uuid;
  v_project_id uuid;
begin
  select id into v_user_id
  from auth.users
  where lower(email) = lower(v_demo_email)
  order by created_at desc
  limit 1;

  if v_user_id is null then
    raise exception 'Auth user % not found. Create user in Supabase Auth first.', v_demo_email;
  end if;

  select id into v_org_id
  from public.orgs
  where lower(name) = lower(v_org_name)
  order by created_at desc
  limit 1;

  if v_org_id is null then
    insert into public.orgs (name, role)
    values (v_org_name, 'ADMIN'::app_role)
    returning id into v_org_id;
  end if;

  -- Keep invite path healthy for profile self-heal flows.
  insert into public.profile_invites (email, org_id, role_code, display_name, created_by)
  values (lower(v_demo_email), v_org_id, 'ADMIN', v_demo_name, v_user_id)
  on conflict (email) do update
    set org_id = excluded.org_id,
        role_code = excluded.role_code,
        display_name = excluded.display_name,
        updated_at = now();

  insert into public.profiles (id, display_name, org_id, role, role_code)
  values (v_user_id, v_demo_name, v_org_id, 'ADMIN'::app_role, 'ADMIN')
  on conflict (id) do update
    set display_name = excluded.display_name,
        org_id = excluded.org_id,
        role = excluded.role,
        role_code = excluded.role_code;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'can_view_invoices'
  ) then
    update public.profiles
    set can_view_invoices = true
    where id = v_user_id;
  end if;

  select id into v_project_id
  from public.projects
  where org_id = v_org_id
    and lower(name) = lower(v_project_name)
  order by created_at desc
  limit 1;

  if v_project_id is null then
    insert into public.projects (org_id, name, description, created_by)
    values (v_org_id, v_project_name, 'Live demo seed project', v_user_id)
    returning id into v_project_id;
  end if;

  insert into public.project_members (project_id, user_id, role, role_code)
  values (v_project_id, v_user_id, 'ADMIN'::app_role, 'ADMIN')
  on conflict (project_id, user_id) do update
    set role = excluded.role,
        role_code = excluded.role_code;
end $$;

-- Optional quick check
select
  u.email,
  p.id as profile_id,
  p.role,
  p.role_code,
  p.org_id
from auth.users u
join public.profiles p on p.id = u.id
where lower(u.email) = lower('demo_admin@speccom.llc');
