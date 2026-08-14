# SignalDesk

An internal case queue for a multi-tenant SaaS product where agents claim and resolve customer cases within isolated workspaces.

## Language

**Case**:
A unit of customer work in a workspace's queue. States: open → assigned → resolved.
_Avoid_: Ticket, issue, request

**Workspace**:
A tenant boundary. Every case, membership, and event belongs to exactly one workspace. Users in one workspace can never access another workspace's data.
_Avoid_: Tenant, organization, team

**Agent**:
A workspace member who claims unassigned cases and resolves cases assigned to themselves.
_Avoid_: User (too generic), operator

**Manager**:
A workspace member who can resolve any assigned case in the workspace, not only cases assigned to themselves.
_Avoid_: Admin, supervisor

**Claim**:
The act of assigning an unassigned (open) case to oneself. Exactly one claim can succeed for a given case; concurrent losers receive a conflict response.
_Avoid_: Assign (ambiguous — could imply assigning to others), take, grab

**Reference**:
A workspace-scoped, human-readable case identifier (e.g. CASE-0042). Distinct from the UUID primary key. Generated atomically via a counter on the workspace row.
_Avoid_: Case number, ticket ID

**Case Event**:
An immutable history entry recording a state change (created, claimed, resolved), the actor, and the timestamp. Stored in a dedicated table with a JSONB payload.
_Avoid_: Log entry, audit record, history item

**Resolution Note**:
A non-empty text note required when resolving a case. Stored on the case and captured in the resolved case event.
_Avoid_: Comment, closing note
