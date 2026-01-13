-- Billing domain schema + RLS (SpecCom)

-- Rate cards
create table if not exists public.rate_cards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  project_id uuid references public.projects(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.rate_cards enable row level security;

create policy "rate_cards_read_all_authed"
on public.rate_cards for select
to authenticated
using (true);

create policy "rate_cards_write_owner_prime_tds"
on public.rate_cards for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('OWNER','PRIME','TDS')
  )
);

create policy "rate_cards_update_owner_prime_tds"
on public.rate_cards for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('OWNER','PRIME','TDS')
  )
);

-- Work codes
create table if not exists public.work_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  description text,
  unit text,
  default_rate numeric(10,2),
  created_at timestamptz not null default now()
);

alter table public.work_codes enable row level security;

create policy "work_codes_read_all_authed"
on public.work_codes for select
to authenticated
using (true);

create policy "work_codes_write_owner_prime_tds"
on public.work_codes for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('OWNER','PRIME','TDS')
  )
);

create policy "work_codes_update_owner_prime_tds"
on public.work_codes for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('OWNER','PRIME','TDS')
  )
);

-- Rate card items
create table if not exists public.rate_card_items (
  id uuid primary key default gen_random_uuid(),
  rate_card_id uuid not null references public.rate_cards(id) on delete cascade,
  work_code_id uuid not null references public.work_codes(id) on delete cascade,
  rate numeric(10,2) not null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'rate_card_items_unique'
      and conrelid = 'public.rate_card_items'::regclass
  ) then
    alter table public.rate_card_items
      add constraint rate_card_items_unique unique (rate_card_id, work_code_id);
  end if;
end $$;

alter table public.rate_card_items enable row level security;

create policy "rate_card_items_read_all_authed"
on public.rate_card_items for select
to authenticated
using (true);

create policy "rate_card_items_write_owner_prime_tds"
on public.rate_card_items for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('OWNER','PRIME','TDS')
  )
);

create policy "rate_card_items_update_owner_prime_tds"
on public.rate_card_items for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('OWNER','PRIME','TDS')
  )
);

-- Extend invoices table for location billing
alter table public.invoices
  add column if not exists project_id uuid references public.projects(id),
  add column if not exists location_id uuid references public.splice_locations(id),
  add column if not exists invoice_number text,
  add column if not exists subtotal numeric(12,2) default 0,
  add column if not exists tax numeric(12,2) default 0,
  add column if not exists total numeric(12,2) default 0,
  add column if not exists notes text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.invoices
  alter column billed_by_org_id drop not null,
  alter column billed_to_org_id drop not null;

create policy "invoices_read_job_roles"
on public.invoices for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('SPLICER','SUB','PRIME','OWNER','TDS')
  )
);

create policy "invoices_write_job_roles"
on public.invoices for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('SPLICER','SUB','PRIME','OWNER','TDS')
  )
);

create policy "invoices_update_job_roles"
on public.invoices for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('SPLICER','SUB','PRIME','OWNER','TDS')
  )
);

-- Allow lowercase/uppercase statuses for legacy rows
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'invoices_status_check'
      and conrelid = 'public.invoices'::regclass
  ) then
    alter table public.invoices
      add constraint invoices_status_check
      check (status in ('draft','ready','submitted','paid','void','Draft','Ready','Submitted','Paid','Void'));
  end if;
end $$;

-- Invoice line items (work codes)
create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  work_code_id uuid references public.work_codes(id),
  description text,
  unit text,
  qty numeric(12,2) not null default 0,
  rate numeric(10,2) not null default 0,
  amount numeric(12,2) generated always as (qty * rate) stored,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.invoice_items enable row level security;

create policy "invoice_items_read_all_authed"
on public.invoice_items for select
to authenticated
using (true);

create policy "invoice_items_write_job_roles"
on public.invoice_items for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('SPLICER','SUB','PRIME','OWNER','TDS')
  )
);

create policy "invoice_items_update_job_roles"
on public.invoice_items for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('SPLICER','SUB','PRIME','OWNER','TDS')
  )
);

-- Location proof requirements
create table if not exists public.location_proof_requirements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id),
  location_type text,
  required_photos integer not null default 0,
  enforce_geofence boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.location_proof_requirements enable row level security;

create policy "location_proof_requirements_read_all_authed"
on public.location_proof_requirements for select
to authenticated
using (true);

create policy "location_proof_requirements_write_owner_prime_tds"
on public.location_proof_requirements for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('OWNER','PRIME','TDS')
  )
);

create policy "location_proof_requirements_update_owner_prime_tds"
on public.location_proof_requirements for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('OWNER','PRIME','TDS')
  )
);

create or replace view public.location_proof_status as
select
  sl.id as location_id,
  sl.node_id,
  count(p.id) as proof_uploaded,
  coalesce(lpr.required_photos, sl.terminal_ports + 1) as proof_required,
  (count(p.id) >= coalesce(lpr.required_photos, sl.terminal_ports + 1)) as proof_complete
from public.splice_locations sl
left join public.splice_location_photos p
  on p.splice_location_id = sl.id
left join public.nodes n
  on n.id = sl.node_id
left join public.location_proof_requirements lpr
  on lpr.project_id = n.project_id
  and lpr.location_type is null
group by sl.id, sl.node_id, lpr.required_photos, sl.terminal_ports;

-- Minimal seed data
insert into public.work_codes (code, description, unit, default_rate)
values
  ('2015', 'Fiber drop install', 'EA', 95.00),
  ('MST-SP', 'MST splice', 'PORT', 12.00),
  ('TRAY', 'Splice tray', 'EA', 65.00)
on conflict (code) do update
set description = excluded.description,
    unit = excluded.unit,
    default_rate = excluded.default_rate;

insert into public.rate_cards (name)
values ('TDS 2026 Rates - NM')
on conflict do nothing;

insert into public.rate_card_items (rate_card_id, work_code_id, rate)
select rc.id, wc.id, wc.default_rate
from public.rate_cards rc
join public.work_codes wc on wc.code in ('2015','MST-SP','TRAY')
where rc.name = 'TDS 2026 Rates - NM'
on conflict do nothing;
