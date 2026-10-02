# Alpha current status

- **Branch / work to preserve:** `codex/learning-groups`, from merged `alpha` at `efb1109`. Slice 3 is implemented, demonstrated, committed, and open as a PR against `alpha`. Grok reviewed it before commit and found no blocking defects or polish items. It confirmed that provisioning can rerun the participation bootstrap only if the `pacu-pilot` group row is gone, which nothing in Patient Proxy does; that a just-removed Faculty member's concurrent toggle is re-run into `not_found`; and that duplicate group names are race-safe under Convex. Four generated-file line-ending changes and untracked `.claude/` are unrelated; do not stage, reset, or discard them.
- **Completed self-service so far** (Grok found no blocking defects in either after fixes):
  - Slice 1, **Add a Member**, merged through [PR #24](https://github.com/DEM1323/patient-proxy/pull/24) as `9e87e6c`: the database Pilot Roster, first-sign-in binding, pre-approve and revoke, operator cutover and bootstrap, private audit, and the role-aware header.
  - Slice 2, **Manage participation**, merged through [PR #25](https://github.com/DEM1323/patient-proxy/pull/25) as `efb1109`: role changes, deactivate and reactivate (denied despite a session, binding and records kept), `access_suspended` endings without resume or feedback, last-admin protection, operator recovery, and the audit log.

  Dev `adorable-echidna-264` is cut over. Its Members are the owner (Learner plus Institutional Admin) and a second account (Learner plus Faculty), both in "PACU Pilot" with PACU available. The original route #9–#16 is merged (PR #23 as `e1095ca`).
- **Current task:** Institution self-service slice 3, **Manage learning and review scope** (see [HANDOFF.md](HANDOFF.md) and the access policy in [issue #4](https://github.com/DEM1323/patient-proxy/issues/4#issuecomment-5272247623)).
- **Slice 3 design:**
  - **Provisioning split** (`convex/attemptStart/pilotProvisioning.ts`): content (publishing Scenario Versions) runs on every call. Participation (creating "PACU Pilot", PACU availability, enrolling current Learner and Faculty Members) runs only when that group doesn't exist yet, so a rerun returns `already_managed` and never re-enrolls a removed Member or restores removed availability.
  - **Backend** (`convex/learningGroups/`):
    - The `learningGroups` query gives Institutional Admins every group in the institution, plus enrollment candidates. Faculty get only the groups they currently belong to. Other roles are refused.
    - `createGroup`, with `invalid_name` and case-insensitive `duplicate_name` results, and `setMembership` are Institutional Admin only.
    - `setAvailability` is open to Institutional Admins for any group, and to Faculty only for their current groups (otherwise `not_found`, the same as a foreign group).
    - All ids are checked against the caller's institution, inactive callers are refused, every change is idempotent, and each is audited with group and Scenario references. The audit log shows group names and Scenario titles.
  - **Effects:** Faculty review and Learner starts follow group and availability changes immediately. Removal never ends an Active Attempt; it blocks future starts and revokes Faculty review through that group.
  - **UI:**
    - `/groups` (`src/alpha/features/learning-groups/`) for Faculty and Institutional Admin. Admins get "Create a Learning Group", Remove, and Add a Member. Each group has availability checkboxes; Faculty see only their groups and the checkboxes.
    - "Learning Groups" was added to the header and home shortcuts for both roles.
- **Demonstrated behavior (2026-10-01):** Lint, 140 tests across 27 files (130 existing + 10 new), and build pass; pushed to dev, where provisioning now returns `already_managed` with 0 enrolled. The 7 backend tests cover:
  - provisioning never restoring removed scope
  - Learner starts and Faculty review driven entirely by in-product group and availability changes
  - one listing across two granting groups, revoked only when no group grants it
  - Faculty limited to availability in their own groups
  - Active Attempts surviving group or availability removal while new starts are blocked
  - name validation and institution isolation
  - deactivated callers refused while the group association is kept

  The 3 frontend tests cover admin and Faculty controls and the role gate. Live two-account demo, with the owner observing the Faculty window:
  - The admin's `/groups` showed PACU Pilot with both Members and PACU available.
  - Removing the owner's Learner account from the group immediately emptied the owner's Scenarios list, while Institutional Admin review still listed all 8 Ended Attempts. The Faculty window's Review dropped the owner's Attempts live and kept its own.
  - The Faculty window's Learning Groups showed only PACU Pilot, with availability but no Remove, Add, or Create controls.
  - Faculty cleared and re-ticked PACU availability, each confirmed; Review and Scenarios emptied while it was cleared.
  - The admin re-added the owner, which restored Scenarios.
  - The audit recorded each change with the right actor.
- **Not yet demonstrated live:** two granting groups, and a deactivated Faculty on `/groups` (both test-covered).
- **Blockers:** None for review. Vercel fails on PRs (legacy Next.js project; cause not inspected). Gemini free-tier 503s and 22 dependency audit findings remain inherited.
- **Next action:** Merge the slice 3 PR into `alpha` with a merge commit once the owner confirms. That completes the approved self-service expansion; the expanded end-to-end demonstration in HANDOFF.md follows. Keep generated line-ending files (except `api.d.ts`) and `.claude/` out of commits.

## Inherited limits to retain

- Slice 2: `last_admin` never fires in a consistent run. The caller is always another active admin, and self-changes return `self_change` first. When two admins change each other at once, Convex re-runs the loser, which then fails the Institutional Admin role check, so exactly one change applies and an active admin always remains. The status is spare defense if the checks are reordered. A suspended Attempt's end message is the same for role removal and deactivation.
- Slice 1: `unavailable` for another institution's identity reveals that the identity is held elsewhere, though not where.
- #16: authorized review identifies Learners by roster email. Live Faculty review and live scope removal (group and availability) were shown on 2026-10-01.
- #15: automatic 90/30-day retention deletion is deferred; history makes no deletion claim.
- #14: citations are checked for event existence, not semantic accuracy; suggestions can be uncited; "performed incorrectly" is not in the word check; generated prompts are not checked for restating feedback; reflections do not inform feedback; the serving model is not logged.
- #13: the ending minimum counts every recorded Learner message.
- #11: actions are permitted while a reply is pending; another click after a lost response records another occurrence; the concluding observation repeats slightly.
- #10: Retry is hidden before 60 seconds; unsent messages are lost on reload; patient replies have no output screening; blank messages or request IDs throw.
- #9: Start lacks request-level retry idempotency; reopening an owned Attempt does not recheck availability.

Read [AGENTS.md](../../AGENTS.md) and the working diff when switching tools. Durable decisions are in [CONTEXT.md](../../CONTEXT.md); operational setup and the cutover are in [DEPLOYMENT.md](DEPLOYMENT.md). Historical requirements remain in the [alpha map](https://github.com/DEM1323/patient-proxy/issues/2), linked issues, PRs, and Git history.
