# 01 — Project scaffold and Supabase local dev

**What to build:** A working monorepo skeleton where NestJS boots, Vite dev server boots, the shared package is importable from both apps, and `supabase start` launches local Postgres + Auth. No features yet — just the wiring that lets every subsequent ticket start writing code immediately.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Root `package.json` with npm workspaces: `api/`, `web/`, `packages/*`
- [ ] `packages/shared/` with `package.json`, `tsconfig.json`, and placeholder exports for domain enums (`CaseStatus`, `CasePriority`, `WorkspaceMemberRole`) and error codes
- [ ] `api/` initialized as a NestJS project (TypeScript), imports from `@signaldesk/shared`
- [ ] `web/` initialized as a React + Vite + TypeScript project, imports from `@signaldesk/shared`
- [ ] `supabase/` initialized via `supabase init`, `supabase start` runs and launches local Postgres + Auth
- [ ] Kysely installed and configured in `api/` with a `DatabaseModule` providing the query builder (connection string from env)
- [ ] TanStack Query installed in `web/`
- [ ] `.env.example` committed with placeholder keys; `.env` in `.gitignore`
- [ ] `npm install` from root installs all workspaces; `npm run dev` in each app boots without errors
