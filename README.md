# SignalDesk

SignalDesk is an internal, multi-tenant Case queue. Workspace members create,
Claim, and resolve Cases while preserving strict Workspace isolation and an
immutable Case Event history.

## Prerequisites

- Node.js 20 or newer and npm
- Docker Desktop
- Supabase CLI, installed through the repository dependencies

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env`.
3. Start the local Supabase stack with `npx supabase start` and copy its anon
   key and service-role key into the matching `.env` entries.
4. Start the API with `npm run dev:api`.
5. Start the web application with `npm run dev:web`.
6. Open `http://127.0.0.1:5173`.

The local seed password is `Password123!`. The demo selector contains Alice,
Bob, and Carol from Acme Corp, plus David, Eva, and Frank from Stark
Industries. A known Stark Industries Case is
`b0000000-0000-0000-0000-000000000099`; while signed in to Acme Corp, use it
to demonstrate that cross-Workspace reads and mutations are invisible.

> `npx supabase db reset` is destructive to the local database. Run it only
> when intentionally rebuilding local data from migrations and `supabase/seed.sql`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev:api` | Start NestJS on port 3000. |
| `npm run dev:web` | Start Vite on port 5173. |
| `npm run typecheck` | Type-check shared, API, and web workspaces. |
| `npm test` | Run fast unit tests. |
| `npm run test:integration` | Run serial real Supabase integration tests. Supabase and the API must already be running. |

The integration suite fails fast if Auth, PostgreSQL, or the API is unavailable.
It does not start Docker or NestJS itself.

## Architecture and trust boundary

The React application authenticates through Supabase Auth and sends its access
token only to NestJS. NestJS is the application trust boundary: it derives the
actor, Workspace, and `workspace_role` from signed JWT claims and is the sole
path for all Case mutations. A case outside that Workspace is treated as absent
(`404`); `409 CLAIM_CONFLICT` is reserved for a visible case that another user
claimed first.

The Supabase JWT hook adds `workspace_id`, `workspace_role`, and
`display_name`. It intentionally preserves the reserved Supabase
`role = authenticated` claim. NestJS validates modern ES256 Supabase tokens
against the local JWKS endpoint and retains HS256 support for focused unit-test
tokens.

PostgreSQL grants the `authenticated` role SELECT-only access. RLS filters
Workspace-scoped reads using `workspace_id`; writes use the server-side
PostgreSQL connection through NestJS, which enforces the Case state machine,
role rules, validation, and multi-statement transactions. Each create, Claim,
or resolve operation writes its Case Event in the same transaction and emits
its SSE notification only after commit. The authenticated SSE stream is scoped
to the Workspace derived from the connection's JWT.

## Data model

- **Workspace** is the tenant boundary and owns a Reference counter.
- **Workspace member** assigns an Agent or Manager role and display name to an
  Auth account.
- **Case** moves only from `open` to `assigned` to `resolved`.
- **Case Event** is an append-only record of Case creation, Claim, and
  resolution.

References are incremented atomically per Workspace. Create, Claim, and resolve
updates write their Case Events in the same transaction.

## Verification

The real integration suite covers:

- concurrent Claim race safety and a single persisted Claim event;
- resolution rollback when the real Case Event insert fails;
- API-level Workspace isolation;
- concurrent Reference creation;
- rejection of an authenticated account without a Workspace membership;
- Agent and Manager resolution rules, validation, and state transitions;
- authenticated HTTP SSE mutation events;
- direct PostgreSQL write denial and RLS read isolation using claims from a real
  Auth-issued token.

Integration fixtures use a dedicated Integration Test Workspace that is not
shown in the demo selector. Each test removes its Cases; its isolated Reference
counter remains monotonic. The atomicity test installs and removes a
fixture-specific PostgreSQL trigger to force the event-insert failure after the
Case update is attempted.

## Assumptions and unanswered questions

- Each Auth account belongs to exactly one Workspace. Any Workspace member may
  Claim an open Case; Agents resolve only their own Cases and Managers may
  resolve any assigned Case in their Workspace.
- Cases are not edited, reassigned, reopened, or deleted; resolved is terminal.
- The in-process SSE emitter is intentionally single-instance. Redis pub/sub or
  PostgreSQL notifications would be required for multi-instance production.
- Browser E2E and visual UI-state tests are manual verification work; the
  highest-risk server behavior is covered by the real integration seams.
- Integration tests require a developer-controlled local Supabase stack and API
  process. CI container orchestration is intentionally not included.

No stakeholder answers were available during the timebox. Before production,
confirm the reassignment/reopening policy, Case Event retention and audit-access
requirements, and how a membership or role change should revoke or refresh an
already-issued JWT.

## Final status

The vertical slice supports authentication, Workspace-scoped queue operations,
Claim race safety, resolution authorization, Case Event history, and SSE
freshness. The highest remaining production risk is the single-instance SSE
delivery model; the next production step would be a durable cross-instance
event transport and CI-managed integration infrastructure.
