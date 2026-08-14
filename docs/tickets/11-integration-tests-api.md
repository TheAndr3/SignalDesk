# 11 — Integration tests: API seam

**What to build:** Integration tests running against a real Supabase Postgres that prove the system's critical invariants hold under adversarial conditions: concurrent races, cross-tenant access, mid-transaction failures, role-based authorization, and SSE event emission.

**Blocked by:** 07 — Resolve with role-based authorization, 08 — SSE real-time event stream

**Status:** ready-for-agent

- [x] Test harness: tests run against a real Supabase Postgres (via `supabase start`), using real JWTs for seeded users
- [x] **Test 1 — Claim Race**: Two concurrent `POST /cases/:id/claim` requests via `Promise.all()` for the same unassigned case. Assert: exactly one 200, exactly one 409 with `CLAIM_CONFLICT` code, exactly one `claimed` event in `case_events`, `assignee_id` set to the winner
- [x] **Test 2 — Resolve Atomicity (Acceptance Scenario 3)**: Force a mid-transaction failure after the `cases` UPDATE but before/during the `case_events` INSERT (via repository spy or DB constraint violation). Assert: entire transaction rolls back — `cases` row unchanged, zero new rows in `case_events`, no partial state
- [x] **Test 3 — Tenant Isolation (API Level)**: Authenticate as Workspace A user. Attempt `GET /cases/:id`, `POST /cases/:id/claim`, and `POST /cases/:id/resolve` on a Workspace B case UUID. Assert: each returns 403 or 404 (invisible, not just unmodifiable)
- [x] **Test 4 — Concurrent Reference Creation**: Two parallel `POST /cases` requests in the same workspace via `Promise.all()`. Assert: both succeed, both have distinct sequential references (e.g. `CASE-0001` and `CASE-0002`), no collisions or duplicates
- [x] **Test 5 — No-Workspace User Rejection**: Valid Supabase JWT for a user with no `workspace_members` row (JWT missing `workspace_id` claim). Assert: request rejected with 403 before any database context is accessed
- [x] **Test 6 — Resolve Authorization and Validation**: Four sub-assertions:
  - Agent resolving another agent's case → `403 Forbidden`
  - Manager resolving any assigned case in workspace → `200 OK`
  - Missing or empty `resolution_note` → `400 Bad Request`
  - Resolving an `open` or already `resolved` case → `400 Bad Request`
- [x] **Test 9 — SSE Event Emission**: Connect SSE client to `GET /events/stream`, perform a case creation (or claim or resolve), assert the corresponding typed event (`case_created`, `case_claimed`, `case_resolved`) arrives with the correct `caseId`
