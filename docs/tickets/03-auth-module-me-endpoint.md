# 03 — Auth module and /me endpoint

**What to build:** NestJS authentication infrastructure that validates Supabase JWTs, extracts workspace context from claims, and provides a `/me` endpoint for the frontend to hydrate user/workspace info after login. Any request with an invalid, expired, or workspace-less JWT is rejected before reaching any business logic.

**Blocked by:** 01 — Project scaffold and Supabase local dev, 02 — Database schema, auth hook, and seed data

**Status:** ready-for-agent

- [ ] `AuthModule` with `passport-jwt` strategy validating against `SUPABASE_JWT_SECRET` from env
- [ ] Global `AuthGuard` applied to all routes (except explicit public routes, if any)
- [ ] Guard extracts `sub` (user ID), `workspace_id`, and `role` from JWT claims and attaches them to the request context
- [ ] Requests where `workspace_id` is missing from JWT claims are rejected with `403 Forbidden` before any database access
- [ ] Requests with invalid or expired JWTs are rejected with `401 Unauthorized`
- [ ] `GET /me` endpoint returns `{ userId, displayName, role, workspace: { id, name } }` by looking up `workspace_members` + `workspaces` via the service-role Kysely connection
- [ ] A request with a valid seeded-user JWT to `GET /me` returns the correct user profile
- [ ] Global `ValidationPipe` configured with `whitelist: true` and `forbidNonWhitelisted: true` (using `class-validator` / `class-transformer`)
