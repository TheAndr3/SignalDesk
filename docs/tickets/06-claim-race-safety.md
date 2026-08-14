# 06 — Claim with race-condition safety

**What to build:** An authenticated user can claim an unassigned case in their workspace. If two agents claim the same case at nearly the same moment, exactly one succeeds and the other receives a clear conflict response — never a generic 500. After commit, a `case_claimed` event is emitted via `EventEmitter2`.

**Blocked by:** 04 — Case creation with atomic reference counter

**Status:** ready-for-agent

- [x] `POST /cases/:id/claim` endpoint (no request body needed — claimant is the JWT `sub`)
- [x] Atomic conditional UPDATE: `UPDATE cases SET assignee_id = $1, status = 'assigned', updated_at = now() WHERE id = $2 AND workspace_id = $3 AND status = 'open' AND assignee_id IS NULL RETURNING *`
- [x] If 0 rows returned: return `409 Conflict` with error code `CLAIM_CONFLICT` and a human-readable message
- [x] If case doesn't exist in the caller's workspace: return `404 Not Found`
- [x] On success: `INSERT INTO case_events` with `event_type = 'claimed'` and `actor_id = claimant` — within the same transaction as the UPDATE
- [x] After transaction commit, `EventEmitter2` emits a `case_claimed` event with `{ caseId, workspaceId }`
- [x] Response returns the updated case with assignee info
- [x] Claiming an already-assigned case (whether by self or another) returns `409 Conflict`
- [x] Claiming a resolved case returns `409 Conflict` or `400 Bad Request`
