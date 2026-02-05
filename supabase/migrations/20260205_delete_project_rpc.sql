create or replace function public.fn_delete_project(p_project_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_role public.app_role;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select p.role into v_role
  from public.profiles p
  where p.id = v_user_id;

  if v_role is null or v_role::text not in ('OWNER','ADMIN') then
    raise exception 'Not authorized';
  end if;

  delete from public.site_media
  where site_id in (select id from public.sites where project_id = p_project_id);

  delete from public.site_entries
  where site_id in (select id from public.sites where project_id = p_project_id);

  delete from public.sites
  where project_id = p_project_id;

  delete from public.project_members
  where project_id = p_project_id;

  delete from public.projects
  where id = p_project_id;

  return jsonb_build_object('ok', true, 'project_id', p_project_id);
end;
$$;

revoke all on function public.fn_delete_project(uuid) from public;
grant execute on function public.fn_delete_project(uuid) to authenticated;
