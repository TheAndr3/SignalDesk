# 16 — Acknowledge Successful Claim

**What to build:** An Agent receives an explicit, accessible acknowledgement after successfully Claiming an open Case, while the existing conflict behavior, Case update, and queue freshness remain intact.

**Blocked by:** 15 — Create Case from the Operational Queue.

**Status:** ready-for-agent

- [ ] A successful Claim announces the claimed Case Reference without requiring a page reload.
- [ ] The Claim acknowledgement uses the accessible feedback mechanism introduced by ticket 15.
- [ ] Claim conflict and generic failure messages remain understandable and do not report false success.
- [ ] Browser acceptance proves the Case status/assignee update and successful acknowledgement.
