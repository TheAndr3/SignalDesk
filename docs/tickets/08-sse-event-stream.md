# 08 — SSE real-time event stream

**What to build:** An SSE controller endpoint (`GET /events/stream`) that subscribes to existing `EventEmitter2` events (already emitted by tickets #04, #06, #07) and pushes typed messages to connected clients scoped by workspace. The SSE stream is a notification channel — it tells the client *what* changed, not *what the new data is*.

**Blocked by:** 04 — Case creation with atomic reference counter

**Status:** ready-for-agent

- [ ] `EventsModule` with an SSE controller
- [ ] `GET /events/stream` endpoint returns `Content-Type: text/event-stream`
- [ ] Endpoint requires authentication (global `AuthGuard` applies) — workspace is derived from JWT claims
- [ ] Controller subscribes to `EventEmitter2` events (`case_created`, `case_claimed`, `case_resolved`) and filters by `workspaceId` matching the connected client's workspace
- [ ] Each SSE message has the shape: `data: { "type": "case_created" | "case_claimed" | "case_resolved", "caseId": "<uuid>" }`
- [ ] Clients in Workspace A never receive events for Workspace B mutations
- [ ] Multiple concurrent SSE connections for the same workspace each receive the event
- [ ] Connection cleanup: when the client disconnects, the event listener is removed (no memory leak)
- [ ] Verified by: opening the SSE stream in a terminal/browser, performing a mutation in another, and observing the event arrive
