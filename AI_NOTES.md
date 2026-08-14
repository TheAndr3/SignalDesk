# AI Notes

## Tools and delegated work

- **Codex 5.6 Terra** and **Claude Opus 4.6 Thinking** were used for planning,
  grilling, specification analysis, and ticket refinement.
- The project owner reports that the main implementation work was produced with
  **Gemini 5.7 High**.
- This integration-test remediation used Codex to inspect the running local
  Supabase environment, execute the real verification loops, and review the
  resulting changes.

## Consequential requests

- Compare the implementation against the authoritative technical specification
  and candidate challenge, then replace mocked integration evidence with real
  Supabase seams.
- Require real Auth-issued JWTs, an isolated Integration Test Workspace,
  fixture cleanup, real HTTP SSE verification, and direct PostgreSQL RLS
  verification.
- Produce an English test specification before implementation and record the
  decisions made during the grilling session.

## Independent verification and changes

1. A direct password-grant loop reproduced the local Auth failure. Container
   logs showed nullable Auth columns were scanned as strings; the seed was
   changed to normalize the required fields, including `email_change`.
2. The real integration suite initially received a 401 from `/me` for a valid
   Auth-issued token. Inspecting the token and local JWKS showed ES256 signing,
   while the API accepted only an HMAC secret. The API was changed to resolve
   Supabase JWKS keys, then the real HTTP, PostgreSQL, and SSE suites passed.
3. The previous API seam replaced the repository with an in-memory map and the
   previous RLS seam passed while offline. Both were removed rather than kept as
   evidence of integration behavior.

## Rejected suggestion

Automatically resetting and rebuilding the local Supabase stack from the test
command was rejected. It would make tests destructive to a developer's local
data and hide a costly Docker lifecycle behind a nominal test command. The
suite instead requires explicitly running Supabase and NestJS, then fails with
actionable setup guidance.

## Areas not independently verified

- Browser E2E and visual UI states remain manual verification work.
- Multi-instance SSE behavior and CI container orchestration are not part of
  this local vertical slice.
