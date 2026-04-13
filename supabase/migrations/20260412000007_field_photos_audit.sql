-- Field photo traceability baseline.
-- - Add uploader + upload timestamp fields for forensic audit trail
-- - Insert policy: authenticated only for now; user_id enforcement added
--   once app code is updated to always pass user_id on insert (Phase 2).

alter table public.field_photos
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists uploaded_at timestamptz not null default now();

update public.field_photos
set uploaded_at = coalesce(uploaded_at, created_at, now())
where uploaded_at is null;

-- Existing records cannot be reliably attributed in migration context.
-- Future inserts will populate user_id from the app layer.
update public.field_photos
set user_id = null
where user_id is null;

-- Phase 1: allow any authenticated insert (columns are there for tracing,
-- strict user_id = auth.uid() enforcement is Phase 2 after app code ships).
drop policy if exists baseline_auth_insert on public.field_photos;
drop policy if exists "field_photos_insert_by_project_org" on public.field_photos;
drop policy if exists "field_photos_insert_authenticated_owned" on public.field_photos;

create policy "field_photos_insert_authenticated"
on public.field_photos
for insert
to authenticated
with check (
  auth.uid() is not null
);

notify pgrst, 'reload schema';
