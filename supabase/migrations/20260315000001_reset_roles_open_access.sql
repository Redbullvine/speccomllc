-- SPEC-COM hard reset: remove role system and open authenticated access for development

-- STEP 1: remove role columns from profiles
alter table public.profiles
  drop column if exists role;

alter table public.profiles
  drop column if exists role_code;

-- STEP 2: remove role enum
DROP TYPE IF EXISTS app_role CASCADE;

-- STEP 3: remove old role/profile trigger wiring
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.fn_profiles_handle_new_auth_user cascade;

-- STEP 4: clean profile creation trigger function
create or replace function public.fn_create_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      split_part(new.email,'@',1)
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.fn_create_profile();

-- STEP 5: remove legacy role policies
drop policy if exists "admins_full_access" on public.profiles;
drop policy if exists "users_select_self" on public.profiles;
drop policy if exists "admins_update_all" on public.profiles;

-- STEP 6: temporary open access policy for authenticated users
alter table public.profiles enable row level security;
drop policy if exists "authenticated_full_access" on public.profiles;

create policy "authenticated_full_access"
on public.profiles
for all
to authenticated
using (true)
with check (true);
