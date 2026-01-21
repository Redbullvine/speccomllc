alter table public.splice_locations
  add column if not exists label text;

alter table public.splice_locations
  add column if not exists sort_order int;

update public.splice_locations
set label = location_label
where label is null;

with ordered as (
  select id,
         row_number() over (
           partition by node_id
           order by created_at nulls last, id
         ) as rn
  from public.splice_locations
  where sort_order is null
)
update public.splice_locations sl
set sort_order = ordered.rn
from ordered
where sl.id = ordered.id;

drop policy if exists "splice_locations_delete_owner" on public.splice_locations;
create policy "splice_locations_delete_owner"
on public.splice_locations for delete
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'OWNER'
  )
);

drop policy if exists "splice_location_photos_delete_owner" on public.splice_location_photos;
create policy "splice_location_photos_delete_owner"
on public.splice_location_photos for delete
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'OWNER'
  )
);
