-- Read-only proof for my_jobs(). Run in the SQL editor as the postgres role.
-- Picks its own test identities; changes no data (temp table only).
create temp table _r(k text, n bigint, names text);
grant all on _r to authenticated, anon;

create temp table _who as
select
  (select id from profiles where lower(role) = 'root' limit 1)                         as root_id,
  (select pr.id from profiles pr where lower(pr.role) <> 'root'
     and exists (select 1 from project_members m where m.user_id = pr.id)
     order by (select count(*) from project_members m where m.user_id = pr.id) desc limit 1) as member_id,
  (select pr.id from profiles pr where lower(pr.role) <> 'root'
     and not exists (select 1 from project_members m where m.user_id = pr.id) limit 1)  as nonmember_id;
grant select on _who to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select root_id from _who), 'role', 'authenticated')::text, false);
insert into _r select 'root: all active jobs', count(*), string_agg(name, ', ') from my_jobs();

select set_config('request.jwt.claims', json_build_object('sub', (select member_id from _who), 'role', 'authenticated')::text, false);
insert into _r select 'member: own memberships only', count(*), string_agg(name, ', ') from my_jobs();
insert into _r select 'member: repeat call is identical', count(*), string_agg(name, ', ') from my_jobs();

select set_config('request.jwt.claims', json_build_object('sub', (select nonmember_id from _who), 'role', 'authenticated')::text, false);
insert into _r select 'non-member: none', count(*), string_agg(name, ', ') from my_jobs();
reset role;

select * from _r order by k;
-- expect: root = count of active projects; member = that user's active memberships;
-- non-member = 0.
