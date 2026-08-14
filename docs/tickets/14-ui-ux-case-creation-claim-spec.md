# 14 — UI/UX: authenticated Case creation and Claim feedback

**Status:** ready-for-agent

## Problem Statement

Agents and Managers can create a Case through the NestJS API, but the operational queue has no interface for doing so. A workspace member must leave the product flow or call the API directly, so the required Case lifecycle cannot be demonstrated end-to-end in the web application. In addition, a successful Claim updates the data but does not give the user an explicit success acknowledgement.

## Solution

Add an accessible **New Case** flow to the operational queue for authenticated Agents and Managers. The user submits a title, optional description, and editable priority through the existing NestJS creation endpoint. On success, the dialog closes, the current queue refreshes without changing filters, and a short live confirmation names the new Reference. Give successful Claims the same clear acknowledgement.

## User Stories

1. As an Agent, I want to start a new Case from the operational queue, so that I can record incoming customer work without leaving the product.
2. As a Manager, I want to start a new Case from the same queue, so that I can capture work while supervising the Workspace.
3. As a workspace member, I want the Case to be created in my own Workspace automatically, so that I cannot accidentally create work for another Workspace.
4. As a workspace member, I want a title to be required, so that every Case is identifiable in the queue.
5. As a workspace member, I want to add an optional description, so that I can preserve useful context without being blocked when none is available.
6. As a workspace member, I want priority to begin as Medium but remain editable, so that ordinary intake is quick while urgent work can be identified.
7. As a workspace member, I want validation errors next to the relevant form input, so that I know exactly what to correct.
8. As a workspace member, I want a general network or server failure to preserve my entered content, so that I can retry without re-entering the Case.
9. As a workspace member, I want to cancel safely, so that an empty form closes immediately but entered work is not discarded by mistake.
10. As a keyboard user, I want the creation dialog to manage focus and respond to Escape, so that I can complete or leave the flow without a mouse.
11. As a workspace member, I want the new Case to appear after creation without a full page reload, so that the queue remains trustworthy.
12. As a workspace member, I want creation to preserve my active queue filters, so that the application does not silently change my working context.
13. As a workspace member, I want a concise confirmation containing the new Reference, so that I know the server accepted the Case even when current filters do not show it.
14. As an Agent, I want a concise confirmation after I Claim a Case, so that I know ownership changed successfully.
15. As a workspace member, I want the Case timeline to show the existing `created` event for a newly created Case, so that the audit trail is visible through the normal detail view.

## Implementation Decisions

- The feature remains an authenticated internal workflow. The browser sends only title, optional description, and priority to the existing NestJS endpoint; identity, Workspace, initial status, assignee, Reference, and Case Event actor remain server-derived.
- Agents and Managers receive the New Case affordance. No new role or authorization rule is introduced.
- The queue header exposes a New Case button that opens an accessible modal dialog.
- The dialog has a required title, optional description, and a priority selector set initially to Medium. Client validation gives immediate feedback, while server validation remains authoritative.
- A dirty dialog asks for confirmation before close by Cancel, backdrop, close control, or Escape. An untouched dialog closes immediately.
- On success, the dialog closes, the queue query is invalidated, existing filters remain unchanged, and a short accessible toast announces the formatted Reference. The queue stays visible; the newly created Case is not opened automatically.
- The existing Claim operation gains the same toast-based success acknowledgement. Conflict and error behavior remain intact.
- The toast mechanism is shared UI infrastructure for this scoped feature and exposes status messages through an accessible live region.
- This work does not alter the Case state machine, database schema, API contract, Workspace isolation model, or SSE transport.

## Testing Decisions

- The primary new seam is browser acceptance: a real authenticated workspace member opens the dialog, creates a Case, observes the current queue refresh and success toast, opens the Case detail, and sees its `created` event.
- Browser acceptance also verifies client validation, dirty-form discard confirmation, keyboard dialog behavior, preserved filters, Claim success feedback, and error recovery that preserves user input.
- Existing real NestJS/Supabase integration tests remain the source of truth for atomic Reference allocation, Workspace isolation, Case Event persistence, and SSE delivery. The UI work must not duplicate those lower-level invariants.
- A good test asserts user-visible behavior and server-observable outcomes rather than component state or implementation calls.

## Out of Scope

- Public or anonymous Case submission, customer accounts, requester tracking, PII collection, anti-abuse controls, and external Workspace selection.
- New Case statuses, triage workflows, reassignment, reopening, deletion, or editing.
- Changes to resolve behavior beyond preserving existing UI behavior.
- Replacing the existing single-instance SSE architecture.
- A full mobile/table redesign or broad accessibility refactor outside the creation dialog and Claim acknowledgement.

## Further Notes

This feature completes the authenticated Case creation user story already supported by the server. It preserves the authorization boundary in ADR-0001: all mutations continue through NestJS. Queue freshness remains aligned with ADR-0002 because the client refetches through the existing query and SSE mechanisms.
