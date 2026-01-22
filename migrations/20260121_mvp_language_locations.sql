-- MVP: language preference, live user locations, translation cache

-- A) Language preference on profiles
alter table public.profiles
  add column if not exists preferred_language text not null default 'en';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_preferred_language_check'
  ) then
    alter table public.profiles
      add constraint profiles_preferred_language_check
      check (preferred_language in ('en','es'));
  end if;
end $$;

-- B) Live user locations
create table if not exists public.user_locations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  heading double precision null,
  speed double precision null,
  accuracy double precision null,
  updated_at timestamptz not null default now()
);

alter table public.user_locations enable row level security;

drop policy if exists "user_locations_read_own" on public.user_locations;
drop policy if exists "user_locations_insert_own" on public.user_locations;
drop policy if exists "user_locations_update_own" on public.user_locations;
drop policy if exists "user_locations_admin_read_all" on public.user_locations;

create policy "user_locations_read_own"
on public.user_locations for select
to authenticated
using (auth.uid() = user_id);

create policy "user_locations_insert_own"
on public.user_locations for insert
to authenticated
with check (auth.uid() = user_id);

create policy "user_locations_update_own"
on public.user_locations for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- OWNER can read all locations (adjust role list if you use a different admin role)
create policy "user_locations_admin_read_all"
on public.user_locations for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('OWNER')
  )
);

-- D) Translation cache
create table if not exists public.text_translations (
  id bigserial primary key,
  source_lang text not null check (source_lang in ('en','es','auto')),
  target_lang text not null check (target_lang in ('en','es')),
  source_hash text not null,
  source_text text not null,
  translated_text text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists text_translations_unique
  on public.text_translations (target_lang, source_hash);

alter table public.text_translations enable row level security;

drop policy if exists "text_translations_read_authed" on public.text_translations;
drop policy if exists "text_translations_insert_authed" on public.text_translations;

create policy "text_translations_read_authed"
on public.text_translations for select
to authenticated
using (true);

create policy "text_translations_insert_authed"
on public.text_translations for insert
to authenticated
with check (true);
