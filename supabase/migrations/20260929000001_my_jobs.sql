-- my_jobs(): the ONE source for every job list in SpecCom.
--
--   root          -> every active job, across companies
--   everyone else -> active jobs the signed-in user is a project_members row for
--
-- Why this exists: the job list used to come from three places that disagree
-- (a service-role endpoint returning every project, the projects_select /
-- public_read policies, and project_members read through an org-scoped policy),
-- so a user could see all jobs one time and 2-3 the next.
--
-- Rules for this function:
--   * SECURITY DEFINER, so it never depends on the caller's RLS.
--   * It does not read the active-company switcher (that lives in the client).
--   * It is a function, not a policy: it does not add a profiles subquery to any
--     RLS policy, so it cannot recurse.
--   * Read-only. No table, column, policy or bucket is changed by this migration.
--
-- "Active" means projects.active is not false (NULL counts as active), matching
-- the app's existing isProjectMarkedInactive().

create or replace function public.my_jobs()
returns table (
  id uuid,
  org_id uuid,
  name text,
  description text,
  job_number text,
  location text,
  customer_name text,
  created_at timestamptz,
  created_by uuid,
  is_demo boolean,
  active boolean,
  scope text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with me as (
    select auth.uid() as uid,
           exists (
             select 1 from public.profiles pr
             where pr.id = auth.uid() and lower(pr.role) = 'root'
           ) as is_root
  )
  select p.id, p.org_id, p.name, p.description, p.job_number, p.location,
         p.customer_name, p.created_at, p.created_by, p.is_demo, p.active,
         case when me.is_root then 'root' else 'member' end as scope
  from public.projects p
  cross join me
  where me.uid is not null
    and coalesce(p.active, true)
    and (
      me.is_root
      or exists (
        select 1 from public.project_members m
        where m.project_id = p.id and m.user_id = me.uid
      )
    )
  order by p.name;
$$;

revoke all on function public.my_jobs() from public, anon;
grant execute on function public.my_jobs() to authenticated;

comment on function public.my_jobs() is
  'Single source for job lists: root sees all active jobs, everyone else only active jobs they are a project_members row for.';
