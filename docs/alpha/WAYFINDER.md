# Alpha current status

- **Branch:** `codex/attempt-review`, created from `alpha` at `ade053b`. User confirmed this alpha as the development baseline; the earlier PACU schema/indexes are not being restored.
- **Current task:** [Review an authorized Ended Attempt (#16)](https://github.com/DEM1323/patient-proxy/issues/16), the last feature on the alpha route. Implemented and committed, with a PR open against `alpha`. Grok reviewed the diff before commit and found no blocking defects. Both of its wording points were fixed before commit: the review list intro now also states Institutional Admin's institution-wide scope, and reviewers see neutral "Instructors have not set…" wording instead of the Learner's "Your instructors…". See the #16 brief in [HANDOFF.md](HANDOFF.md).
- **Completed** (details in each PR; Grok found no blocking defects in any; no production deployment):
  - [#9](https://github.com/DEM1323/patient-proxy/issues/9) merged as `49535a8`.
  - [#10](https://github.com/DEM1323/patient-proxy/issues/10) merged through [PR #18](https://github.com/DEM1323/patient-proxy/pull/18) as `7c85223`.
  - [#11](https://github.com/DEM1323/patient-proxy/issues/11) merged through [PR #19](https://github.com/DEM1323/patient-proxy/pull/19) as `58148fc`. Dev serves Scenario Version 2 with the Clinical Actions.
  - [#13](https://github.com/DEM1323/patient-proxy/issues/13) merged through [PR #20](https://github.com/DEM1323/patient-proxy/pull/20) as `9a57587`.
  - [#14](https://github.com/DEM1323/patient-proxy/issues/14) merged through [PR #21](https://github.com/DEM1323/patient-proxy/pull/21) as `d3de4d0`. It covers reflection before a gated reveal, append-only reflections, and validated communication-only feedback. It also makes instructor `debrief` content (feedback guidance, Communication Criteria, Reflection Prompts) the guidelines the feedback AI follows, with AI-written prompts when there is guidance only. Dev has no authored `debrief`.
  - [#15](https://github.com/DEM1323/patient-proxy/issues/15) merged through [PR #22](https://github.com/DEM1323/patient-proxy/pull/22) as `ade053b`: a Learner-owned `/attempts` history of Ended Attempts linking to read-only records and Debriefs.
- **#16 design:**
  - `convex/attemptReview/` adds the `reviewableAttempts` and `reviewAttempt` queries. Scope is recomputed on every read, so revocation is immediate:
    - Institutional Admin: every Ended Attempt in their Pilot Institution (new `attempts` index `by_institution_status`).
    - Faculty: Ended Attempts whose Learner currently shares a Learning Group with them, where that group currently makes the Attempt's Scenario available.
  - Roles are additive and neither inherits the other; any other role is refused. Each Attempt is listed once.
  - Detail returns null for Active, cross-institution, malformed, and unauthorized ids. It shows the recorded timeline (via the new shared `buildAttemptView`), every Learner Reflection, and the Formative Feedback (`getDebriefRecord`; the Learner's reveal gate does not apply to review), plus the Learner's roster email. Never Clinical Truth.
  - `debriefStage` moved into attempt-debrief and is shared by history and review.
  - UI: `/review` and `/review/$attemptId` (`src/alpha/features/attempt-review/`) behind a Faculty-or-Institutional-Admin gate. They reuse the extracted `AttemptTimeline` (Learner labeled "Learner") and the exported `FeedbackSections`, and are read-only. Home shows "Review Ended Attempts" for Faculty and Institutional Admin.
- **Demonstrated behavior (#16, 2026-09-29):** Lint, 103 tests across 22 files (94 existing + 9 new), and build pass. Pushed to dev. Tests cover:
  - listing once across two granting groups, with evidence, reflections, and feedback
  - immediate revocation on group removal and on availability removal, with the Institutional Admin unaffected
  - nothing revealed for Active, cross-institution (including a stray cross-institution group row), or malformed ids
  - Institutional Admin review without group membership
  - Learner and unshared-Faculty denial, and the read-only UI

  In the browser, the Learner-only dev Membership got "Faculty or Institutional Admin role required" at `/review` and at `/review/<id>`, and the Learner home shows no review link. **Faculty and Institutional Admin review were not demonstrated live:** dev has only one Learner-only Membership, and adding a reviewer identity is a Pilot Roster change for the user.
- **Limitations:**
  - From #16: review identifies the Learner by roster email to authorized reviewers. Faculty and Institutional Admin review have not been demonstrated live (one Learner-only dev identity).
  - From #15: the approved 90/30-day retention deletion is not implemented (deferred), so history lists every Ended Attempt and makes no retention claim.
  - From #14: the validator checks that cited events exist, not that claims describe them; uncited suggestions; "performed incorrectly" isn't in the word check; generated prompts aren't checked for restating feedback; reflections aren't used by feedback; the serving model isn't logged.
  - From #13: the ending minimum counts every recorded Learner message.
  - From #11: actions are allowed while a reply is pending; an action pressed again after a lost response records a new occurrence; the concluding observation repeats itself slightly.
  - From #10: no Retry before the 60 s deadline; an unsent message is lost on reload; no screening of patient replies; a blank message or empty request id throws.
  - From #9: Start has no request-level retry idempotency, and reload does not recheck availability.
- **Operator step:** No UI manages Learning Groups, Scenario availability, or authored Debrief content yet. `npx convex run attemptStart/pilotProvisioning:provision` idempotently publishes Initial PACU Assessment and enrolls current Learner and Faculty Memberships. The Convex watcher is not running; push backend changes with `npx convex dev --once`. A Vite server (not started by Claude) is serving port 5173.
- **Blockers:** None. The free-tier Gemini key regularly hits 503 "high demand"; a billing-enabled key would likely be more reliable. Open questions: how instructors will author Debrief content (no authoring UI yet), Learning Group administration, and whether removing availability after Start should end the Active Attempt. The unchanged lock still reports 22 audit findings. The Vercel check fails on `alpha` and the PRs (probably the legacy Vercel project).
- **Next action:** Merge the #16 PR into `alpha` with a merge commit once the user confirms; that completes the alpha route. Then the final end-to-end demonstration. A live Faculty or Institutional Admin demo needs the user to add a reviewer identity to the dev Pilot Roster (`PILOT_ROSTER_JSON` on `adorable-echidna-264`) and sign in with it; Claude then reruns provisioning to enroll a new Faculty Membership. Keep `convex/_generated` files that differ only in line endings out of commits. `GOOGLE_GEMINI_API_KEY` is set on dev (free tier; keep it out of `.env.local` and `VITE_`).

Read [AGENTS.md](../../AGENTS.md), this note, and the working diff when switching tools. Product boundaries remain in [CONTEXT.md](../../CONTEXT.md); startup commands are in [DEPLOYMENT.md](DEPLOYMENT.md). Historical decisions remain in the [alpha map](https://github.com/DEM1323/patient-proxy/issues/2), linked issues, and Git history (`d664d1b:docs/alpha/WAYFINDER.md`).
