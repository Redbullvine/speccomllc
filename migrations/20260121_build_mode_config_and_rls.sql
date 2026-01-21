create table if not exists public.app_config (
  key text primary key,
  enabled boolean not null default false
);

insert into public.app_config (key, enabled)
values ('build_mode', true)
on conflict (key) do update
set enabled = excluded.enabled;

create or replace function public.is_build_mode()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce((select enabled from public.app_config where key = 'build_mode'), false);
$$;

create or replace function public.fn_require_proof_for_invoice()
returns trigger
language plpgsql
as $$
declare
  missing_splice boolean;
  missing_usage boolean;
begin
  if public.is_build_mode() then
    return new;
  end if;

  if new.status not in ('Submitted','Sent','Approved') then
    return new;
  end if;

  if new.node_id is null then
    raise exception 'Invoice requires a node before submission.';
  end if;

  select exists (
    select 1
    from public.splice_locations sl
    left join public.proof_uploads po
      on po.splice_location_id = sl.id and po.photo_type = 'open'
    left join public.proof_uploads pc
      on pc.splice_location_id = sl.id and pc.photo_type = 'closed'
    where sl.node_id = new.node_id
      and (po.id is null or pc.id is null)
  ) into missing_splice;

  select exists (
    select 1 from public.usage_events ue
    where ue.node_id = new.node_id
      and coalesce(ue.proof_required, true) = true
      and (ue.photo_path is null or ue.gps_lat is null or ue.captured_at_server is null)
  ) into missing_usage;

  if missing_splice or missing_usage then
    raise exception 'Photos required before invoice submission.';
  end if;

  return new;
end $$;

drop policy if exists "nodes_build_mode_all" on public.nodes;
create policy "nodes_build_mode_all"
on public.nodes for all
to authenticated
using (public.is_build_mode() or public.is_owner())
with check (public.is_build_mode() or public.is_owner());

drop policy if exists "splice_locations_build_mode_all" on public.splice_locations;
create policy "splice_locations_build_mode_all"
on public.splice_locations for all
to authenticated
using (public.is_build_mode() or public.is_owner())
with check (public.is_build_mode() or public.is_owner());

drop policy if exists "splice_location_photos_build_mode_all" on public.splice_location_photos;
create policy "splice_location_photos_build_mode_all"
on public.splice_location_photos for all
to authenticated
using (public.is_build_mode() or public.is_owner())
with check (public.is_build_mode() or public.is_owner());

drop policy if exists "invoices_build_mode_all" on public.invoices;
create policy "invoices_build_mode_all"
on public.invoices for all
to authenticated
using (public.is_build_mode() or public.is_owner())
with check (public.is_build_mode() or public.is_owner());

drop policy if exists "invoice_items_build_mode_all" on public.invoice_items;
create policy "invoice_items_build_mode_all"
on public.invoice_items for all
to authenticated
using (public.is_build_mode() or public.is_owner())
with check (public.is_build_mode() or public.is_owner());

drop policy if exists "sub_invoices_build_mode_all" on public.sub_invoices;
create policy "sub_invoices_build_mode_all"
on public.sub_invoices for all
to authenticated
using (public.is_build_mode() or public.is_owner())
with check (public.is_build_mode() or public.is_owner());

drop policy if exists "prime_invoices_build_mode_all" on public.prime_invoices;
create policy "prime_invoices_build_mode_all"
on public.prime_invoices for all
to authenticated
using (public.is_build_mode() or public.is_owner())
with check (public.is_build_mode() or public.is_owner());

drop policy if exists "profiles_build_mode_all" on public.profiles;
create policy "profiles_build_mode_all"
on public.profiles for all
to authenticated
using (public.is_build_mode() or public.is_owner())
with check (public.is_build_mode() or public.is_owner());
