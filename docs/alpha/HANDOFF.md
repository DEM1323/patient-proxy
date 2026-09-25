# Patient Proxy: Grok / Claude handoff map

Prepared 2026-09-25. This is the repository's execution map for continuing while Codex is unavailable. [AGENTS.md](../../AGENTS.md) governs working practice, [CONTEXT.md](../../CONTEXT.md) defines product boundaries, and [WAYFINDER.md](WAYFINDER.md) holds the current status. This map supports those sources and the feature requirements. Codex does not need to approve each next step.

## Destination

An approved Learner completes Elena Ruiz's PACU encounter, receives useful evidence-linked Formative Feedback, and authorized Faculty reviews the saved Ended Attempt.

The practical route is: **start → converse → act → end → reflect and receive feedback → revisit → Faculty review**. Each stop produces a working demonstration. Use the existing issues as feature specs; no ticket-claiming ceremony or new architecture document is required.

## Where work stands

- Checkout: `C:\Users\David.Martinez\Desktop\patient-proxy-alpha`.
- Observed working branch: `codex/dev-setup`, based on `alpha` at `d664d1b`. Inspect the live branch and diff before continuing; this snapshot will age.
- **Issue #9 is implemented, reviewed, and committed.** Per the user's relayed Claude handoff, Grok reviewed it before commit and its fixes are included in `a3d64a6` (“Start the PACU Attempt (#9)”). Setup documentation is in `76c7975`; this map was added in `b7db8b8`. The next feature is #10. Confirm current branch/HEAD; another full #9 review is not a prerequisite for continuing. Revisit specific code when new changes or concrete evidence justify it.
- Claude's handoff reports typecheck, lint, 30 tests across 10 files, build, Wrangler dry run, and local start/reload/restart demonstrations. Codex verified the commits and recorded the reported review; it did not independently rerun that review. The four generated files with line-ending-only differences were left unstaged and were not pushed, per Claude's handoff; normalized Git diff showed no content changes. Preserve later work and avoid including this generated-file churn in unrelated commits. No production deployment occurred.
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

The integration target for this branch is `alpha`. Record the completed Grok review and validation in the PR; opening it does not require restarting that review or authorize production deployment. Check the live remote and reuse any existing PR. Further review should focus on new changes or concrete unresolved findings.

## Current handoff: #10 recoverable patient exchange

**Outcome:** On the existing Active Attempt route, the Learner can hold a grounded multi-turn conversation with Elena, refresh without losing recorded messages, and recover a failed or interrupted response without duplicate turns.

**Starting points:** `src/alpha/features/attempt-start/index.tsx` composes the Attempt route and reads `api.attemptStart.access.ownAttempt`; its view currently renders lifecycle events. `convex/attemptStart/access.ts` and `model.ts` enforce the existing read/start boundaries. `convex/schema.ts` already stores pinned `scenarioVersionId` and ordered `attemptEvents`, currently limited to start/end events. Extend this foundation with the interaction behavior; choose practical file and helper boundaries as needed.

**Acceptance and verification:**

1. An approved owning Learner sends a message to an Active Attempt. Convex records the message and enough request state to recover it, then obtains a patient response through protected backend Gemini code. Use the pinned Scenario Version, authored patient state, and preceding timeline. Keep hidden Clinical Truth and prompts out of browser-facing payloads.
2. Several turns remain consistent with prior recorded conversation and authored facts. Generated text does not establish new Clinical Truth or invent Scenario Observations. Use approved Scenario references; no Clinical Action UI or observation engine is required for this feature.
3. A timeout, malformed/empty response, interrupted request, or reload exposes a recoverable state. Retrying the same request records one Learner message and at most one patient response. A deliberate new message is a new request. Specify a simple concurrency policy that preserves ordering and prevents conflicting responses; Claude can choose its implementation.
4. Reloading the current route restores recorded messages and meaningful pending/failed state. Recovery does not create a second Attempt or add a pause/resume product.
5. New commands enforce backend identity, Learner ownership, Pilot Institution scope, and Active state. Test denied direct calls. If the Attempt ends or is restarted while generation is in flight, its late result must not append interaction to the Ended Attempt.
6. Demonstrate a live multi-turn exchange when the existing Gemini configuration is available. Separately test failure/retry, duplicate requests, ordering, reload persistence, late responses, and authorization. Clearly distinguish mocked provider tests from live verification. Report a missing backend credential without printing or moving it into frontend configuration.

**Scope:** Keep #9's completed behavior working. Its Start retry behavior and the policy for availability removal after Start are inherited limitations/questions, not reasons to automatically reopen the entire review. Ask a narrow product question only if one blocks a #10 command policy. Full Clinical Actions (#11), explicit Learner ending (#13), feedback/reflections (#14), history, and Faculty review remain later features. Use [issue #10](https://github.com/DEM1323/patient-proxy/issues/10) and its comments as the feature spec; this brief does not require a broad design document.

## Feature route and completion evidence

| Feature / source | Demonstration that earns completion | Grok's most useful review focus |
| --- | --- | --- |
| **Completed: [#9 Start the PACU Attempt](https://github.com/DEM1323/patient-proxy/issues/9), commit `a3d64a6`** | An approved Learner sees the currently Available Scenario, reads only the Learner Brief, and starts a persisted Learner-owned Attempt pinned to a Scenario Version. Reload of its current route restores the same Attempt. Starting again confirms and ends the prior run before creating another. | Grok review completed before commit, with fixes included per the user/Claude handoff. Preserve its authorization, pinning, and lifecycle behavior while extending interaction. |
| **Now: [#10 Hold a recoverable patient exchange](https://github.com/DEM1323/patient-proxy/issues/10)** | Complete several conversational turns grounded in the pinned authored state and prior timeline. Induce a timeout or interrupted response, retry, and show one Learner message and at most one patient response for that request. | Gemini stays in protected backend code; recoverable pending/failed states; malformed output; late responses after an Attempt ends; generated dialogue cannot create or alter Clinical Truth. Extend the actual #9 implementation. |
| **[#11 Take a recoverable Clinical Action](https://github.com/DEM1323/patient-proxy/issues/11)** | Each of the eight approved actions records its selection and timing and reveals its authored observation. Reload preserves it. Retrying one request produces one occurrence; intentionally performing an action again produces another. | Deterministic observations and progression; authoritative event ordering; distinguish intentional repetition from transport replay; do not claim that selecting an action proves physical technique. Dialogue and actions extend the same interaction feature. |
| **[#13 End the Attempt once](https://github.com/DEM1323/patient-proxy/issues/13)** | Enforce the approved minimum interaction and explicit confirmation. Lose the ending response and retry: the same immutable Ended Attempt and terminal reason remain, and subsequent interaction is rejected. | Exactly-once terminal transition; concurrent commands and late AI completions; explicit outcome without performance claims. Integrate the minimum ending behavior already needed by #9 rather than creating competing lifecycle rules. |
| **[#14 Complete the Attempt Debrief](https://github.com/DEM1323/patient-proxy/issues/14)** | Ending starts recoverable feedback generation. The Learner explicitly answers or skips both Reflection Prompts before feedback is revealed. Submitted reflections append to the record. Retry a generation failure without changing the Ended Attempt or duplicating feedback. | No feedback leakage before the reflection requirement is satisfied; evidence links resolve to the pinned record; no invented events or scores; retries and append-only reflections. Use the approved feedback contract below. |
| **[#15 Revisit an Ended Attempt](https://github.com/DEM1323/patient-proxy/issues/15)** | A Learner lists and reopens their retained Ended Attempts and Debriefs. Another Learner's record is absent and inaccessible by identifier. | Ownership enforcement on list and detail queries; stable evidence across later Scenario edits; no Active Attempt resume action or recorded-content download. |
| **[#16 Review an authorized Ended Attempt](https://github.com/DEM1323/patient-proxy/issues/16)** | Faculty reviews an Ended Attempt through current shared Learning Group membership and current Scenario availability. Remove either permission and verify list/detail access is revoked. Test the same-institution Institutional Admin review variant. | Dynamic scope, immediate revocation, deduplicated list entries, Active Attempt and cross-institution denial. Institutional Admin review has institution-wide scope without inheriting other roles. |

This route follows the existing journey dependencies. Small shared prerequisites can be built where first needed; do not turn the whole route into a prerequisite architecture project or require unrelated tickets to close before useful work.

## Product details that must survive the handoff

`CONTEXT.md` is the local source for vocabulary and boundaries. Read the full issue/comment references when their feature becomes active.

Carry forward Claude's disclosed #9 limitations: Start lacks request-level retry idempotency after a lost response; reopening an owned Attempt does not recheck Scenario availability; and `learner_restarted` is a distinct terminal reason with a proposed future exemption from normal ending guardrails and feedback. The completed review is not reopened by this list. Keep these visible when the related #10/#13/#14 behavior is implemented; a proposed future feedback exemption is not itself a new approved product policy. The provisioning command enrolls current Learner and Faculty Memberships into the PACU Pilot Learning Group and remains an operator concern.

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

> Prepare the bounded implementation handoff for Patient Proxy issue #10, “Hold a recoverable patient exchange.” Read AGENTS.md, CONTEXT.md, docs/alpha/WAYFINDER.md, this map's #10 brief, current Git status/diff, and issue #10 with comments. Grok already reviewed #9 before commit; its fixes are included in a3d64a6. Build on that completed work without repeating the whole review. Stay read-only and identify the smallest UI-to-Convex extension for persisted messages, pinned authored context, recoverable generation, request deduplication, ordered turns, and rejection of late results on Ended Attempts. Give Claude a compact brief with concrete acceptance examples, relevant code, and focused tests. Let Claude decide routine implementation details. Ask the user only about a consequential unresolved decision that actually blocks #10. Keep later features out of scope and do not deploy to production. Review #10's new diff after implementation.

## Copyable prompt for Claude after each Grok handoff

> Implement Patient Proxy issue #10, “Hold a recoverable patient exchange,” from the current working tree. Read AGENTS.md, CONTEXT.md, docs/alpha/WAYFINDER.md, this map's #10 brief, the full diff including untracked files, and issue #10 with comments. #9 is reviewed and committed in a3d64a6; preserve it and extend the existing Active Attempt route and timeline. Implement grounded multi-turn dialogue, protected backend Gemini calls, persisted recoverable request state, safe retries without duplicate messages, and authorization/Active-state checks including late completion. Choose routine technical details yourself. Use the following Grok brief as advisory analysis, verify against requirements, run appropriate checks, and demonstrate live behavior when configuration permits. Update the short current-status note with results, limitations, and the next action. Leave generated line-ending-only changes out of unrelated commits. No production deployment. Grok brief, if available: [paste brief].

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
