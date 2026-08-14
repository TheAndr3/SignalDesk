# 05 — Queue listing with cursor pagination, filters, and case detail endpoint

**What to build:** Two read endpoints: a paginated queue listing (`GET /cases`) with filters and sort, and a single-case detail endpoint (`GET /cases/:id`) that returns the full case with its chronological event timeline. Both enforce workspace scoping.

**Blocked by:** 04 — Case creation with atomic reference counter

**Status:** ready-for-agent

- [ ] `GET /cases` returns cases scoped to the caller's workspace (`WHERE workspace_id = $jwt_workspace_id`)
- [ ] Sort order: `priority DESC, created_at ASC, id ASC` (relies on correct ENUM declaration order)
- [ ] Cursor-based (keyset) pagination using composite cursor `(priority, created_at, id)`
- [ ] Mixed-direction cursor comparison: expanded `WHERE` clause handling `priority DESC` vs `created_at ASC` correctly
- [ ] Cursor is base64-encoded and opaque to the client
- [ ] Response includes `data`, `nextCursor` (null if no more), and `hasMore` boolean
- [ ] Query parameter `status` filters by case status (open, assigned, resolved, or omitted for all)
- [ ] Query parameter `priority` filters by case priority
- [ ] Query parameter `mine=true` adds `WHERE assignee_id = current_user_id` (not `creator_id`)
- [ ] Filters are orthogonal `WHERE` clauses applied before the cursor condition
- [ ] Each case in the list includes formatted reference (`CASE-NNNN`), title, priority, status, assignee display name (joined from `workspace_members`), and `created_at`
- [ ] `GET /cases/:id` returns full case details for a single case in the caller's workspace
- [ ] Response includes the case's chronological `case_events` timeline with actor display names and timestamps
- [ ] A case ID belonging to a different workspace returns `404 Not Found` (invisible, not just forbidden)
- [ ] A non-existent case ID returns `404 Not Found`
