# 04 — Case creation with atomic reference counter

**What to build:** An authenticated user can create a case in their workspace. The case receives a unique, gapless, workspace-scoped human reference (e.g. `CASE-0042`) via an atomic counter increment on the workspace row. A `created` case event is written in the same transaction. After commit, a `case_created` event is emitted via `EventEmitter2` for downstream consumers (SSE).

**Blocked by:** 03 — Auth module and /me endpoint

**Status:** ready-for-agent

- [x] `CasesRepository` established with `workspaceId` as a required first parameter on every method — TypeScript won't compile without it
- [x] `POST /cases` endpoint accepts `{ title, description?, priority }` via a `class-validator` DTO
- [x] Unknown/server-controlled fields (`workspace_id`, `assignee_id`, `status`, etc.) are stripped by the `ValidationPipe`
- [x] `title` is required and non-empty; `priority` is required and must be a valid `CasePriority` enum value; `description` is optional
- [x] Inside a single transaction: atomic `UPDATE workspaces SET case_counter = case_counter + 1 WHERE id = $1 RETURNING case_counter`, then `INSERT INTO cases` with the returned counter as `reference`, then `INSERT INTO case_events` with `event_type = 'created'`
- [x] Case `reference` stored as raw integer in Postgres; formatted as `CASE-NNNN` (zero-padded) at the API/DTO response boundary
- [x] `creator_id` derived from the JWT `sub` claim, never from the request body
- [x] `workspace_id` derived from the JWT `workspace_id` claim, never from the request body
- [x] `status` set to `open`, `assignee_id` set to `null`
- [x] Response returns the created case with formatted reference, creator display name, and timestamps
- [x] After transaction commit, `EventEmitter2` emits a `case_created` event with `{ caseId, workspaceId }`
- [x] Invalid input returns `400 Bad Request` with the standard error shape
