# Job visibility: why the list changed between loads

Diagnosed 2026-09-29 against the SpecCom project (read-only SQL, plus reading the client).

## Sources that filtered or supplied the list (before `my_jobs()`)

| Source | Effect |
|---|---|
| `netlify/functions/list-projects.js` | Uses the service-role key and returns **every** project (its `filterProjectsForUser` is an identity function). First choice of `loadProjects()`. |
| `projects.public_read` policy (`using true`) | Any client query, even anonymous, sees every project. |
| `projects_select` policy | `org_id = my_org_id() OR my_role() = 'root'`. Never the deciding filter, because `public_read` ORs it open. |
| `project_members_select` policy | Org-scoped through `my_org_id()` / `my_role()`. A user whose membership is in another company sees only some of their own rows: the tested member has **3** memberships but the client sees **2**. |
| `loadProjects()` fallbacks | If the service call failed it fell back to a direct query, and if the result was empty it fell back to `project_members` (the org-scoped, 2-of-3 view). |
| Active org (`state.activeOrgId`, `speccom.active_org_id`) | Follows whichever project was last active, so the company context drifted with the job. |
| `shouldUseFieldProjectBucket()` | Always `false`; the workspace/field filter was dead code. |
| `state.profile.current_project_id` / saved preference | Chose the active job, which read as "the list changed". |

`BUILD_MODE` and `my_role()` timing do not filter the job list; they gate billing and role-based views.

## Cause of "all jobs one time, 2-3 the next"

The list came from two paths that disagree. When the Netlify function answered, everyone got all 5 projects.
When it failed or was slow (cold start, expired token, local host), the client used the membership fallback,
which goes through the org-scoped `project_members` policy and returns 2-3. Which one you got depended on
timing, not on who you are.

## Fix

`public.my_jobs()` (SECURITY DEFINER): root gets all active jobs; everyone else gets active jobs from their own
`project_members` rows. It does not read the company switcher, adds nothing to any RLS policy, and every job
list in the client now calls it and nothing else.

## Not changed (out of scope for this task, needs a decision)

- `projects.public_read`, `field_photos.public_read`, `splice_location_photos.public_read` and
  `work_orders_select_all_authed` are all `using true`, so the database itself does not hide a job's photos,
  work orders or project rows from non-members. `my_jobs()` fixes the list; it cannot make those tables private.
- `netlify/functions/list-projects.js` is no longer called but still returns every project to any token holder.
