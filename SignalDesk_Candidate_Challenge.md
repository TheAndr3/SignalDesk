**ENGINEERING ASSESSMENT**

**SignalDesk**

Full-stack product sprint | Candidate brief

| Target level | Strong mid-level to senior full-stack engineer |
| :---- | :---- |
| **Hard timebox** | 24 hours, followed by a 35-minute review |
| **Required stack** | React \+ TypeScript \+ Vite | NestJS | Supabase/Postgres |
| **Language** | Written communication and project documentation in English |
| **AI** | Permitted and expected; transparent notes are required |

| Important  This brief is intentionally incomplete. You are evaluated on the questions you ask, the assumptions you make, and the tradeoffs you communicate. A smaller coherent solution is stronger than a broad unfinished one. |
| :---- |

# **1\. Product context**

SignalDesk is an internal case queue for a multi-tenant SaaS product. Each authenticated user belongs to one workspace. Users in one workspace must never be able to read or mutate cases from another workspace, even if they know a case ID.

Agents receive customer cases, claim work, and resolve it. Managers need visibility into the queue. Multiple people can be active at the same time, and the system must remain correct when actions happen concurrently.

## **1.1 Your goal**

Deliver a thin but working vertical slice that demonstrates sound product judgment, trustworthy data handling, and an architecture you can defend. Do not optimize for visual polish or feature count.

## **1.2 Suggested case fields**

* Reference or ID, title, description, priority, status, workspace, creator, assignee, created time, and updated time.

* A history entry that records important state changes, the actor, and the time.

* You may add fields when they protect an invariant or make your design clearer.

# **2\. Core product behavior**

* **Authentication:** use the provided Supabase Auth users. An unauthenticated user cannot access application data.

* **Queue:** show cases with reference, title, priority, status, assignee, and creation time. Include status filtering, a Mine/All control, and server-side pagination.

* **Create:** an authenticated user can create a case in their own workspace. Required inputs must be validated outside the browser as well.

* **Claim:** an unassigned case can be claimed. If two agents claim the same case at nearly the same moment, exactly one succeeds. The other user receives a clear conflict response, and history must not contain a duplicate successful claim.

* **Resolve:** an authorized user can resolve a case. A non-empty resolution note is required.

* **History:** create, claim, and resolve actions appear in a case timeline with actor and timestamp.

* **Freshness:** users should see other users' changes without manually refreshing the page.

* **States:** the interface must make loading, empty, validation, authorization, network-error, and claim-conflict states understandable.

## **2.1 Acceptance scenarios**

1. A user in Workspace A cannot retrieve or mutate a Workspace B case by changing a request payload, query string, or URL.

2. Two parallel claim attempts for the same unassigned case produce one success and one conflict, with one assignment and one claim event.

3. A failed resolution attempt does not leave the case updated without its history entry, or the history entry written without the case update.

4. A second signed-in user sees a committed change without performing a full page reload.

5. No privileged database credential is present in browser-delivered code or committed files.

# **3\. Technical constraints**

* Frontend: React, TypeScript, and Vite.

* Backend: NestJS and TypeScript. All state-changing operations must pass through the NestJS API. You may choose the read path, but explain the trust boundary.

* Data and identity: Supabase Auth and Supabase Postgres. Commit repeatable SQL migrations and seed data.

* Security: derive identity and workspace membership from the authenticated context. Do not trust a workspace ID, actor ID, role, or assignee supplied by the browser.

* Validation and errors: reject invalid transitions and return predictable HTTP/API errors. A claim race should not become a generic 500 response.

* Testing: include at least one automated test for the highest-risk behavior you chose. Explain why you selected it.

* Delivery: local execution is enough; deployment is not required.

# **4\. How to work during the sprint**

* Ask concise clarification questions in English. A good question includes the decision at stake and your proposed default.

* If an answer is unavailable, record the assumption and continue. Do not wait silently.

* You may receive a standardized stakeholder update during the exercise. Acknowledge it, restate the impact, and decide what changes inside the remaining time.

* Commit early enough that partial work is reviewable. Stop when the timebox ends, even if something remains incomplete.

* You are not expected to finish every possible improvement. Prioritization is part of the assessment.

# **5\. AI policy**

| AI is allowed  You may use ChatGPT, Codex, Copilot, Claude, or similar tools throughout the exercise. You remain responsible for every line, security decision, and claim in the submission. |
| :---- |

Create AI\_NOTES.md containing:

* The tools/models used and the kinds of tasks delegated to them.

* A short summary of the most consequential prompts or requests. Full transcripts are not required.

* At least two examples of how you verified or changed generated output.

* One example of an AI suggestion you rejected or would not ship, and why.

* Any area you could not independently verify inside the timebox.

During the review, you may be asked to explain or modify a block that AI helped produce. Clear ownership is more valuable than low AI usage.

# **6\. Submission**

Submit the repository at the hard stop. It must contain:

* Application code, migrations, and seed data.

* README.md in English: setup, run commands, architecture and trust boundary, data model, assumptions, tradeoffs, tests, known limitations, and what you would do next for production.

* AI\_NOTES.md as described above.

* A short final message in English stating what works, what is incomplete, and the highest remaining risk.

# **7\. Review format**

The 35-minute review includes: 5 minutes for a demo and status in English; 10 minutes for architecture, authorization, data integrity, and tradeoffs; 10 minutes for a high-risk code path; 5 minutes for AI use and verification; and 5 minutes for reflection and questions.

# **8\. What is evaluated**

* Architecture and prioritization under a strict timebox.

* Postgres/Supabase data modeling, tenant isolation, constraints, and concurrent correctness.

* NestJS structure, validation, authentication, authorization, and error behavior.

* React/Vite data flow, types, user states, and behavior after conflicts or remote changes.

* Question quality, written and spoken communication, English, and response to changing information.

* AI judgment, verification discipline, and ability to explain the result.

# **9\. Final self-check**

* Can another tenant access a case by ID?

* Can two agents both win a claim race?

* Can case state and history disagree after a failure?

* Can the browser choose its own workspace, role, or actor?

* Does the losing claimant receive a useful message?

* Can a reviewer start the project from the README?

* Can you explain every material AI-assisted decision?