# 09 — Frontend: login, auth context, and queue shell

**What to build:** A working frontend where the user can log in with email/password (via Supabase Auth), see their workspace context, and browse the paginated case queue with filters. This is the first demoable frontend slice — a logged-in user sees real data from the API.

**Blocked by:** 03 — Auth module and /me endpoint, 05 — Queue listing with cursor pagination, filters, and case detail endpoint

**Status:** ready-for-agent

- [ ] Login page with email/password form and a user-switcher dropdown listing seeded users (pre-fills credentials, still submits through Supabase Auth)
- [ ] Supabase JS client initialized with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] On successful login, JWT is stored and included as `Authorization: Bearer <token>` on all API requests
- [ ] `useMe()` hook calls `GET /me`, cached by TanStack Query for the session
- [ ] Authenticated layout shell: workspace name, user display name, role badge, logout button
- [ ] Unauthenticated users are redirected to the login page
- [ ] Queue page fetches cases from `GET /cases` and renders a table/list with reference, title, priority, status, assignee display name, and created_at
- [ ] Cursor-based pagination controls (Next / Previous or infinite scroll with "Load more")
- [ ] Status filter dropdown (open, assigned, resolved, all)
- [ ] Mine/All toggle
- [ ] Priority filter dropdown
- [ ] Loading state while fetching cases
- [ ] Empty state when no cases match the current filters
