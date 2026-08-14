# 13 — Real Supabase integration test specification

**Status:** complete

## Problem Statement

SignalDesk's current API seam has the shape of an integration suite but replaces the persistence boundary with in-memory repository doubles and signs JWTs locally. As a result, successful tests do not prove the behavior a reviewer will exercise: Supabase Auth token issuance, JWT-hook claims, Kysely transactions, PostgreSQL constraints, row-level security, and the HTTP SSE stream.

The direct PostgreSQL seam also treats an unavailable database as a passing test. This can incorrectly report tenant isolation and write denial as verified when no real policy was executed.

These gaps directly weaken the highest-risk guarantees of SignalDesk: Workspace isolation, Claim race safety, atomic Case resolution, and authorization derived from trusted identity.

## Solution

Provide a deterministic, real-environment integration suite. The suite will run against a locally started Supabase stack and a running NestJS API, authenticate with real seeded accounts, invoke public HTTP endpoints, inspect committed PostgreSQL state, and consume the real SSE endpoint.

The suite will use an isolated Integration Test Workspace and explicit cleanup so it does not corrupt the Acme Corp and Stark Industries demo data. It will fail fast when its real dependencies are unavailable rather than silently substituting mocks or passing offline.

## User Stories

1. As a reviewer, I want the Claim race test to send two real concurrent HTTP requests, so that I can trust that exactly one Agent claims a Case in PostgreSQL.
2. As a reviewer, I want the losing claimant to receive the documented conflict response, so that race safety is visible at the API boundary.
3. As a reviewer, I want a real Case Event count checked after a Claim race, so that a duplicate successful Claim cannot be hidden by a mock.
4. As a reviewer, I want a real database failure during resolution, so that I can verify a Case and its resolved Case Event never diverge.
5. As an Agent in a Workspace, I want a real Auth-issued JWT to identify my Workspace, so that the API cannot rely on caller-controlled identity fields.
6. As a Manager, I want my Workspace role to be read from the real JWT custom claim, so that manager resolution authorization matches the runtime behavior.
7. As an authenticated account without Workspace membership, I want the API to reject me before database work, so that unconfigured accounts fail safely.
8. As an Agent in Workspace A, I want Workspace B Cases to remain invisible through every API mutation and read route, so that knowing a Case ID does not bypass tenant isolation.
9. As a reviewer, I want concurrent Case creation to generate consecutive, distinct References in the same Workspace, so that the workspace-scoped counter is proven under real transaction contention.
10. As an Agent, I want a validation failure and invalid state transition to return predictable client errors, so that the public API enforces the Case state machine.
11. As a Manager, I want to resolve an assigned Case owned by another Agent in my Workspace, so that manager override authorization is verified end to end.
12. As a connected Agent, I want a committed Case mutation to arrive through the HTTP SSE stream, so that queue freshness is tested at the same boundary the web client uses.
13. As a reviewer, I want RLS write denial and read isolation executed against a running PostgreSQL database, so that database-level protections are not inferred from application tests.
14. As a developer, I want integration fixtures cleaned up after every test, so that the demo Workspaces remain reliable across repeated local runs.
15. As a developer, I want the integration suite to explain missing prerequisites immediately, so that local failures are actionable rather than false passes.
16. As a reviewer, I want setup, execution, trust-boundary, test, and AI-use documentation in English, so that I can evaluate the submission without reverse-engineering the repository.

## Implementation Decisions

- The highest test seam for application behavior is the public NestJS HTTP API. Tests will not replace the Case repository, service, database module, event emitter, controller, or authentication guard.
- A separate integration command will run the real suite serially. Supabase and the NestJS API are explicit prerequisites and will not be started automatically by the test command.
- The test harness will preflight the Supabase Auth endpoint, PostgreSQL connection, and API endpoint. Missing or unhealthy dependencies are test failures with setup guidance.
- Integration authentication will use the real password grant against local Supabase Auth. The harness will obtain and validate access tokens for seeded accounts rather than signing test tokens locally.
- The seeded JWT hook contract is `role = authenticated` for the Supabase database role and `workspace_role` for SignalDesk authorization. Tests must verify that claim shape before exercising authorization.
- Seed data will include an Integration Test Workspace with two Agents and one Manager. Those accounts will not appear in the web demo user switcher. The test suite will also seed an authenticated account with no Workspace membership for the no-membership rejection scenario.
- The harness may use an administrative PostgreSQL connection only to establish and clean up test fixtures, inspect persisted state, and configure the controlled atomicity-failure trigger. Every behavior under test will still execute through the public API or the authenticated PostgreSQL role, as appropriate.
- Every fixture will be uniquely identifiable, scoped to the Integration Test Workspace, and removed with its Case Events after the test. Its dedicated Reference counter remains monotonic, so cleanup cannot move a shared counter backwards or affect demo Workspaces.
- The Claim race and concurrent Reference scenarios will preserve their required internal `Promise.all()` concurrency. Test files themselves will run serially because they share one local API and database.
- The resolve-atomicity scenario will install a temporary PostgreSQL trigger that rejects only the resolved Case Event for its designated fixture. This produces a failure after the Case update is attempted and before commit; the trigger will be removed even when the assertion fails.
- SSE verification will open an authenticated HTTP SSE connection, perform an API mutation, parse the streamed event, assert its event type and Case ID, and close the connection within a bounded timeout.
- The direct PostgreSQL RLS seam will decode claims from a real Auth-issued token, connect through the test administrative connection, execute `SET ROLE authenticated`, and set those claims for the transaction. It will assert revoked write permissions and cross-Workspace invisibility. It will never pass while PostgreSQL is offline.
- Existing tickets that claim mocked or offline behavior is complete will be corrected to reflect the real implementation and its verification status.
- Submission documentation will be completed in English. AI notes will transparently record planning, grilling, specification, and ticket work with Codex 5.6 Terra and Claude Opus 4.6 Thinking, and implementation work with Gemini 5.7 High, as supplied by the project owner.

## Testing Decisions

- A good integration test asserts externally observable behavior and committed database outcomes. It must not assert a mocked internal call, repository implementation detail, or manually emitted event.
- The NestJS HTTP seam will cover the Claim race, resolve atomicity, tenant isolation, concurrent Reference creation, no-membership rejection, resolve authorization and validation, and HTTP SSE event emission.
- The direct PostgreSQL seam will cover write-grant denial and RLS read isolation independently of NestJS.
- The existing API integration and RLS test suites are prior art for the scenario names and expected errors, but their in-memory repository doubles, locally signed JWTs, direct EventEmitter observation, and offline-success fallback are explicitly not acceptable evidence for this specification.
- The test suite will assert exact HTTP status and documented machine-readable error codes where the public contract specifies them. It will inspect Cases and Case Events through PostgreSQL only for postconditions that cannot be observed in one HTTP response.
- Integration tests will include bounded timeouts and unconditional cleanup for temporary triggers, SSE connections, and fixture data.

## Out of Scope

- Browser end-to-end automation and visual UI-state verification remain out of scope; the existing SPEC defines them as manual verification work.
- Automatically starting or resetting Docker/Supabase from the test command is out of scope. Developers explicitly start the local stack and API before integration execution.
- Production-scale multi-instance SSE, Redis pub/sub, hosted Supabase environments, and CI container orchestration are out of scope.
- Changing SignalDesk's Case state machine, authorization rules, Workspace model, or application read/write trust boundary is out of scope.
- Replacing unit tests is out of scope. They remain useful for fast, focused feedback; this specification replaces only false integration evidence with real seams.

## Further Notes

- This specification follows the authoritative SignalDesk technical specification and candidate challenge. The candidate challenge requires English documentation, repeatable migrations and seed data, and evidence for high-risk behavior during the review.
- The Integration Test Workspace is test infrastructure, not a customer Workspace or a new product capability.
- An authenticated account without Workspace membership is intentionally not called an Agent: SignalDesk's domain glossary defines an Agent as a Workspace member.
- The final README must document exact local prerequisites, integration command, trust boundary, known limitations, and the distinction between fast unit tests and real integration verification.
