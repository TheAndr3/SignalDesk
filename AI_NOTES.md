# AI Notes

## Tools and delegated work

- I used **Codex 5.6 Terra** and **Claude Opus 4.6 Thinking** for planning,
  design grilling, specification analysis, and ticket refinement.
- I used **Gemini 5.7 High** for the main implementation work.
- I used Codex again to inspect the running local Supabase environment, run
  real verification loops, and review the integration-test remediation.

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

1. I reproduced a local Auth failure through a direct password-grant loop.
   Container logs showed nullable Auth columns were scanned as strings, so I
   changed the seed to normalize the required fields, including `email_change`.
2. I found that the real integration suite received a 401 from `/me` for a
   valid Auth-issued token. Inspecting the token and local JWKS showed ES256
   signing while the API accepted only an HMAC secret. I changed the API to
   resolve Supabase JWKS keys, then reran the real HTTP, PostgreSQL, and SSE
   suites successfully.
3. I reviewed the earlier API and RLS seams and found an in-memory repository
   replacement and an offline-passing RLS test. I removed both rather than
   presenting them as evidence of real integration behavior.

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
