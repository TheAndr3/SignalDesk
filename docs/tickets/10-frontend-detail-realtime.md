# 10 — Frontend: case detail panel, actions, and real-time updates

**What to build:** The complete interactive frontend: clicking a case opens a slide-over detail panel with full case info, event timeline, and action buttons (claim, resolve). SSE integration keeps the queue and detail panel fresh without manual refresh. All UI states (loading, empty, validation error, authorization error, network error, claim conflict) are handled.

**Blocked by:** 09 — Frontend: login, auth context, and queue shell, 06 — Claim with race-condition safety, 07 — Resolve with role-based authorization, 08 — SSE real-time event stream

**Status:** ready-for-agent

- [ ] Clicking a case row opens a slide-over detail panel (fetches from `GET /cases/:id`)
- [ ] Detail panel shows full case info: reference, title, description, priority, status, creator name, assignee name, resolution note (if resolved), created_at, updated_at
- [ ] Detail panel shows chronological case event timeline with actor name, event type, and timestamp
- [ ] `?case=<uuid>` query parameter synced to the open panel — survives page reload and is shareable
- [ ] Claim button visible on open (unassigned) cases — calls `POST /cases/:id/claim`
- [ ] On successful claim: panel updates, queue refreshes
- [ ] On claim conflict (409): toast/banner showing "This case was already claimed by another user"
- [ ] Resolve button visible on assigned cases where the user is authorized (own case for agents, any for managers)
- [ ] Resolve form requires a non-empty resolution note — client-side validation before submit
- [ ] On successful resolve: panel updates, queue refreshes
- [ ] On resolve errors: appropriate messages for 400 (invalid state) and 403 (unauthorized)
- [ ] SSE `EventSource` connection to `GET /events/stream` established after login
- [ ] On each SSE event: `queryClient.invalidateQueries()` triggers re-fetch of the current view
- [ ] On SSE reconnect: invalidate all caches and re-fetch
- [ ] Network error state: displayed when API requests fail due to connectivity
- [ ] Authorization error state: displayed when 403 is returned
- [ ] Loading states on all async operations (claim, resolve, panel load)
