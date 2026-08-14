# Authenticated role has SELECT only; all writes through NestJS service-role

Supabase exposes PostgREST directly. If the `authenticated` Postgres role had INSERT/UPDATE/DELETE grants, any user with a valid JWT could bypass NestJS and mutate data — setting arbitrary assignees, skipping state transitions, or writing history without updating cases. RLS can enforce workspace scoping but cannot enforce business logic (state machine, resolution note requirement, claim atomicity).

We revoke all write grants from `authenticated` and `anon`, making NestJS (connected via service-role) the only write path. RLS SELECT policies remain as defense-in-depth for reads.

## Considered Options

- **Full RLS for reads and writes** with the `authenticated` role having INSERT/UPDATE/DELETE grants and per-request `SET LOCAL request.jwt.claims`. Rejected because RLS policies cannot enforce state-machine transitions, required fields on specific transitions, or atomic multi-table writes (case + event). A malicious client could bypass all business logic while still passing RLS checks.
- **Application-level authorization only** (service-role for everything, no RLS). Rejected because it removes the database-level safety net for reads. A bug in a NestJS query's `WHERE` clause would leak data across workspaces with no backstop.

## Consequences

- The `authenticated` role's RLS SELECT policies are the last line of defense for read isolation — they work even if NestJS has a filtering bug.
- NestJS must enforce all write authorization (role checks, state transitions, claim atomicity) in application code.
- The auth hook function must be restricted to `supabase_auth_admin` to prevent authenticated users from invoking it directly.
- The `anon` role must have explicit `REVOKE ALL` on application tables.
