# SignalDesk — Technical Specification

## Problem Statement

Support agents handling customer cases need a reliable internal queue that enforces strict tenant isolation, handles concurrent actions correctly, and keeps every user's view fresh — all within a multi-tenant SaaS product where a single data leak or race condition is a critical failure.

## Solution

A thin but working vertical slice of SignalDesk: an internal case queue where authenticated users within isolated workspaces can create, claim, and resolve customer cases. The system guarantees that concurrent claims produce exactly one winner, that case state and history never disagree, and that no user can read or mutate data outside their workspace — even by manipulating requests or bypassing the API layer.

## User Stories

1. As an **agent**, I want to log in with my email and password, so that I can access my workspace's case queue.
2. As an **agent**, I want to see a queue of all cases in my workspace with reference, title, priority, status, assignee, and creation time, so that I can decide what to work on next.
3. As an **agent**, I want to filter the queue by status (open, assigned, resolved), so that I can focus on actionable cases.
4. As an **agent**, I want to toggle between "Mine" and "All" views, so that I can see only my assigned cases or the full workspace queue.
5. As an **agent**, I want to filter the queue by priority (low, medium, high, urgent), so that I can triage effectively.
6. As an **agent**, I want the queue to be paginated server-side with cursor-based navigation, so that performance remains stable as the case count grows.
7. As an **agent**, I want cases sorted by priority (urgent first) and then by age (oldest first within the same priority), so that the most critical and oldest work surfaces at the top.
8. As an **agent**, I want to create a new case with a title, optional description, and priority, so that incoming customer issues are captured in the queue.
9. As an **agent**, I want each case to receive a human-readable reference (e.g. CASE-0042) unique within my workspace, so that I can refer to cases in conversation without using UUIDs.
10. As an **agent**, I want to claim an unassigned case, so that I take ownership of it and others know it's being worked.
11. As an **agent**, I want that if another agent claims the same case at nearly the same moment, exactly one of us succeeds and the other receives a clear conflict message — not a generic server error, so that the queue stays correct and I understand what happened.
12. As an **agent**, I want to resolve a case I have claimed by providing a non-empty resolution note, so that the case is marked complete with context.
13. As an **agent**, I want to click a case in the queue to open a detail panel (slide-over) showing the full case information and history timeline, so that I can review the case without losing sight of the queue.
14. As an **agent**, I want the open case to be synced in the URL query parameter (`?case=<uuid>`), so that the detail panel survives a page reload and I can share the URL with a colleague.
15. As an **agent**, I want to see a timeline of case events (created, claimed, resolved) with actor name and timestamp, so that I have a full audit trail.
16. As an **agent**, I want to see other users' changes (new cases, claims, resolutions) without manually refreshing the page, so that my view of the queue stays current.
17. As an **agent**, I want clear visual feedback for loading, empty, validation error, authorization error, network error, and claim conflict states, so that I always understand what the system is doing.
18. As a **manager**, I want to see all cases in my workspace (same as an agent), so that I have full visibility into the queue.
19. As a **manager**, I want to resolve any assigned case in my workspace — not just cases assigned to me — so that I can unblock the queue when an agent is unavailable.
20. As a **user in Workspace A**, I want to be unable to retrieve or mutate a Workspace B case by changing a request payload, query string, or URL, so that tenant isolation is absolute.
21. As a **user without a workspace membership**, I want to be rejected with a clear 403 error before any database access occurs, so that the system fails safely for unconfigured accounts.
22. As a **reviewer**, I want to start the project from the README, log in as any seeded user via a convenience user switcher, and immediately test tenant isolation by pasting a Workspace B case UUID while logged into Workspace A, so that the demo is fast and convincing.

## Implementation Decisions

### Project Structure

- npm workspaces monorepo: `api/` (NestJS), `web/` (React + Vite), `packages/shared/` (domain types), `supabase/` (migrations, config, seed).
- `packages/shared` is the single source of truth for domain enums (`CaseStatus`, `CasePriority`, `WorkspaceMemberRole`) and error codes. Both `api` and `web` import from it, eliminating type drift when enums evolve in migrations.

### Data Model

- **`workspaces`**: `id` (UUID PK), `name`, `case_counter` (bigint, default 0). The counter is incremented atomically during case creation to generate workspace-scoped references.
- **`workspace_members`**: `user_id` (FK to `auth.users`), `workspace_id` (FK to `workspaces`), `role` (enum: `agent | manager`), `display_name`. Composite PK on `(user_id, workspace_id)`. Each user belongs to exactly one workspace.
- **`cases`**: `id` (UUID PK), `reference` (integer, workspace-scoped), `title`, `description` (nullable), `priority` (enum: `low | medium | high | urgent`), `status` (enum: `open | assigned | resolved`), `workspace_id` (FK), `creator_id` (FK to `auth.users`), `assignee_id` (FK, nullable), `resolution_note` (nullable text), `created_at`, `updated_at`. Unique constraint on `(workspace_id, reference)`.
- **`case_events`**: `id` (UUID PK), `case_id` (FK), `workspace_id` (denormalized FK — see below), `event_type` (text: `created | claimed | resolved`), `actor_id` (FK to `auth.users`), `payload` (JSONB), `created_at`. Append-only.

`workspace_id` is denormalized onto `case_events` so that RLS SELECT policies can filter directly without a sub-select join on every row. This is a deliberate tradeoff: one redundant column avoids per-row sub-queries on the history timeline.

### Postgres ENUM Declaration Order

Postgres enums sort by declaration order, not alphabetically. The migration DDL must declare:

```sql
CREATE TYPE case_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE case_status AS ENUM ('open', 'assigned', 'resolved');
```

This ensures `ORDER BY priority DESC` yields `urgent` first and `low` last. Incorrect declaration order silently breaks sorting and cursor pagination.

### State Machine

Three states, two transitions:

```
open ──(claim)──▸ assigned ──(resolve)──▸ resolved
```

- **Claim**: any workspace member, `open → assigned`. Sets `assignee_id` to the claiming user.
- **Resolve**: agents resolve only cases assigned to them; managers resolve any assigned case in the workspace. Sets `status = 'resolved'`, requires a non-empty `resolution_note`.
- `resolved` is terminal. No re-opening, unclaiming, or reassignment.

The resolve transition uses an atomic conditional UPDATE that encodes both the state-machine guard and the role-based authorization in a single query:

```sql
UPDATE cases
SET status = 'resolved', resolution_note = $1, updated_at = now()
WHERE id = $2 AND workspace_id = $3 AND status = 'assigned'
  AND ($4::text = 'manager' OR assignee_id = $5)
RETURNING *;
```

If 0 rows returned, the endpoint returns `400 Bad Request` (invalid state transition — case is not `assigned`) or `403 Forbidden` (agent attempting to resolve another agent's case). The service layer disambiguates by first fetching the case to determine which condition failed.

### Claim Race (Atomic Conditional UPDATE)

```sql
UPDATE cases
SET assignee_id = $1, status = 'assigned', updated_at = now()
WHERE id = $2 AND workspace_id = $3 AND status = 'open' AND assignee_id IS NULL
RETURNING *;
```

If 0 rows returned, return HTTP 409 with error code `CLAIM_CONFLICT`. The UPDATE + case event INSERT are wrapped in a single transaction for atomicity.

### Reference Counter (Atomic Increment)

```sql
UPDATE workspaces
SET case_counter = case_counter + 1
WHERE id = $1
RETURNING case_counter;
```

Executed inside the create-case transaction. The returned counter becomes the case's `reference` column, stored as a raw `integer` in Postgres. Human-readable formatting (e.g. `CASE-0042` — the `CASE-` prefix + 4-digit zero padding) is applied at the API/DTO edge boundary, not stored in the database.

The row-level lock on the workspace row serializes concurrent case creations within the same workspace. This is an intentional trade-off: serialization guarantees strictly gapless, collision-free human references without requiring separate Postgres sequences per workspace. The serialization window is narrow (one transaction's duration), making contention negligible for typical queue workloads.

### Security Architecture

Per [ADR-0001](docs/adr/0001-authenticated-role-select-only.md):

- **`authenticated` role**: `SELECT` only on `cases`, `case_events`, `workspace_members`, with RLS policies enforcing `workspace_id = auth.jwt() ->> 'workspace_id'`.
- **`anon` role**: explicit `REVOKE ALL` on all application tables.
- **NestJS**: connects with the `service_role` key (bypasses RLS). All writes go through NestJS, which enforces state-machine transitions, role authorization, and required fields in application code.
- **Auth Hook**: a Postgres function invoked by Supabase Auth during token generation. Looks up the user's `workspace_id` from `workspace_members` and stamps it into the JWT as a custom claim. Permissions: `GRANT EXECUTE TO supabase_auth_admin`, `REVOKE FROM PUBLIC, authenticated, anon`.
- **Service-role key**: stored in `.env` (server-side), listed in `.gitignore`, never committed. `.env.example` committed with placeholders. Frontend uses only the public `anon` key.

### NestJS Architecture

Four modules:

- **AuthModule**: `passport-jwt` strategy validating against `SUPABASE_JWT_SECRET`. Global `AuthGuard` extracts `sub`, `workspace_id`, and `role` from JWT claims. Rejects requests with missing `workspace_id` as 403.
- **CasesModule**: `CasesService` + `CasesRepository` + `CasesController`. The repository enforces `workspaceId` as a required first parameter on every method — TypeScript won't compile without it.
- **EventsModule**: in-process `EventEmitter` + SSE controller endpoint. Fires typed events (`case_created`, `case_claimed`, `case_resolved`) with case ID after successful mutations. Per [ADR-0002](docs/adr/0002-sse-over-supabase-realtime.md).
- **DatabaseModule**: Kysely instance configured with the service-role connection string. Provides the query builder to repositories.

### Input Validation

Input DTOs are validated using NestJS's idiomatic `class-validator` and `class-transformer` via a global `ValidationPipe` configured with `whitelist: true` and `forbidNonWhitelisted: true`. This strips unknown properties and rejects payloads containing fields not declared in the DTO — preventing clients from injecting `workspace_id`, `assignee_id`, `status`, or other server-controlled fields.

### Query Layer

Kysely (type-safe SQL query builder). No ORM. Chosen because:
- Type safety catches column/type errors at compile time.
- Queries map 1:1 to SQL — fully explainable in review.
- Explicit transaction control compatible with service-role connection.

### API Error Shape

```json
{
  "error": {
    "code": "CLAIM_CONFLICT",
    "message": "Case is already assigned to another user",
    "statusCode": 409
  }
}
```

Machine-readable `code` field enables the frontend to switch on error types without parsing message strings.

### Case Detail Endpoint

`GET /cases/:id` returns the full case details for a single case, embedded with its chronological `case_events` timeline. The endpoint enforces workspace scoping — a case ID belonging to a different workspace returns 404. This endpoint is essential for deep-linking (`?case=<uuid>` survival on page reload), slide-over detail panel hydration, and tenant isolation verification (Test 3).

### Cursor-Based Pagination

Keyset pagination using composite cursor `(priority, created_at, id)`. Sort order: `priority DESC, created_at ASC, id ASC`.

Because sort directions are mixed, the cursor condition cannot use a simple tuple comparison. The `WHERE` clause expands to:

```sql
WHERE (priority < $cursor_priority)
   OR (priority = $cursor_priority AND created_at > $cursor_created_at)
   OR (priority = $cursor_priority AND created_at = $cursor_created_at AND id > $cursor_id)
```

Cursors are base64-encoded and opaque to the client. Filters (status, mine/all, priority) are orthogonal `WHERE` clauses applied before the cursor condition.

The "Mine" filter strictly maps to `WHERE assignee_id = current_user_id`. It shows cases assigned to the current user, regardless of who created them. The "All" filter shows all workspace cases with no assignee restriction.

### Real-Time Freshness (SSE)

Per [ADR-0002](docs/adr/0002-sse-over-supabase-realtime.md):

- NestJS fires typed events via an in-process `EventEmitter` after each successful mutation.
- An SSE endpoint streams events to connected clients. Events carry `{ type, caseId }` — enough for toast notifications.
- The client calls `queryClient.invalidateQueries()` on each event, triggering a re-fetch through the API. No client-side state patching.
- On SSE reconnect (automatic via `EventSource`), the client invalidates all caches and re-fetches.
- Single-instance limitation. Production path: replace in-process emitter with Redis pub/sub.

### Frontend Architecture

- **TanStack Query** for data fetching, caching, and SSE-triggered invalidation.
- **`/me` endpoint** called once after login, cached for the session. Returns user ID, display name, role, and workspace info.
- **Queue view** with slide-over detail panel. Case ID synced to `?case=<uuid>` query parameter for URL sharing and reload survival.
- **Login form** with convenience user switcher: a dropdown listing seeded users with pre-filled credentials for fast demo/testing.
- **Filters**: status dropdown, Mine/All toggle, priority dropdown.

### Supabase Local Dev

`supabase init` + `supabase start`. Migrations in `supabase/migrations/`. Auth Hook configured in `supabase/config.toml`. Reviewer runs `supabase start`, copies service-role key to `.env`, and has a working backend.

### Seed Data

- 2 workspaces with distinct names.
- 3 users per workspace: 2 agents + 1 manager. Pre-seeded passwords documented in README.
- 20+ cases per workspace in mixed states (open, assigned, resolved).
- At least one resolved case per workspace with a fully populated history timeline (created → claimed → resolved events).
- README includes the UUID of a specific Workspace B case, so the reviewer can paste it while logged into Workspace A to test tenant isolation.

## Testing Decisions

### Philosophy

Tests prove that **invariants hold under adversarial conditions** — concurrent races, cross-tenant access, mid-transaction failures. We test external behavior through the highest seam possible. Implementation details (internal method calls, private state) are not tested.

### Seam 1: NestJS HTTP API (Integration Tests)

Integration tests run against a real Supabase Postgres (via `supabase start`). Each test uses real JWTs for seeded users.

**Test 1 — Claim Race**: Two concurrent `POST /cases/:id/claim` requests (via `Promise.all()`) for the same unassigned case. Assert: exactly one 200, exactly one 409 with error code `CLAIM_CONFLICT`, exactly one `claimed` event in `case_events`, and `assignee_id` set to the winner.

**Test 2 — Resolve Atomicity (Acceptance Scenario 3)**: Force a mid-transaction failure after the `cases` UPDATE has executed but before/during the `case_events` INSERT (via a repository/service spy or a DB-level constraint violation on the event payload). Assert: the entire transaction rolls back — `cases` row is unchanged, zero new rows in `case_events`. No partial state.

**Test 3 — Tenant Isolation (API Level)**: Authenticate as a Workspace A user. Attempt to read, claim, and resolve a Workspace B case by its UUID. Assert: each request returns 403 or 404 (the case must be invisible, not just unmodifiable).

**Test 4 — Concurrent Reference Creation**: Two parallel `POST /cases` requests in the same workspace via `Promise.all()`. Assert: both succeed, both cases have distinct sequential references (e.g. `CASE-0001` and `CASE-0002`), no collisions or duplicates.

**Test 5 — No-Workspace User Rejection**: Authenticate with a valid Supabase JWT for a user who has no row in `workspace_members` (JWT has no `workspace_id` claim). Assert: the request is rejected with 403 before any database context is accessed.

**Test 6 — Resolve Authorization and Validation**: Covers the four core resolution business rules:
- An agent attempting to resolve a case assigned to another agent returns `403 Forbidden`.
- A manager resolving a case assigned to any agent in the same workspace succeeds with `200 OK`.
- Any resolution attempt with a missing or empty `resolution_note` returns `400 Bad Request`.
- Attempting to resolve an `open` (unassigned) case or an already `resolved` case returns `400 Bad Request`.

**Test 9 — SSE Event Emission**: After a successful case creation, claim, or resolve, verify that the corresponding typed event (`case_created`, `case_claimed`, `case_resolved`) is emitted on the SSE stream for the workspace. Connect an SSE client to `GET /events/stream`, perform a mutation, and assert the event arrives with the correct type and case ID.

### Seam 2: Direct Postgres with RLS

These tests bypass NestJS entirely. They connect to Postgres using the `authenticated` role with a crafted JWT, proving the database-level defenses work independently.

**Test 7 — Write Denial**: Using an `authenticated`-role connection with a valid Workspace A JWT, attempt `INSERT`, `UPDATE`, and `DELETE` on `cases` and `case_events`. Assert: all operations are denied (permission error, not RLS filtering — the grants are revoked entirely).

**Test 8 — Read Isolation**: Using an `authenticated`-role connection with a Workspace A JWT, `SELECT` from `cases` filtering by a known Workspace B case ID. Assert: 0 rows returned. The case exists but RLS makes it invisible.

### What Is NOT Tested Automatically

- **Frontend UI states** (loading, empty, validation, authorization, network error, claim conflict): verified via structured manual testing. Documented in `README.md` and `AI_NOTES.md`.
- **E2E browser tests** (Playwright/Cypress): out of scope. The highest-risk behaviors are all server-side and fully covered by the integration tests above.

## Out of Scope

- **Case deletion**: cases are never deleted. `resolved` is terminal.
- **Case editing** after creation (updating title, description, or priority).
- **Re-opening** resolved cases.
- **Unclaiming / unassigning** cases (no `assigned → open` transition).
- **Reassignment** (no `assigned → assigned` with a different assignee).
- **Multi-instance SSE**: the in-process EventEmitter is single-instance. Redis pub/sub is the documented production path.
- **Multi-workspace users**: each user belongs to exactly one workspace.
- **E2E browser tests**: UI states verified manually.
- **Deployment**: local execution only.

## Further Notes

- The domain glossary is maintained in `CONTEXT.md` at the repo root. All code, comments, UI copy, and API naming must use the canonical terms defined there.
- Architectural decisions are recorded in `docs/adr/`. Two ADRs exist: [0001 — authenticated role SELECT only](docs/adr/0001-authenticated-role-select-only.md) and [0002 — SSE over Supabase Realtime](docs/adr/0002-sse-over-supabase-realtime.md).
- The `description` field on cases is optional. `title` and `priority` are required on creation.
- The `/me` endpoint returns the user's display name, role, and workspace info. The JWT stays lean (IDs and role only); display data comes from the API.
- The login page includes a user-switcher dropdown that pre-fills credentials for seeded users. It still submits through Supabase Auth — no token shortcuts.
- **Production index recommendation**: document in `README.md` that a composite index on `(workspace_id, priority, created_at, id)` should be added for production workloads. The index supports the cursor-based pagination query and the workspace-scoped sort order. For the seed-data scale of this challenge, Postgres sequential scans are fast enough without it.
