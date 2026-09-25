# Patient Proxy: Grok / Claude handoff map

Prepared 2026-09-25. This is the repository's execution map for continuing while Codex is unavailable. [AGENTS.md](../../AGENTS.md) governs working practice, [CONTEXT.md](../../CONTEXT.md) defines product boundaries, and [WAYFINDER.md](WAYFINDER.md) holds the current status. This map supports those sources and the feature requirements. Codex does not need to approve each next step.

## Destination

An approved Learner completes Elena Ruiz's PACU encounter, receives useful evidence-linked Formative Feedback, and authorized Faculty reviews the saved Ended Attempt.

The practical route is: **start → converse → act → end → reflect and receive feedback → revisit → Faculty review**. Each stop produces a working demonstration. Use the existing issues as feature specs; no ticket-claiming ceremony or new architecture document is required.

## Where work stands

- Checkout: `C:\Users\David.Martinez\Desktop\patient-proxy-alpha`.
- Observed working branch: `codex/dev-setup`, based on `alpha` at `d664d1b`. Inspect the live branch and diff before continuing; this snapshot will age.
- **Setup and issue #9 are committed.** Setup documentation is in `76c7975`; Claude's feature commit is `a3d64a6` (“Start the PACU Attempt (#9)”). The immediate next step is an independent review of `git diff 76c7975..a3d64a6`, not another implementation of #9. Confirm the current branch/HEAD before taking action.
- Claude's committed handoff reports typecheck, lint, 30 tests across 10 files, build, Wrangler dry run, and local start/reload/restart demonstrations. Codex verified the commits and read this report; it has not independently certified the new implementation. Inspect current Git status and preserve later work; the Convex watcher may also rewrite generated-file line endings.
- The user explicitly selected this alpha checkout as the development baseline. The earlier development schema/indexes are not to be restored merely because they once existed.
- Setup verification passed: typecheck, lint, 19 tests across 8 files, build, Wrangler dry run, backend health, approved Learner sign-in, and refresh persistence. An unapproved identity was denied. These results predate Claude's feature edits and do not certify the new code.
- The unchanged dependency lock reported 22 audit findings (5 low, 6 moderate, 10 high, 1 critical). Avoid folding an unrelated dependency upgrade into a feature.
- Vite and the Convex watcher were left running. Check before starting duplicate services. Local app: `http://localhost:5173/`; health page: `/deployment-check`.
- Existing backend: `umb/patient-proxy`, development deployment `adorable-echidna-264`. WorkOS and ignored `.env.local` are configured. Credentials remain in their existing local/backend stores.

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

For the current feature, the recommended review target is a draft PR from `codex/dev-setup` into `alpha`. Include the setup and handoff documentation with #9, resolve blocking review findings, and merge when the feature is accepted. Opening a PR does not authorize production deployment. At this handoff's repository import, the branch had not been pushed and no PR existed; check the live remote before creating one.

## Feature route and completion evidence

| Feature / source | Demonstration that earns completion | Grok's most useful review focus |
| --- | --- | --- |
| **Now: review [#9 Start the PACU Attempt](https://github.com/DEM1323/patient-proxy/issues/9), commit `a3d64a6`** | An approved Learner sees the currently Available Scenario, reads only the Learner Brief, and starts a persisted Learner-owned Attempt pinned to a Scenario Version. Reload of its current route restores the same Attempt. Starting again confirms and ends the prior run before creating another. | Availability checked at the command boundary; hidden Clinical Truth omitted from browser responses; ownership and institution isolation; duplicate clicks/retries/concurrent tabs; atomic end-before-restart. Review the completed commit before extending it. |
| **Next: [#10 Hold a recoverable patient exchange](https://github.com/DEM1323/patient-proxy/issues/10)** | Complete several conversational turns grounded in the pinned authored state and prior timeline. Induce a timeout or interrupted response, retry, and show one Learner message and at most one patient response for that request. | Gemini stays in protected backend code; recoverable pending/failed states; malformed output; late responses after an Attempt ends; generated dialogue cannot create or alter Clinical Truth. Extend the actual #9 implementation. |
| **[#11 Take a recoverable Clinical Action](https://github.com/DEM1323/patient-proxy/issues/11)** | Each of the eight approved actions records its selection and timing and reveals its authored observation. Reload preserves it. Retrying one request produces one occurrence; intentionally performing an action again produces another. | Deterministic observations and progression; authoritative event ordering; distinguish intentional repetition from transport replay; do not claim that selecting an action proves physical technique. Dialogue and actions extend the same interaction feature. |
| **[#13 End the Attempt once](https://github.com/DEM1323/patient-proxy/issues/13)** | Enforce the approved minimum interaction and explicit confirmation. Lose the ending response and retry: the same immutable Ended Attempt and terminal reason remain, and subsequent interaction is rejected. | Exactly-once terminal transition; concurrent commands and late AI completions; explicit outcome without performance claims. Integrate the minimum ending behavior already needed by #9 rather than creating competing lifecycle rules. |
| **[#14 Complete the Attempt Debrief](https://github.com/DEM1323/patient-proxy/issues/14)** | Ending starts recoverable feedback generation. The Learner explicitly answers or skips both Reflection Prompts before feedback is revealed. Submitted reflections append to the record. Retry a generation failure without changing the Ended Attempt or duplicating feedback. | No feedback leakage before the reflection requirement is satisfied; evidence links resolve to the pinned record; no invented events or scores; retries and append-only reflections. Use the approved feedback contract below. |
| **[#15 Revisit an Ended Attempt](https://github.com/DEM1323/patient-proxy/issues/15)** | A Learner lists and reopens their retained Ended Attempts and Debriefs. Another Learner's record is absent and inaccessible by identifier. | Ownership enforcement on list and detail queries; stable evidence across later Scenario edits; no Active Attempt resume action or recorded-content download. |
| **[#16 Review an authorized Ended Attempt](https://github.com/DEM1323/patient-proxy/issues/16)** | Faculty reviews an Ended Attempt through current shared Learning Group membership and current Scenario availability. Remove either permission and verify list/detail access is revoked. Test the same-institution Institutional Admin review variant. | Dynamic scope, immediate revocation, deduplicated list entries, Active Attempt and cross-institution denial. Institutional Admin review has institution-wide scope without inheriting other roles. |

This route follows the existing journey dependencies. Small shared prerequisites can be built where first needed; do not turn the whole route into a prerequisite architecture project or require unrelated tickets to close before useful work.

## Product details that must survive the handoff

`CONTEXT.md` is the local source for vocabulary and boundaries. Read the full issue/comment references when their feature becomes active.

For the immediate #9 review, Claude's own handoff calls out three points to assess against the requirements: Start lacks request-level retry idempotency after a lost response; reopening an owned Attempt does not recheck Scenario availability; and `learner_restarted` is a distinct terminal reason with a proposed future exemption from normal ending guardrails and feedback. These are disclosed implementation choices or open questions, not independently verified defects. Determine which are concrete blockers and which need a narrow product decision before #10/#13/#14. The provisioning command enrolls current Learner and Faculty Memberships into the PACU Pilot Learning Group; check that it stays an appropriately protected operator action.

- [Scenario decision #5](https://github.com/DEM1323/patient-proxy/issues/5#issuecomment-5283608771) defines Elena's curated 8–12-minute synthetic PACU encounter, Learner Brief, hidden authored facts, eight actions, and progression. Copy approved content from that source; do not substitute invented clinical facts or legacy behavior.
- Ordinary Learner ending is allowed after **three Learner turns OR one Learner turn plus one Clinical Action**, with confirmation. Essential-action omissions do not otherwise prevent ending; the authored natural endpoint is not a required success condition. Read the accepted contract when reconciling ordinary ending with restart or other terminal reasons; surface a real contradiction instead of silently changing policy.
- Formative Feedback must use the current communication-focused boundary in `CONTEXT.md`: evidence-linked feedback, no competency claim, and Clinical Action evaluation deferred. The older #5 objective-assessment wording should be reconciled with this later scope when working on #14; do not silently broaden the feedback into clinical scoring.
- The five feedback sections in the approved Scenario decision are an evidence-bounded encounter summary, evidence-linked strengths, evidence-linked priorities, objective-linked narrative with rationale, and two specific suggestions for another Attempt. Resolve the objective section against the current communication-only scope before implementation. Distinguish “not observed” from “performed incorrectly.”
- Interpretation and next-Attempt planning prompts precede feedback reveal. Learner Reflections are append-only and available to the Learner and authorized reviewers.
- The current Active Attempt route can recover interruption; there is no pause/resume product. Ended Attempts are immutable. Later reflections/feedback belong to the debrief record and do not reopen the Attempt.
- Backend Membership, ownership, additive roles, Pilot Institution scope, and current Learning Group authorization remain authoritative. Hiding a button alone is not authorization.
- Automatic 90/30-day deletion is an approved policy whose implementation is deferred beyond this alpha route. Do not claim deletion is already enforced or imply compliance certification.

Keep authoring UI, billing, LMS/LTI, institution self-service, advanced analytics, custom domains, AI-provider frameworks, design-system rewrites, and legacy removal outside these feature tasks. No production deployment is authorized by this map.

## Verification and final demonstration

Use focused tests for each change's actual risks: authorization, concurrency/replay, persistence, and lifecycle rules deserve executable evidence. Avoid tests that merely mirror rendering or implementation details.

Run applicable checks once for a completed feature: `npm run lint`, `npm test`, `npm run build` (includes typecheck). Rerun affected checks after a fix. Use the browser for the end-to-end demonstration. Report unavailable credentials, simulated provider responses, untested cases, and inherited failures plainly; mocked AI tests do not prove the live Gemini path.

The final alpha demonstration is one approved Learner completing the entire route, refreshing to verify saved evidence, reflecting and receiving evidence-linked feedback, reopening the Ended Attempt, and authorized Faculty reviewing that same record. Also demonstrate denied identities, foreign records, and removal of Faculty scope. Use existing approved test identities; keep roster values and credentials private. Local completion does not itself authorize production deployment or legacy cutover.

## Copyable prompt for Grok

> Continue as the analysis and review partner using this Patient Proxy handoff map. First read AGENTS.md, CONTEXT.md, docs/alpha/WAYFINDER.md, current Git status/diff, and issue #9 with comments. Claude committed setup as 76c7975 and #9 as a3d64a6. Stay read-only and review git diff 76c7975..a3d64a6 against the acceptance requirements. Treat Claude's test/demo report as reported evidence, not an independent review. Check the disclosed retry, availability, restart-policy, and provisioning points in this map. Return reproducible blocking findings separately from optional improvements, with file/line references and minimal verification. Give me a compact Claude prompt to fix any blockers. Once #9 is accepted, prepare the next bounded brief for #10 using the actual implementation. Let Claude choose routine technical details; ask me only about consequential unresolved product/access decisions or necessary configuration. Preserve the confirmed alpha baseline and do not start production deployment.

## Copyable prompt for Claude after each Grok handoff

> Continue from the current working tree. Read AGENTS.md, CONTEXT.md, docs/alpha/WAYFINDER.md, the full diff including untracked files, and the next feature's issue/comments. Preserve existing setup and feature work. Use the following Grok brief as advisory analysis; verify it against the code and established requirements. Implement one demonstrable feature end to end, choose routine technical details yourself, fix concrete review findings, run appropriate checks, and provide local demo steps. Update the short current-status note with verified results, limitations, and the next action. Do not deploy to production. Here is the brief: [paste Grok's brief or review findings].

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
