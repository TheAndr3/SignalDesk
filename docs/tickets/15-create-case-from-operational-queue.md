# 15 — Create Case from the Operational Queue

**What to build:** An Agent or Manager can create a Case from the operational queue without leaving the authenticated Workspace. The user receives an accessible form, clear validation and recovery behavior, and an unambiguous success confirmation while staying in the current filtered queue.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The queue exposes New Case to authenticated Agents and Managers.
- [ ] The accessible dialog accepts a required title, optional description, and Medium-default editable priority.
- [ ] Client and server failures are understandable, and entered content survives retryable failures.
- [ ] Dirty dismissal asks before discarding; keyboard focus, Escape, and focus restoration work.
- [ ] A successful submission preserves filters, refreshes the queue, closes the dialog, and announces the server-issued Reference.
- [ ] Browser acceptance proves the created Case and `created` event through the normal queue/detail flow.
