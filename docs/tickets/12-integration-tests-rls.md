# 12 — Integration tests: direct Postgres RLS seam

**What to build:** Tests that bypass NestJS entirely and connect directly to Postgres using the `authenticated` role with crafted JWTs, proving that the database-level defenses (revoked write grants, RLS SELECT policies) work independently of the application layer. Per [ADR-0001](../adr/0001-authenticated-role-select-only.md).

**Blocked by:** 02 — Database schema, auth hook, and seed data

**Status:** complete

- [x] Test harness: direct Postgres connection using the `authenticated` role (not service-role), with `SET LOCAL request.jwt.claims` to simulate a user's JWT
- [x] **Test 7 — Write Denial**: Using an `authenticated`-role connection with a valid Workspace A JWT, attempt `INSERT`, `UPDATE`, and `DELETE` on `cases` and `case_events`. Assert: all operations are denied with a permission error (not RLS filtering — the grants are revoked entirely at the role level)
- [x] **Test 8 — Read Isolation**: Using an `authenticated`-role connection with a Workspace A JWT, `SELECT` from `cases` filtering by a known Workspace B case ID (UUID documented in seed data). Assert: 0 rows returned — the case exists but RLS makes it invisible to the wrong workspace
