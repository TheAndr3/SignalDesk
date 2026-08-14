# SSE from NestJS in-process emitter, not Supabase Realtime

Supabase Realtime could push Postgres changes to clients over WebSocket with zero backend code. We rejected it because it creates a second data path outside the NestJS trust boundary — the browser would receive change notifications directly from Postgres, bypassing authorization logic.

Instead, NestJS fires events through an in-process EventEmitter after each successful mutation and pushes them to clients over Server-Sent Events. This keeps reads and writes in a single boundary.

## Considered Options

- **Supabase Realtime as notification signal + NestJS refetch**. The browser subscribes to Realtime for change notifications but re-fetches data through NestJS. Rejected because it still requires a Supabase client connection from the browser to the database layer, introducing a second data path to configure, secure, and reason about.
- **Short polling** (frontend re-fetches every N seconds). Rejected because it adds unnecessary latency and load. SSE is no more complex to implement and gives instant updates.
- **Supabase Realtime for full reads**. The browser reads case data directly from Supabase via Realtime subscriptions. Rejected because it moves reads outside the NestJS trust boundary entirely.

## Consequences

- An in-process EventEmitter does not cross NestJS instances. For production multi-instance deployments, Redis pub/sub (or `pg_notify`) would replace the in-process emitter. This is a known single-instance limitation.
- On SSE reconnect, the client invalidates its TanStack Query cache and re-fetches. No server-side event replay (`Last-Event-ID`) is implemented.
- The SSE stream carries typed events with case IDs (enabling toast notifications), but the client always re-fetches through the API rather than patching local state.
