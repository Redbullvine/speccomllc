# HANDOFF_PROOF

## Scope Decision
- Message board scope: company-wide (org-scoped), not cross-company.
- SUPPORT scope: company-scoped by default.
- ROOT remains the only global bypass.

## Data Model Used
- Messages:
  - table: `public.messages`
  - key fields: `org_id`, `channel`, `sender_id`, `recipient_id`, `body`, `created_at`
- Profiles / invite bootstrap:
  - table: `public.profiles`
  - table: `public.profile_invites`
  - RPC: `public.fn_upsert_profile_invite(email, role_code, display_name, org_id)`
  - RPC: `public.fn_claim_profile_invite()`
  - trigger: `public.fn_profiles_handle_new_auth_user()` on `auth.users`
- Photos:
  - table: `public.site_media`
  - storage bucket: `proof-photos`
  - app upload path format:
    - `{org_id}/{project_id}/{location_id}/{prefix}/{uuid}-{safe_file_name}`
- Billing codes:
  - table: `public.site_codes`

## RLS Summary (Expected)

### `public.messages`
- SELECT:
  - ROOT: full access.
  - Non-ROOT: same `org_id` only.
  - BOARD visible in org.
  - DM visible only if sender or recipient.
- INSERT:
  - sender must be `auth.uid()`.
  - BOARD: any authenticated org member can post within own org.
  - DM: recipient must exist in same org (unless ROOT).
- DELETE:
  - sender can delete own message in same org.
  - ROOT can delete globally.

### `public.site_media`
- SELECT:
  - ROOT global.
  - Non-ROOT: same org via `site -> project -> org` join.
- INSERT:
  - `created_by = auth.uid()`.
  - org must match via `site -> project -> org`.
- DELETE:
  - ROOT global.
  - Non-ROOT same org and one of:
    - uploader (`created_by = auth.uid()`), or
    - OWNER / ADMIN / SUPPORT.

### `public.profile_invites`
- ROOT: can read/write any org invite.
- Non-ROOT privileged roles (OWNER/ADMIN/PROJECT_MANAGER/SUPPORT):
  - org-scoped read/write only.

## 5-Minute Smoke Test (Two Companies + SUB case)

1. Setup
- Create two orgs: `OrgA`, `OrgB`.
- Create one project per org.
- Users:
  - `root_user` (ROOT)
  - `admin_a` (ADMIN in OrgA)
  - `user1_a` (USER_LEVEL_1 in OrgA)
  - `support_a` (SUPPORT in OrgA)
  - `user1_b` (USER_LEVEL_1 in OrgB)

2. Invite + profile bootstrap
- As `admin_a`, invite `newtech@orga.com` from User Management.
- Verify row in `profile_invites` with OrgA + role default USER_LEVEL_1.
- Sign in as `newtech@orga.com` via OTP/magic link.
- Verify `profiles` row auto-created/updated with OrgA + USER_LEVEL_1.

3. Message board org isolation
- As `user1_a`, post BOARD message.
- As `user1_b`, confirm message is NOT visible.
- As `support_a`, confirm message is visible and can post BOARD.

4. Photo flow (USER1 non-ROOT)
- As `user1_a`, open map popup for OrgA location.
- Upload photo from popup.
- Full browser refresh.
- Reopen popup and confirm photo LISTS.
- Delete own photo (should pass).
- As different OrgA USER1, delete that same photo (should fail).
- As `admin_a` or `support_a`, delete should pass.

5. Cross-company safety
- As `user1_b`, confirm cannot list/upload/delete photos tied to OrgA locations.
- As ROOT, confirm cross-org visibility is available.

## Notes
- Default role is enforced at DB level (`USER_LEVEL_1`), UI mirrors this default.
- Patrick mapping to SUPPORT is centralized in one app helper and DB invite function.
- If migrations are not applied yet, app has compatibility fallback where possible, but full policy behavior requires migration deployment.
