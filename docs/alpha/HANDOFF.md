# Patient Proxy: merge and institution self-service handoff

Updated 2026-09-29 after the owner expanded alpha scope and selected the private Convex database roster. [AGENTS.md](../../AGENTS.md) governs working practice, [CONTEXT.md](../../CONTEXT.md) defines product boundaries, and [WAYFINDER.md](WAYFINDER.md) holds observed status. This handoff is documentation for the next implementation task; it does not mean PR #23 was merged or self-service implemented.

## Destination

The alpha represents an already-provisioned UMass Boston Patient Proxy portal. An Institutional Admin adds Members with any combination of the four roles, manages participation and Learning Groups, and controls Scenario availability. An approved Learner completes Elena Ruiz's PACU encounter, receives useful evidence-linked Formative Feedback, and authorized Faculty reviews the saved Ended Attempt within current scope.

The expanded route is: **add Member → manage participation → configure learning/review scope → start → converse → act → end → reflect and receive feedback → revisit → authorized review**. Routine Member, group, and availability administration must be demonstrable inside Patient Proxy. Provisioning supplies the institution and its first Institutional Admin once; no institution-creation workflow is needed.

## Where work stands

- Checkout: `C:\Users\David.Martinez\Desktop\patient-proxy-alpha`.
- Observed working branch: `codex/attempt-review`, HEAD `e313a9c`, based on `alpha` at `ade053b`. The documentation changes for this expansion are initially uncommitted in this checkout; preserve them when changing branches. Inspect the live branch and diff before continuing; this snapshot will age.
- **Issue #9 is implemented, reviewed, and committed.** Per the user's relayed Claude handoff, Grok reviewed it before commit and its fixes are included in `a3d64a6` (“Start the PACU Attempt (#9)”). Setup documentation is in `76c7975`; this map was added in `b7db8b8`. Confirm current branch/HEAD; another full #9 review is not a prerequisite for continuing. Revisit specific code when new changes or concrete evidence justify it.
- **Issue #10 is implemented, reviewed, and merged.** Claude implemented it in `d1bf0a4` (“Hold a recoverable patient exchange (#10)”), and it merged into `alpha` through [PR #18](https://github.com/DEM1323/patient-proxy/pull/18) as `7c85223`. Grok's review is posted on PR #18: no blocking defects. Its non-blocking items, all previously disclosed: Retry stays hidden until the 60 s deadline; replies are not screened after generation; a blank message or empty request id throws instead of returning a status. Lint, 45 tests across 13 files, and build passed, and a live multi-turn Gemini exchange was demonstrated on dev (details in `WAYFINDER.md`). 
- **Issue #11 is implemented, reviewed, and merged.** Claude implemented it in `e475b6f` (“Take a recoverable Clinical Action (#11)”), Grok reviewed the diff before commit with no blocking defects, and it merged through [PR #19](https://github.com/DEM1323/patient-proxy/pull/19) as `58148fc`. Scenario Version 2 on dev carries the Clinical Actions.
- **Issue #13 is implemented, reviewed, and merged.** Claude implemented it in `1dd6850` (“End the Attempt once (#13)”), Grok reviewed the diff before commit with no blocking defects, and it merged through [PR #20](https://github.com/DEM1323/patient-proxy/pull/20) as `9a57587`.
- **Issue #14 is implemented, reviewed, and merged.** Claude implemented it in `9dfafbf` plus the instructor-guidance follow-up `e537730`. Grok reviewed both commits with no blocking defects, and it merged through [PR #21](https://github.com/DEM1323/patient-proxy/pull/21) as `d3de4d0`.
- **Issue #15 is implemented, reviewed, and merged.** Claude implemented it in `77045ba`, Grok reviewed it with no blocking defects (its polish point was fixed before commit), and it merged through [PR #22](https://github.com/DEM1323/patient-proxy/pull/22) as `ade053b`. #16 completes the original Learner-to-review route; self-service now extends the alpha.
- **PR #23 is merged** into `alpha` as `e1095ca` (merge commit, head `e313a9c`; `alpha` has no branch protection or required checks; Vercel still failed with the cause unverified). Slice 1 ("Add a Member") merged through [PR #24](https://github.com/DEM1323/patient-proxy/pull/24) as `9e87e6c` after Grok's review (one blocker fixed). Slice 2 ("Manage participation") merged through [PR #25](https://github.com/DEM1323/patient-proxy/pull/25) as `efb1109`. Slice 3 ("Manage learning and review scope") is on `codex/learning-groups`. Earlier pre-merge record: a read-only GitHub check on 2026-09-29 found [PR #23](https://github.com/DEM1323/patient-proxy/pull/23) OPEN, non-draft, MERGEABLE, from `codex/attempt-review` at `e313a9c258cbd034d07471bce9ce167566693dbc` into `alpha`. Merge state was UNSTABLE: Vercel failed and Vercel Preview Comments succeeded. No formal GitHub review decision was recorded; the PR body reports Grok's no-blocker review, passing lint/103 tests/build, and live Learner denial checks. The Vercel failure is previously reported on alpha; its presumed legacy cause is not verified. Faculty/Institutional Admin live review is still pending.
- Claude's handoff reports typecheck, lint, 30 tests across 10 files, build, Wrangler dry run, and local start/reload/restart demonstrations. Codex verified the commits and recorded the reported review; it did not independently rerun that review. The four generated files with line-ending-only differences were left unstaged and were not pushed, per Claude's handoff; normalized Git diff showed no content changes. Preserve later work and avoid including this generated-file churn in unrelated commits. No production deployment occurred.
- The user explicitly selected this alpha checkout as the development baseline. The earlier development schema/indexes are not to be restored merely because they once existed.
- Setup verification passed: typecheck, lint, 19 tests across 8 files, build, Wrangler dry run, backend health, approved Learner sign-in, and refresh persistence. An unapproved identity was denied. These results predate Claude's feature edits and do not certify the new code.
- The unchanged dependency lock reported 22 audit findings (5 low, 6 moderate, 10 high, 1 critical). Avoid folding an unrelated dependency upgrade into a feature.
- Vite was left running. The Convex watcher was not running during #10, so backend changes were pushed with `npx convex dev --once`. Check before starting duplicate services. Local app: `http://localhost:5173/`; health page: `/deployment-check`.
- Existing backend: `umb/patient-proxy`, development deployment `adorable-echidna-264`. WorkOS and ignored `.env.local` are configured. `GOOGLE_GEMINI_API_KEY` (free tier) is set on the dev deployment only. Credentials remain in their existing local/backend stores.

Startup, only if the corresponding process is stopped:

```powershell
# Terminal 1
npm run dev:backend
# Terminal 2
npm run dev -- --host localhost --port 5173 --strictPort
```

## How the two agents work together

**Grok owns bounded analysis and independent review.** While Claude codes, Grok can read requirements, inspect a stable baseline, identify consequential ambiguities, and prepare failure cases. Keep this work read-only in the shared checkout; do not run a second Convex watcher. Analyze the next feature only far enough to help implementation, without fixing interfaces before Claude's current feature is demonstrated.

**Claude owns implementation and local verification.** Claude chooses routine technical details, completes one feature from browser to Convex, tests its concrete risks, and updates the short current-status note. It can correct ordinary defects without waiting for another architecture round.

**You own changes to product scope, access policy, and deployment intent.** Ask you only when an unresolved decision affects one of those boundaries or a necessary credential/identity is unavailable. Routine implementation choices do not require approval.

For each feature:

1. Read the shared guide, current status, current diff (including untracked files), and the relevant issue with comments. Use actual code and demonstrations to determine progress; an open issue alone does not prove work is missing.
2. Grok provides a short implementation brief when useful: outcome, acceptance examples, existing code to extend, material risks, and any single blocking question. Usually 10–20 lines is enough. It is advice Claude can refine, not a mandatory approval gate.
3. Claude implements, verifies, and supplies exact local demo steps plus remaining limitations.
4. Grok reviews the completed diff for reproducible defects and unmet requirements. Findings should include trigger, consequence, relevant location, and a minimal verification. Separate blocking defects from optional polish.
5. Claude fixes blockers and reruns affected checks. Record demonstrated behavior and move to the next useful feature. Update `docs/alpha/WAYFINDER.md`; keep it short.

One editing agent per checkout. If both agents must edit simultaneously, use separate worktrees/branches and coordinate the shared development backend. Avoid switching branches underneath Claude. There is no need to modify GitHub issues as a side effect of this handoff.

The integration target for this branch is `alpha`. Record the completed Grok review and validation in the PR; opening it does not require restarting that review or authorize production deployment. Check the live remote and reuse any existing PR. Further review should focus on new changes or concrete unresolved findings.

## Merge PR #23, then start the next slice

1. Recheck PR #23's current head, base, mergeability, and checks with `gh pr view 23`. Review new changes if the head differs from the observed `e313a9c`. The prior Grok review is already reported; do not restart all earlier feature reviews as ceremony. Do not describe the current checks as all green or bypass branch protection to hide the Vercel failure.
2. The owner, or an agent given the explicit merge-and-start prompt below, merges PR #23 into `alpha` **with a merge commit**. Merging is not part of this documentation edit. A receiving implementation-only agent verifies the merge first; if it is still pending, report the remaining merge state rather than silently assuming completion.
3. Preserve this documentation delta before updating the checkout. Stage only `AGENTS.md`, `CONTEXT.md`, `docs/alpha/DEPLOYMENT.md`, `docs/alpha/HANDOFF.md`, and `docs/alpha/WAYFINDER.md` if saving a documentation commit. Do not include the four generated line-ending changes or `.claude/`. A documentation commit can be carried onto the next branch after the merge; do not reset the checkout or discard untracked work. Preserve any additional edits discovered at handoff too.
4. Fetch the merged `alpha` and start `codex/institution-members` from it, carrying the saved documentation changes. Reuse an existing suitable task branch if implementation has already begun. Keep simultaneous editors in separate worktrees; coordinate the shared Convex deployment before syncing.
5. Implement **slice 1 only** below from UI through persistence and authorization. The owner has selected the database roster and expanded alpha scope; those decisions do not need reconfirmation. No production deployment, WorkOS organization migration, or institution-creation UI is part of this task.

## Next implementation task: add a Member

**Outcome:** An Institutional Admin opens Members, sees existing Members and pending approvals in UMass Boston, pre-approves an exact identity with any additive combination of Learner, Faculty, Author, and Institutional Admin, and the verified identity acquires one stable Membership at first sign-in.

**Architecture:** Private Convex `rosterEntries` (or equivalent) own pending approval, initial roles, and permanent binding history. Existing `memberships` own current roles and, in the lifecycle slice, participation status. WorkOS authenticates and supplies server-fetched verified identity; Convex enforces scope on every operation. Keep the existing email normalization (trim/lowercase; no domain or alias inference) and one binding per approved identity. WorkOS invitations/organizations/role claims are not an alternate source of permission.

**Feature shape:** Extend admission in `convex/membershipAccess/`. Add `convex/institutionAdmin/model.ts` and `access.ts`, validators where useful, and colocated backend tests. Add `src/alpha/features/institution-admin/index.tsx` and `view.tsx`, registering `/admin/members` in `src/alpha/router.tsx`. Suggested queries: `listMembers`, `listPreapprovals`. Suggested mutations: `preapproveIdentity`, `revokePreapproval`. Preserve the existing stable-binding admission entry point. Every admin operation requires the current Institutional Admin role and derives institution from that Membership; all target IDs are checked against that institution. Browser arguments never supply trusted actor or scope.

**UI:** List approved identity email, additive roles, admission date (or pending), and participation/admission state, keeping pending approvals distinguishable from Members. Label the email as the approved identity, not a live WorkOS profile. Use role checkboxes with no inheritance; allow all four roles. Say **Pre-approve identity** and show pending admission; email delivery is not included and must not be implied. An already-admitted identity is managed through its Membership, not a new approval. Duplicate and foreign-identity responses must not disclose another institution's records.

**Navigation:** A small authenticated header exposes Home; Scenarios and Your Attempts for Learners; Review for Faculty or Institutional Admin; Members for Institutional Admin. Deduplicate links for combined roles and preserve home `journeyActions` as shortcuts using the same rules. Add an Institutional Admin gate consistent with existing gates, with backend enforcement regardless of hidden navigation. Author remains assignable and recognized on the home journey, without a dead link to an unimplemented authoring page. Add Learning Groups navigation when that slice ships.

**Migration and first administrator:** Follow [DEPLOYMENT.md](DEPLOYMENT.md#database-roster-cutover-planned-not-yet-executable). Import the protected environment roster inside Convex, never via printed/exported secret values. Preserve every existing Membership ID, WorkOS binding, institution, role set, and learning-record reference, including Members missing from the old roster. Import pending entries separately; conflicting identities require safe resolution, not overwrites. Make import/retry idempotent and prevent concurrent admissions from escaping the cutover. Once switched, no fallback to `PILOT_ROSTER_JSON` may revive a revoked approval. Bootstrap one explicitly designated existing UMass Boston Membership as Institutional Admin, preserving its other roles and auditing the grant; never infer administrator status from email domain or first sign-in. Development migration is part of demonstrating this feature after shared-backend coordination; production is separate.

**Acceptance examples:**

| Given | When | Then |
| --- | --- | --- |
| An Institutional Admin and Members/pending approvals in two synthetic institutions | The admin opens Members or queries it directly | Only their institution's entries and permitted fields are returned; refresh preserves the list |
| A new exact identity and a nonempty valid combination of any of the four roles | The admin pre-approves it and retries the same request | One pending approval persists with the selected roles and an audit event; no Membership exists yet |
| A pending approval | Its exact server-verified WorkOS identity signs in, including concurrent/retried admission | One Membership is bound; initial roles and institution are correct; subsequent authorization uses the stable WorkOS ID |
| A pending or already-bound identity | An unverified identity, same-domain alternative, or different WorkOS ID tries to claim it | Admission is denied without creating or transferring a Membership |
| A pending approval | The admin revokes it, including a race with admission | Later admission fails if revocation wins; if binding won, pending revocation cannot silently revoke the existing Membership |
| A non-admin, unauthenticated caller, or foreign-institution target ID | A list or mutation is called directly | No private records, existence information, or unauthorized changes are exposed |
| Existing Members, including a Member absent from the old environment roster | Migration is retried, or a bound WorkOS email later changes | Existing IDs, bindings, current roles, institution, and saved records are retained; stale roster roles never overwrite Membership |
| A Member with multiple roles | They sign in and refresh | Implemented journeys appear once per destination; Institutional Admin alone gains no Learner or Author capability |

Audit approval, revocation, binding, migration, and bootstrap changes with actor/operator provenance, institution, target, before/after values, and timestamp in the same transaction as the change where applicable. Keep audits private and scoped; do not put raw roster data, secrets, or Attempt content in logs. Enforce uniqueness through transactional reads/writes; an index name alone is not a uniqueness constraint.

**Verification:** Use synthetic fixtures for all role combinations, admission/migration races and retries, server-derived identity, stable bindings, unauthorized/foreign direct calls, and persistence. Run lint, tests, and build once after implementation; rerun affected checks after fixes. Demonstrate sign-in and refresh with the owner completing interactive authentication when required. Record what was observed versus mocked or still awaiting identities. Group enrollment still uses the existing operator step during slice 1; that limitation is temporary and does not satisfy the final expanded alpha demo.

## Required follow-up slices

| Slice | Behavior and APIs | Completion evidence |
| --- | --- | --- |
| **2. Manage participation** | `setMemberRoles`, `deactivateMember`, `reactivateMember`, `listAuditEvents`; current active Institutional Admin and same-institution targets | Immediate role/status enforcement, last-admin protection, retained records, and a deactivated Member denied despite a valid WorkOS session |
| **3. Manage learning and review scope** | `listLearningGroups`, `createLearningGroup`, `setGroupMembership`, `listAvailableScenarios`, `setScenarioAvailability`; split into smaller vertical slices if useful | Create a group, enroll Members, make PACU available, and change Faculty list/detail scope entirely from Patient Proxy |

Apply these lifecycle rules in slice 2: no self-service changes to one's own roles or status; another Institutional Admin can assign any of the four roles. Reject removal/deactivation of the last active Institutional Admin transactionally, including competing changes by two admins. Retain a restricted audited operator recovery path, not a platform-management UI. Check active Membership in all authorization/admission shortcuts and never treat inactive as unregistered. Preserve the binding on deactivation.

Removing Learner or deactivating Membership ends any Active Attempt once with `access_suspended`, abandons open exchanges, and prevents late replies from appending. Extend the common ending helper, validators, history/review/debrief views, and tests together; reactivation never resumes the Attempt. Do not generate completion feedback for a suspension-ended run; feedback already pending for an earlier learner-ended Attempt can complete as part of its retained record. Retain saved Attempts, reflections, feedback, and ownership under the existing retention policy; no deletion or retention-clock reset as a side effect of role/status changes. An inactive Member cannot read or act; removal of Learner removes the Learner's own-history permission. Existing group associations persist unless explicitly changed, allowing currently authorized reviewers to inspect retained records. Removing Faculty removes that review grant; a separately held Institutional Admin role still grants institution-wide review, and vice versa for remaining Faculty group scope.

In slice 3, Institutional Admins manage groups and Member enrollment. Faculty may change Published Scenario availability within their own authorized groups; Institutional Admins may do so across the institution, preserving [the accepted access policy](https://github.com/DEM1323/patient-proxy/issues/4#issuecomment-5272247623). Validate the institution of the Member, group, Scenario, and relationship on each operation. Faculty gain access only to Ended Attempts through current shared groups and current Scenario availability; show the granting groups where useful. Filters narrow authorized results and never impersonate another Member or expand permission. Preserve existing Active Attempt behavior for group/availability removal (blocks future starts and revokes Faculty scope, without ending an already-started Attempt); Membership suspension is the explicit terminal operation above.

Before shipping group/availability controls, separate content provisioning from participation provisioning. The old PACU provisioner must not re-enroll removed Members or restore removed availability on a routine rerun. Test group/availability revocation, multiple granting groups and deduplication, inactive callers, institution isolation, and Institutional Admin review independently of group membership.

## Preserve the #16 behavior being merged

**Outcome:** Faculty list and inspect only Ended Attempts currently authorized through shared Learning Group membership and Scenario availability; revocation is immediate. Institutional Admin uses the same review with Pilot Institution-wide scope. Active and cross-institution Attempts reveal no recorded content.

**Acceptance and verification:** as in [issue #16](https://github.com/DEM1323/patient-proxy/issues/16):
- Listed once, with evidence, Learner Reflections, and Formative Feedback reviewable.
- Removing the Learner from the group, or the Scenario availability, revokes list and detail.
- Active and cross-institution ids are denied without content.
- Institutional Admin review needs no group membership but stays within the institution.

**Scope:** Keep #9 to #15 behavior working. #16 completes the original Learner-to-review route, which the new institution self-service slices extend. No production deployment.

## Original learning route and completion evidence

| Feature / source | Demonstration that earns completion | Grok's most useful review focus |
| --- | --- | --- |
| **Completed: [#9 Start the PACU Attempt](https://github.com/DEM1323/patient-proxy/issues/9), commit `a3d64a6`** | An approved Learner sees the currently Available Scenario, reads only the Learner Brief, and starts a persisted Learner-owned Attempt pinned to a Scenario Version. Reload of its current route restores the same Attempt. Starting again confirms and ends the prior run before creating another. | Grok review completed before commit, with fixes included per the user/Claude handoff. Preserve its authorization, pinning, and lifecycle behavior while extending interaction. |
| **Completed: [#10 Hold a recoverable patient exchange](https://github.com/DEM1323/patient-proxy/issues/10), PR #18 merged as `7c85223`** | Complete several conversational turns grounded in the pinned authored state and prior timeline. Induce a timeout or interrupted response, retry, and show one Learner message and at most one patient response for that request. | Grok review posted on PR #18 with no blocking defects. Preserve Gemini in protected backend code, one open exchange per Attempt, retry deduplication, and late-reply rejection while adding Clinical Actions. |
| **Completed: [#11 Take a recoverable Clinical Action](https://github.com/DEM1323/patient-proxy/issues/11), PR #19 merged as `58148fc`** | Each of the eight approved actions records its selection and timing and reveals its authored observation. Reload preserves it. Retrying one request produces one occurrence; intentionally performing an action again produces another. | Deterministic observations and progression; authoritative event ordering; distinguish intentional repetition from transport replay; do not claim that selecting an action proves physical technique. Dialogue and actions extend the same interaction feature. |
| **Completed: [#13 End the Attempt once](https://github.com/DEM1323/patient-proxy/issues/13), PR #20 merged as `9a57587`** | Enforce the approved minimum interaction and explicit confirmation. Lose the ending response and retry: the same immutable Ended Attempt and terminal reason remain, and subsequent interaction is rejected. | Exactly-once terminal transition; concurrent commands and late AI completions; explicit outcome without performance claims. Integrate the minimum ending behavior already needed by #9 rather than creating competing lifecycle rules. |
| **Completed: [#14 Complete the Attempt Debrief](https://github.com/DEM1323/patient-proxy/issues/14), PR #21 merged as `d3de4d0`** | Ending starts recoverable feedback generation. The Learner explicitly answers or skips both Reflection Prompts before feedback is revealed. Submitted reflections append to the record. Retry a generation failure without changing the Ended Attempt or duplicating feedback. | No feedback leakage before the reflection requirement is satisfied; evidence links resolve to the pinned record; no invented events or scores; retries and append-only reflections. Use the approved feedback contract below. |
| **Completed: [#15 Revisit an Ended Attempt](https://github.com/DEM1323/patient-proxy/issues/15), PR #22 merged as `ade053b`** | A Learner lists and reopens their retained Ended Attempts and Debriefs. Another Learner's record is absent and inaccessible by identifier. | Ownership enforcement on list and detail queries; stable evidence across later Scenario edits; no Active Attempt resume action or recorded-content download. |
| **Now: [#16 Review an authorized Ended Attempt](https://github.com/DEM1323/patient-proxy/issues/16), Grok-reviewed with no blocking defects** | Faculty reviews an Ended Attempt through current shared Learning Group membership and current Scenario availability. Remove either permission and verify list/detail access is revoked. Test the same-institution Institutional Admin review variant. | Dynamic scope, immediate revocation, deduplicated list entries, Active Attempt and cross-institution denial. Institutional Admin review has institution-wide scope without inheriting other roles. |

This route follows the existing journey dependencies. Small shared prerequisites can be built where first needed; do not turn the whole route into a prerequisite architecture project or require unrelated tickets to close before useful work.

## Product details that must survive the handoff

`CONTEXT.md` is the local source for vocabulary and boundaries. Read the full issue/comment references when their feature becomes active.

Carry forward the limitations recorded in WAYFINDER without reopening completed reviews as ceremony. Ordinary Learner ending and restart retain their distinct terminal reasons; the self-service lifecycle slice adds access suspension through the same terminal-transition mechanism. The existing PACU provisioning command is only a transitional enrollment mechanism until group/availability controls ship.

- [Scenario decision #5](https://github.com/DEM1323/patient-proxy/issues/5#issuecomment-5283608771) defines Elena's curated 8–12-minute synthetic PACU encounter, Learner Brief, hidden authored facts, eight actions, and progression. Copy approved content from that source; do not substitute invented clinical facts or legacy behavior.
- Ordinary Learner ending is allowed after **three Learner turns OR one Learner turn plus one Clinical Action**, with confirmation. Essential-action omissions do not otherwise prevent ending; the authored natural endpoint is not a required success condition. Read the accepted contract when reconciling ordinary ending with restart or other terminal reasons; surface a real contradiction instead of silently changing policy.
- Formative Feedback must use the current communication-focused boundary in `CONTEXT.md`: evidence-linked feedback, no competency claim, and Clinical Action evaluation deferred. The older #5 objective-assessment wording should be reconciled with this later scope when working on #14; do not silently broaden the feedback into clinical scoring.
- The five feedback sections in the approved Scenario decision are an evidence-bounded encounter summary, evidence-linked strengths, evidence-linked priorities, objective-linked narrative with rationale, and two specific suggestions for another Attempt. Resolve the objective section against the current communication-only scope before implementation. Distinguish “not observed” from “performed incorrectly.”
- Interpretation and next-Attempt planning prompts precede feedback reveal. Learner Reflections are append-only and available to the Learner and authorized reviewers.
- The current Active Attempt route can recover interruption; there is no pause/resume product. Ended Attempts are immutable. Later reflections/feedback belong to the debrief record and do not reopen the Attempt.
- Backend Membership, ownership, additive roles, Pilot Institution scope, and current Learning Group authorization remain authoritative. Hiding a button alone is not authorization.
- Automatic 90/30-day deletion is an approved policy whose implementation is deferred beyond this alpha route. Do not claim deletion is already enforced or imply compliance certification.

Institution self-service is now in alpha scope. Keep institution creation/switching UI, Scenario authoring UI, invitation email delivery, WorkOS organization/SSO/SCIM migration, billing, LMS/LTI, advanced analytics, custom domains, AI-provider frameworks, design-system rewrites, and legacy removal outside these feature tasks. No production deployment is authorized by this handoff.

## Verification and final demonstration

Use focused tests for each change's actual risks: authorization, concurrency/replay, persistence, and lifecycle rules deserve executable evidence. Avoid tests that merely mirror rendering or implementation details.

Run applicable checks once for a completed feature: `npm run lint`, `npm test`, `npm run build` (includes typecheck). Rerun affected checks after a fix. Use the browser for the end-to-end demonstration. Report unavailable credentials, simulated provider responses, untested cases, and inherited failures plainly; mocked AI tests do not prove the live Gemini path.

The expanded alpha demonstration starts with the provisioned Institutional Admin. In Patient Proxy, add approved identities for all four roles (including additive roles), admit them, organize Learner and Faculty into a Learning Group, and make PACU available. Complete the Learner-to-feedback/history/review route and refresh to verify saved evidence. Then change roles, remove granting group membership or availability, and demonstrate immediate Faculty list/detail scope changes while Institutional Admin review remains institution-wide. Demonstrate deactivation with a valid sign-in, preserved records, and last-admin protection. Author assignment/recognition is demonstrated without claiming an authoring UI exists. After initial setup, routine participation and scope changes use Patient Proxy, with no Convex console intervention. Keep identities and secrets private; synthetic clinical data only. Local completion does not authorize production deployment or legacy cutover.

## Copyable review prompt

> Review the completed “Add a Member” slice on its working branch. Read AGENTS.md, CONTEXT.md, docs/alpha/WAYFINDER.md, and docs/alpha/HANDOFF.md, then the diff against merged alpha. Stay read-only and do not sync Convex. Check institution-scoped admin authorization on direct API calls, exact verified identity and stable one-time WorkOS binding, all four additive roles, transactional admission/revocation/retry behavior, safe migration preserving existing Memberships and records, explicitly designated first-admin bootstrap, private audit handling, and absence of environment-roster fallback. Check sign-in/refresh and navigation evidence; distinguish synthetic tests from a live demo. Report reproducible defects with trigger, consequence, location, and minimal verification, separately from polish. Preserve #9–#16 behavior. No production deployment.

## Copyable merge-and-start prompt

> Merge Patient Proxy PR #23 into alpha with a merge commit, then implement the “Add a Member” slice described in docs/alpha/HANDOFF.md. First read AGENTS.md, CONTEXT.md, docs/alpha/WAYFINDER.md, HANDOFF.md, and the full working/staged diff; preserve the five documentation edits and unrelated generated/.claude work. Recheck PR #23's head, base, review evidence, and checks. The last observed head was e313a9c; Vercel was failing, and its presumed legacy cause was not verified. Inspect changed state and any new defects; do not override required checks or branch protection. This prompt authorizes the merge when repository rules permit it; do not ask again just to reconfirm the already-selected scope or architecture. If merged already, verify and continue. Carry the documentation onto codex/institution-members from merged alpha and follow the implementation prompt below. No production deployment or WorkOS configuration changes.

## Copyable implementation-only prompt after PR #23 is merged

> Implement the next Patient Proxy alpha slice, “Add a Member,” in C:\Users\David.Martinez\Desktop\patient-proxy-alpha. Read AGENTS.md, CONTEXT.md, docs/alpha/WAYFINDER.md, docs/alpha/HANDOFF.md, docs/alpha/DEPLOYMENT.md, and the working/staged diff including relevant untracked files. Verify PR #23 has merged into alpha; preserve the documentation expansion and all existing work, then start codex/institution-members from merged alpha following the handoff. The owner approved institution self-service for an already-provisioned UMass Boston portal and selected a private Convex database Pilot Roster, WorkOS authentication, and Convex-enforced Membership and scope. Implement slice 1's Members page, pre-approval for all four additive roles, pending revocation, exact-identity first-sign-in binding, role-aware navigation, private audit, idempotent migration, and explicitly designated first-admin bootstrap. Preserve existing Membership IDs, WorkOS bindings, roles, and learning records; never print the roster or fall back to it after database cutover. Use the handoff's Given/When/Then cases. Choose routine details, coordinate before syncing shared dev, run applicable checks, and demonstrate sign-in/refresh with owner authentication when needed. Keep group/availability administration and existing-member lifecycle changes for their next slices. Update WAYFINDER with observed results and remaining demo needs. Do not build institution creation or Scenario authoring, change WorkOS configuration, merge other PRs, or deploy production. Do not include unrelated generated line-ending changes or .claude files in commits.

## A small handoff record

Use this in the existing current-status note when an agent stops or reaches its usage limit:

```text
Branch / commit:
Current feature and issue:
Working diff and untracked work to preserve:
Demonstrated behavior and exact demo steps:
Checks run and results (including existing failures):
Remaining blocker or untested behavior:
Next concrete action:
Running services / shared-backend coordination:
```

References: [alpha map #2](https://github.com/DEM1323/patient-proxy/issues/2), [approved story-map decision #12](https://github.com/DEM1323/patient-proxy/issues/12#issuecomment-5512203337), and the [story-map artifact](https://github.com/DEM1323/patient-proxy/blob/prototype/alpha-story-map/docs/alpha/alpha-story-map.prototype.md). Historical procedural language does not override the current shared guide or the user's instruction to work practically, one feature at a time.
