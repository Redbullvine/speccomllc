-- RLS Rebaseline for Data Center Security Hardening (v1)
-- SAFE: only enables RLS on tables that do NOT already have it.
-- Does NOT drop or replace any existing org-scoped / role-scoped policies.
-- Existing policies remain intact; this only closes gaps on unprotected tables.

do $$
declare
  t record;
begin
  for t in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
      and tablename not in (
        -- Exclude tables that already have explicit, well-tested RLS policies.
        -- These are managed by earlier migrations and must not be touched.
        'profiles',
        'profile_invites',
        'projects',
        'project_members',
        'orgs',
        'redline_markers',
        'messages',
        'message_board_posts',
        'ks_invoice_records',
        'ks_invoice_import_batches',
        'field_photos',
        'activity_logs'
      )
  loop
    -- Only enable RLS if it is not already on.
    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = t.schemaname
        and c.relname = t.tablename
        and c.relrowsecurity = true
    ) then
      execute format(
        'alter table %I.%I enable row level security',
        t.schemaname,
        t.tablename
      );

      -- Only add baseline policies if no policies exist yet for this table.
      if not exists (
        select 1
        from pg_policies
        where schemaname = t.schemaname
          and tablename = t.tablename
      ) then
        execute format(
          'create policy baseline_auth_select on %I.%I for select to authenticated using (auth.uid() is not null)',
          t.schemaname, t.tablename
        );
        execute format(
          'create policy baseline_auth_insert on %I.%I for insert to authenticated with check (auth.uid() is not null)',
          t.schemaname, t.tablename
        );
        execute format(
          'create policy baseline_auth_update on %I.%I for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null)',
          t.schemaname, t.tablename
        );
        execute format(
          'create policy baseline_auth_delete on %I.%I for delete to authenticated using (auth.uid() is not null)',
          t.schemaname, t.tablename
        );
      end if;
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
