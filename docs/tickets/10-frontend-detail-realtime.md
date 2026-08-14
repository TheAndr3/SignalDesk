# 10 — Frontend: case detail panel, actions, and real-time updates

**What to build:** The complete interactive frontend: clicking a case opens a slide-over detail panel with full case info, event timeline, and action buttons (claim, resolve). SSE integration keeps the queue and detail panel fresh without manual refresh. All UI states (loading, empty, validation error, authorization error, network error, claim conflict) are handled.

**Blocked by:** 09 — Frontend: login, auth context, and queue shell, 06 — Claim with race-condition safety, 07 — Resolve with role-based authorization, 08 — SSE real-time event stream

**Status:** ready-for-agent

- [x] Clicking a case row opens a slide-over detail panel (fetches from `GET /cases/:id`)
- [x] Detail panel shows full case info: reference, title, description, priority, status, creator name, assignee name, resolution note (if resolved), created_at, updated_at
- [x] Detail panel shows chronological case event timeline with actor name, event type, and timestamp
- [x] `?case=<uuid>` query parameter synced to the open panel — survives page reload and is shareable
- [x] Claim button visible on open (unassigned) cases — calls `POST /cases/:id/claim`
- [x] On successful claim: panel updates, queue refreshes
- [x] On claim conflict (409): toast/banner showing "This case was already claimed by another user"
- [x] Resolve button visible on assigned cases where the user is authorized (own case for agents, any for managers)
- [x] Resolve form requires a non-empty resolution note — client-side validation before submit
- [x] On successful resolve: panel updates, queue refreshes
- [x] On resolve errors: appropriate messages for 400 (invalid state) and 403 (unauthorized)
- [x] SSE `EventSource` connection to `GET /events/stream` established after login
- [x] On each SSE event: `queryClient.invalidateQueries()` triggers re-fetch of the current view
- [x] On SSE reconnect: invalidate all caches and re-fetch
- [x] Network error state: displayed when API requests fail due to connectivity
- [x] Authorization error state: displayed when 403 is returned
- [x] Loading states on all async operations (claim, resolve, panel load)
