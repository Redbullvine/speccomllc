-- Storage lockdown for field photos bucket.
-- - Remove public read
-- - Set bucket private
-- - Allow authenticated read/insert only

insert into storage.buckets (id, name, public)
values ('field-photos', 'field-photos', false)
on conflict (id) do update
set public = false;

drop policy if exists "field_photos_public_read" on storage.objects;
drop policy if exists "field_photos_auth_insert" on storage.objects;
drop policy if exists "field_photos_auth_update" on storage.objects;
drop policy if exists "field_photos_auth_delete" on storage.objects;
drop policy if exists "field_photos_private_read" on storage.objects;
drop policy if exists "field_photos_private_insert" on storage.objects;

create policy "field_photos_private_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'field-photos'
  and auth.uid() is not null
);

create policy "field_photos_private_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'field-photos'
  and auth.uid() is not null
);

notify pgrst, 'reload schema';
