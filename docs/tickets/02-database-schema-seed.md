# 02 — Database schema, auth hook, and seed data

**What to build:** The complete Postgres schema (tables, enums, constraints, RLS policies, role grants/revokes), the Supabase Auth Hook that stamps `workspace_id` into JWTs, and seed data that makes every subsequent ticket immediately testable. After `supabase db reset`, the database is fully populated and the auth hook is active.

**Blocked by:** 01 — Project scaffold and Supabase local dev

**Status:** ready-for-agent

- [ ] Migration: `CREATE TYPE case_priority AS ENUM ('low', 'medium', 'high', 'urgent')` — declaration order matters for `ORDER BY` sorting
- [ ] Migration: `CREATE TYPE case_status AS ENUM ('open', 'assigned', 'resolved')`
- [ ] Migration: `CREATE TYPE workspace_member_role AS ENUM ('agent', 'manager')`
- [ ] Migration: `workspaces` table (`id` UUID PK, `name`, `case_counter` bigint default 0)
- [ ] Migration: `workspace_members` table (`user_id` FK to `auth.users`, `workspace_id` FK, `role` workspace_member_role, `display_name`, composite PK on `(user_id, workspace_id)`)
- [ ] Migration: `cases` table with all columns per SPEC, unique constraint on `(workspace_id, reference)`
- [ ] Migration: `case_events` table with denormalized `workspace_id`, append-only design, JSONB `payload`
- [ ] Migration: `REVOKE ALL ON cases, case_events, workspace_members FROM anon`
- [ ] Migration: `GRANT SELECT ON cases, case_events, workspace_members TO authenticated`
- [ ] Migration: RLS policies on `cases`, `case_events`, `workspace_members` — all enforce `workspace_id = auth.jwt() ->> 'workspace_id'` for SELECT
- [ ] Migration: Auth hook Postgres function (`custom_access_token_hook`) that looks up `workspace_id` from `workspace_members` and adds it to the JWT claims
- [ ] Migration: `REVOKE EXECUTE ON FUNCTION custom_access_token_hook FROM PUBLIC, authenticated, anon`; `GRANT EXECUTE TO supabase_auth_admin`
- [ ] Auth hook configured in `supabase/config.toml`
- [ ] Seed: 2 workspaces with distinct names
- [ ] Seed: 6 users via Supabase Auth (3 per workspace: 2 agents + 1 manager), with `workspace_members` rows
- [ ] Seed: 20+ cases per workspace in mixed states (open, assigned, resolved)
- [ ] Seed: at least one resolved case per workspace with full `case_events` timeline (created → claimed → resolved)
- [ ] Seed: `case_counter` on each workspace matches the number of seeded cases
- [ ] `packages/shared` domain enums (`CaseStatus`, `CasePriority`, `WorkspaceMemberRole`) match the Postgres enum values exactly
- [ ] `supabase db reset` runs cleanly and produces the expected state
