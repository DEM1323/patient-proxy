# Alpha current status

- **Branch:** `codex/attempt-history`, created from `alpha` at `d3de4d0`. User confirmed this alpha as the development baseline; the earlier PACU schema/indexes are not being restored.
- **Current task:** [Revisit an Ended Attempt (#15)](https://github.com/DEM1323/patient-proxy/issues/15), implemented, demonstrated, and committed, with a PR open against `alpha`. Grok reviewed the diff before commit and found no blocking defects. Its one polish point, "Debrief complete." showing even when feedback generation failed, was fixed before commit: the label now says the reflection questions are answered and points to the Attempt page for feedback. See the #15 brief in [HANDOFF.md](HANDOFF.md).
- **Completed** (details in each PR; Grok found no blocking defects in any; no production deployment):
  - [#9](https://github.com/DEM1323/patient-proxy/issues/9) merged as `49535a8`.
  - [#10](https://github.com/DEM1323/patient-proxy/issues/10) merged through [PR #18](https://github.com/DEM1323/patient-proxy/pull/18) as `7c85223`.
  - [#11](https://github.com/DEM1323/patient-proxy/issues/11) merged through [PR #19](https://github.com/DEM1323/patient-proxy/pull/19) as `58148fc`. Dev serves Scenario Version 2 with the Clinical Actions.
  - [#13](https://github.com/DEM1323/patient-proxy/issues/13) merged through [PR #20](https://github.com/DEM1323/patient-proxy/pull/20) as `9a57587`.
  - [#14](https://github.com/DEM1323/patient-proxy/issues/14) merged through [PR #21](https://github.com/DEM1323/patient-proxy/pull/21) as `d3de4d0`. It covers reflection before a gated reveal, append-only reflections, and validated communication-only feedback. It also makes instructor `debrief` content (feedback guidance, Communication Criteria, Reflection Prompts) the guidelines the feedback AI follows, with AI-written prompts when there is guidance only. Dev has no authored `debrief`, so the default prompts apply.
- **#15 design:**
  - `convex/learnerAttemptHistory/` adds `ownEndedAttempts`. It requires the Learner role and lists only the Learner's own Ended Attempts in their Pilot Institution (`by_learner_status`), newest first.
  - Each entry has scenario title and version, times, `endReason`, and a Debrief stage (`none` for restarts, `reflecting`, or `complete`). It says nothing about feedback content. Active Attempts are excluded.
  - Detail reuses `ownAttempt` and `ownDebrief`, which already restrict records to their owner.
  - UI: `/attempts` (`src/alpha/features/learner-attempt-history/`) links each record and, for deliberately ended Attempts, "Open the Attempt Debrief" (`#debrief-title`). The home page has a "Your Ended Attempts" link. There is no download, transcript, or resume control. `LearnerGate` is now exported from attempt-start.
- **Demonstrated behavior (#15, 2026-09-29):** Lint, 94 tests across 20 files (89 existing + 5 new), and build pass. Tests cover own-only listing (excluding the Active Attempt and another Learner's Attempt), newest-first order, Debrief stages, no feedback content in the list, detail denial for another Learner and for foreign or malformed ids, and Faculty denial. Pushed to dev. In the browser:
  - Home showed "Your Ended Attempts".
  - `/attempts` listed all six of the Learner's Ended Attempts newest first: one with both reflections done (then labeled "Debrief complete."), two awaiting reflection, and three restarts marked "No Debrief" with no Debrief link. No forbidden controls appeared.
  - "Open the Attempt Debrief" opened `js72qa…` at `#debrief-title`, read-only (no message box, End, or actions), with its Debrief and feedback.

  Another Learner's denial is test-covered only (one dev identity). The page was driven by script because the Chrome window was hidden.
- **Limitations:**
  - From #15: the approved 90/30-day retention deletion is not implemented (deferred), so history lists every Ended Attempt and makes no retention claim.
  - From #14: the validator checks that cited events exist, not that claims describe them; uncited suggestions; "performed incorrectly" isn't in the word check; generated prompts aren't checked for restating feedback; reflections aren't used by feedback; the serving model isn't logged.
  - From #13: the ending minimum counts every recorded Learner message.
  - From #11: actions are allowed while a reply is pending; an action pressed again after a lost response records a new occurrence; the concluding observation repeats itself slightly.
  - From #10: no Retry before the 60 s deadline; an unsent message is lost on reload; no screening of patient replies; a blank message or empty request id throws.
  - From #9: Start has no request-level retry idempotency, and reload does not recheck availability.
- **Operator step:** No UI manages Learning Groups, Scenario availability, or authored Debrief content yet. `npx convex run attemptStart/pilotProvisioning:provision` idempotently publishes Initial PACU Assessment and enrolls current Learner and Faculty Memberships. The Convex watcher is not running; push backend changes with `npx convex dev --once`. A Vite server (not started by Claude) is serving port 5173.
- **Blockers:** None. The free-tier Gemini key regularly hits 503 "high demand"; a billing-enabled key would likely be more reliable. Open questions: how instructors will author Debrief content (no authoring UI yet), Learning Group administration, and whether removing availability after Start should end the Active Attempt. The unchanged lock still reports 22 audit findings. The Vercel check fails on `alpha` and the PRs (probably the legacy Vercel project).
- **Next action:** Merge the #15 PR into `alpha` with a merge commit once the user confirms. Keep `convex/_generated` files that differ only in line endings out of commits. Then #16 (Review an authorized Ended Attempt). `GOOGLE_GEMINI_API_KEY` is set on dev (free tier; keep it out of `.env.local` and `VITE_`).

Read [AGENTS.md](../../AGENTS.md), this note, and the working diff when switching tools. Product boundaries remain in [CONTEXT.md](../../CONTEXT.md); startup commands are in [DEPLOYMENT.md](DEPLOYMENT.md). Historical decisions remain in the [alpha map](https://github.com/DEM1323/patient-proxy/issues/2), linked issues, and Git history (`d664d1b:docs/alpha/WAYFINDER.md`).
