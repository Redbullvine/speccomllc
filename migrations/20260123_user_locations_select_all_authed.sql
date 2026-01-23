-- Allow all authenticated users to read live locations (MVP)
create policy "user_locations_select_all_authed"
on public.user_locations
for select
to authenticated
using (auth.role() = 'authenticated');
