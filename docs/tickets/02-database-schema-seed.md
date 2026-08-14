# 02 — Database schema, auth hook, and seed data

**What to build:** The complete Postgres schema (tables, enums, constraints, RLS policies, role grants/revokes), the Supabase Auth Hook that stamps `workspace_id` into JWTs, and seed data that makes every subsequent ticket immediately testable. After `supabase db reset`, the database is fully populated and the auth hook is active.

**Blocked by:** 01 — Project scaffold and Supabase local dev

**Status:** ready-for-agent

- [x] Migration: `CREATE TYPE case_priority AS ENUM ('low', 'medium', 'high', 'urgent')` — declaration order matters for `ORDER BY` sorting
- [x] Migration: `CREATE TYPE case_status AS ENUM ('open', 'assigned', 'resolved')`
- [x] Migration: `CREATE TYPE workspace_member_role AS ENUM ('agent', 'manager')`
- [x] Migration: `workspaces` table (`id` UUID PK, `name`, `case_counter` bigint default 0)
- [x] Migration: `workspace_members` table (`user_id` FK to `auth.users`, `workspace_id` FK, `role` workspace_member_role, `display_name`, composite PK on `(user_id, workspace_id)`)
- [x] Migration: `cases` table with all columns per SPEC, unique constraint on `(workspace_id, reference)`
- [x] Migration: `case_events` table with denormalized `workspace_id`, append-only design, JSONB `payload`
- [x] Migration: `REVOKE ALL ON cases, case_events, workspace_members FROM anon`
- [x] Migration: `GRANT SELECT ON cases, case_events, workspace_members TO authenticated`
- [x] Migration: RLS policies on `cases`, `case_events`, `workspace_members` — all enforce `workspace_id = auth.jwt() ->> 'workspace_id'` for SELECT
- [x] Migration: Auth hook Postgres function (`custom_access_token_hook`) that looks up `workspace_id` from `workspace_members` and adds it to the JWT claims
- [x] Migration: `REVOKE EXECUTE ON FUNCTION custom_access_token_hook FROM PUBLIC, authenticated, anon`; `GRANT EXECUTE TO supabase_auth_admin`
- [x] Auth hook configured in `supabase/config.toml`
- [x] Seed: 2 workspaces with distinct names
- [x] Seed: 6 users via Supabase Auth (3 per workspace: 2 agents + 1 manager), with `workspace_members` rows
- [x] Seed: 20+ cases per workspace in mixed states (open, assigned, resolved)
- [x] Seed: at least one resolved case per workspace with full `case_events` timeline (created → claimed → resolved)
- [x] Seed: `case_counter` on each workspace matches the number of seeded cases
- [x] `packages/shared` domain enums (`CaseStatus`, `CasePriority`, `WorkspaceMemberRole`) match the Postgres enum values exactly
- [x] `supabase db reset` runs cleanly and produces the expected state
