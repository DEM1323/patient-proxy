# Alpha current status

- **Branch / work to preserve:** `codex/member-lifecycle`, from merged `alpha` at `9e87e6c`. Slice 2 is implemented, demonstrated, committed, and open as a PR against `alpha`. Grok reviewed it before commit and found no blocking defects; it corrected the `last_admin` disclosure (see Inherited limits). Four generated-file line-ending changes and untracked `.claude/` are unrelated; do not stage, reset, or discard them.
- **Completed self-service so far:** slice 1, **Add a Member**, merged through [PR #24](https://github.com/DEM1323/patient-proxy/pull/24) as `9e87e6c`: the database Pilot Roster, first-sign-in binding, `/admin/members` pre-approve and revoke, the operator cutover and bootstrap, private audit, and the role-aware header. Grok's one blocker (a missing roster treated as empty) was fixed before merge. Dev `adorable-echidna-264` is cut over, and the owner's Membership is its Institutional Admin (Learner plus Institutional Admin). The original route #9–#16 is merged (PR #23 as `e1095ca`).
- **Current task:** Institution self-service slice 2, **Manage participation** (see [HANDOFF.md](HANDOFF.md)).
- **Slice 2 design:**
  - **Membership status:** `status` (`active` or `inactive`; absent means active) plus `statusChangedAt`. `requireMembership`, which every role check passes through, refuses an inactive Membership ("Pilot Membership is deactivated"), so a valid WorkOS session reads and does nothing. `currentMembership` and admission still return the same Membership with `status: "inactive"`, so it is never treated as unregistered or re-admitted. The gate shows "Your Pilot Membership is currently deactivated", and the header hides links.
  - **Commands** (`convex/institutionAdmin/lifecycle.ts`): `setRoles`, `deactivate`, `reactivate`, `setPendingApprovalRoles`, and the `auditLog` query. They require the caller's active Institutional Admin role, same-institution targets only, and never the caller's own roles or status (`self_change`).
  - **Last-admin protection:** no change may leave the institution without an active Institutional Admin. When two admins change each other at once, Convex re-runs the loser, which is then refused because it is no longer an admin. A `last_admin` status remains as spare defense.
  - **Ending Attempts:** removing Learner or deactivating ends any Active Attempt once with the new end reason `access_suspended`, through the common `endAttempt`, which abandons open exchanges so late replies append nothing. No Formative Feedback is generated for it, and its Debrief, history, and review copy say so. Feedback already pending for an earlier learner-ended Attempt still completes. Reactivation never resumes. Records, bindings, and group associations are kept.
  - **End reasons:** the validator is shared in `convex/attemptEnding/validators.ts`.
  - **Operator recovery:** `recoverInstitutionalAdmin` (internal, admin key only, audited) reactivates a designated Membership and grants the role.
  - **UI:** `/admin/members` adds:
    - Edit roles for Members and pending approvals
    - Deactivate with a confirmation stating that the Active Attempt ends and records are kept, plus Reactivate
    - "(you)" with no controls on your own row
    - "Deactivated" badges
    - Recent changes: the 100 newest audit events with actor and target
- **Demonstrated behavior (2026-10-01):** Lint, 130 tests across 25 files (118 existing + 12 new), and build pass; pushed to dev. The 8 backend lifecycle tests cover:
  - immediate role enforcement with audit
  - self-change, unchanged, invalid, and foreign cases
  - the concurrent two-admin invariant
  - a deactivated Member denied despite a session while the binding, records, and review stay; reactivation without resume
  - Learner removal suspending the Active Attempt with no late reply
  - earlier pending feedback completing after deactivation
  - pending-role edits
  - audit-log privacy, including inactive admins being refused
  - operator recovery

  The frontend tests cover the deactivated gate, the Members controls, the confirmation, pending edits, and the log. In the browser on dev:
  - Your own row shows "(you)" with no controls.
  - Recent changes listed slice 1's migration, bootstrap, pre-approval, and revocation with actors.
  - A synthetic identity was pre-approved as Learner, edited to Learner plus Faculty, and revoked, each logged.
- **Live two-account demo (2026-10-01):** the owner's admin session in Chrome, plus a second Google account in a private window driven and observed by the owner.
  - **Slice 1 first sign-in:** the owner pre-approved the second identity as Faculty on `/admin/members`. Its first sign-in bound one new Membership (`identity_bound`, actor sign-in).
  - **Faculty review (#16), first time live:** with the owner's approval, the transitional provisioning command enrolled the new Faculty Member in PACU Pilot. Its `/review` then listed the Ended Attempts of the group's Learner (the owner's Learner account).
  - **Role change:** the admin added Learner (Faculty becomes Learner plus Faculty). Without a refresh, the Faculty window's header showed Home, Scenarios, Your Attempts, and Review, and Your Attempts showed that account's own history.
  - **Deactivation:** that account started an Attempt (`js799y…`). The admin deactivated the Member through the confirmation. The private window switched live to "Your Pilot Membership is currently deactivated" and stayed there after a refresh. Dev data showed the Membership inactive with roles kept, the Attempt ended once as `access_suspended`, and no feedback row.
  - **Reactivation:** the window returned to the normal home page. Your Attempts listed the suspended Attempt with "No Debrief: this Attempt ended when your access was changed". Opening it showed it read-only with no resume. A new Attempt started fresh, and the suspended one stayed ended.
  - **Audit:** Recent changes recorded first sign-in, roles changed, deactivated, and reactivated, each with its actor.
- **Not yet demonstrated live:** the concurrent two-admin case and `last_admin`, operator recovery, a denied sign-in on the database path, and removing only the Learner role during an Active Attempt (all test-covered). Group enrollment still uses the transitional provisioning command.
- **Blockers:** None for review. Vercel fails on PRs (legacy Next.js project; cause not inspected). Gemini free-tier 503s and 22 dependency audit findings remain inherited.
- **Next action:** Merge the slice 2 PR into `alpha` with a merge commit once the owner confirms. Then slice 3 (Learning Groups and Scenario availability), which must first separate content provisioning from participation provisioning. Keep generated line-ending files (except `api.d.ts`) and `.claude/` out of commits.

## Inherited limits to retain

- Slice 2: `last_admin` never fires in a consistent run. The caller is always another active admin, and self-changes return `self_change` first. When two admins change each other at once, Convex re-runs the loser, which then fails the Institutional Admin role check, so exactly one change applies and an active admin always remains. The status is spare defense if the checks are reordered. A suspended Attempt's end message is the same for role removal and deactivation.
- Slice 1: `unavailable` for another institution's identity reveals that the identity is held elsewhere, though not where.
- #16: authorized review identifies Learners by roster email. Live Faculty review was shown on 2026-10-01; scope removal (group or availability) is still test-covered only.
- #15: automatic 90/30-day retention deletion is deferred; history makes no deletion claim.
- #14: citations are checked for event existence, not semantic accuracy; suggestions can be uncited; "performed incorrectly" is not in the word check; generated prompts are not checked for restating feedback; reflections do not inform feedback; the serving model is not logged.
- #13: the ending minimum counts every recorded Learner message.
- #11: actions are permitted while a reply is pending; another click after a lost response records another occurrence; the concluding observation repeats slightly.
- #10: Retry is hidden before 60 seconds; unsent messages are lost on reload; patient replies have no output screening; blank messages or request IDs throw.
- #9: Start lacks request-level retry idempotency; reopening an owned Attempt does not recheck availability.

Read [AGENTS.md](../../AGENTS.md) and the working diff when switching tools. Durable decisions are in [CONTEXT.md](../../CONTEXT.md); operational setup and the cutover are in [DEPLOYMENT.md](DEPLOYMENT.md). Historical requirements remain in the [alpha map](https://github.com/DEM1323/patient-proxy/issues/2), linked issues, PRs, and Git history.
