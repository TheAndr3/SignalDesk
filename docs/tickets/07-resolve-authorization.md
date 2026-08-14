# 07 — Resolve with role-based authorization

**What to build:** An authenticated user can resolve an assigned case in their workspace, subject to role-based authorization: agents can only resolve cases assigned to themselves; managers can resolve any assigned case. A non-empty resolution note is required. After commit, a `case_resolved` event is emitted via `EventEmitter2`.

**Blocked by:** 06 — Claim with race-condition safety

**Status:** ready-for-agent

- [x] `POST /cases/:id/resolve` endpoint accepts `{ resolutionNote }` via a `class-validator` DTO
- [x] `resolutionNote` is required, non-empty, and validated at the DTO level — empty/missing returns `400 Bad Request`
- [x] Atomic conditional UPDATE encoding both state guard and role authorization: `UPDATE cases SET status = 'resolved', resolution_note = $1, updated_at = now() WHERE id = $2 AND workspace_id = $3 AND status = 'assigned' AND ($4::text = 'manager' OR assignee_id = $5) RETURNING *`
- [x] If 0 rows returned, the service disambiguates by fetching the case to determine the failure reason:
  - Case not found in workspace → `404 Not Found`
  - Case status is not `assigned` (open or already resolved) → `400 Bad Request` with appropriate error code
  - Agent attempting to resolve another agent's case → `403 Forbidden`
- [x] On success: `INSERT INTO case_events` with `event_type = 'resolved'` and `resolution_note` in the JSONB payload — within the same transaction as the UPDATE
- [x] After transaction commit, `EventEmitter2` emits a `case_resolved` event with `{ caseId, workspaceId }`
- [x] Response returns the updated case with resolution note and resolver info
