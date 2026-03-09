# SpecCom Live Demo Handoff (Live Site First)

## Scope
- Primary demo/test surface is the deployed SpecCom site.
- Local bootstrap is no longer the primary demo path.
- Use a real Supabase auth user and real app data rows.

## Required tables for a working live user
- `auth.users`: required (Supabase Authentication identity).
- `public.profiles`: required (app role, org, language, invoice visibility).
- `public.orgs`: required for org-scoped modules.
- `public.projects`: required for project context.
- `public.project_members`: required for project visibility under RLS.

## Invite/repair path tables
- `public.profile_invites`: recommended so missing `profiles`/`org_id` can self-heal through `fn_claim_profile_invite()`.

## Demo account target
- Email: `demo_admin@speccom.llc`
- Password placeholder: `SpecComDemo-2026!` (set in Supabase Auth, never committed in client files)
- Recommended role: `ADMIN`
- Recommended org: `SpecCom Demo Org`

## Live setup steps
1. In Supabase Dashboard: Authentication -> Users -> create `demo_admin@speccom.llc` with your live password.
2. In SQL Editor, run [scripts/sql/setup_live_demo_account.sql](/c:/Projects/speccom/scripts/sql/setup_live_demo_account.sql).
3. In Netlify environment variables, set:
   - `DEMO_SHOWCASE_ACCOUNT_ENABLED=true`
   - `LIVE_SHOWCASE_EMAILS=demo_admin@speccom.llc`
4. Redeploy.
5. Sign in on the deployed site with the real demo account.

## How live showcase mode is enabled
- `APP_MODE=demo` still enables full showcase globally (demo environments only).
- In `APP_MODE=real`, you can enable showcase either way:
  - `DEMO_SHOWCASE_ENABLED=true` (global showcase for demo sessions)
  - or account-scoped:
  - `DEMO_SHOWCASE_ACCOUNT_ENABLED=true`
  - signed-in email must match `LIVE_SHOWCASE_EMAILS`.
- Keep `DEMO_SHOWCASE_ENABLED` off for strict role-based production behavior.

## Notes
- `DEMO_PASSWORD` is not exposed in tracked client env output.
- Keep all demo credentials in Supabase/Auth + Netlify environment settings only.
