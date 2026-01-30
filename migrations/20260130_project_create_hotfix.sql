-- Add minimal fields for project creation + admin insert support
alter table public.projects
  add column if not exists description text,
  add column if not exists created_by uuid references auth.users(id),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'projects'
      and policyname = 'projects_write_owner_prime_admin_tds'
  ) then
    create policy "projects_write_owner_prime_admin_tds"
    on public.projects for insert
    to authenticated
    with check (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.role in ('OWNER','PRIME','ADMIN','TDS')
      )
    );
  end if;
end $$;
