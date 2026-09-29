# Alpha current status

- **Branch:** `codex/attempt-debrief`, created from `alpha` at `9a57587`. User confirmed this alpha as the development baseline; the earlier PACU schema/indexes are not being restored.
- **Current task:** [Complete the Attempt Debrief (#14)](https://github.com/DEM1323/patient-proxy/issues/14), implemented, demonstrated, and committed, with a PR open against `alpha`. Grok reviewed the diff before commit and found no blocking defects. Its optional polish: the two suggestions are free strings, so an invented fact there isn't rejected, and "performed incorrectly" is forbidden in the prompt but not in the performance-word check. See the #14 brief and the user's 2026-09-29 rulings in [HANDOFF.md](HANDOFF.md).
- **Completed** (details in each PR; no production deployment):
  - [#9](https://github.com/DEM1323/patient-proxy/issues/9) merged as `49535a8`.
  - [#10](https://github.com/DEM1323/patient-proxy/issues/10) merged through [PR #18](https://github.com/DEM1323/patient-proxy/pull/18) as `7c85223`.
  - [#11](https://github.com/DEM1323/patient-proxy/issues/11) merged through [PR #19](https://github.com/DEM1323/patient-proxy/pull/19) as `58148fc`.
  - [#13](https://github.com/DEM1323/patient-proxy/issues/13) merged through [PR #20](https://github.com/DEM1323/patient-proxy/pull/20) as `9a57587`.

  Grok found no blocking defects in any of them. Dev serves Scenario Version 2 with the Clinical Actions.
- **#14 design:**
  - `convex/attemptDebrief/` holds the `ownDebrief` query and the `reflect` and `retryFeedbackGeneration` mutations.
  - Ending with `learner_ended` starts one `formativeFeedback` row and a scheduled Gemini action (JSON mode, 30 s per request, `gemini-3.5-flash` then `gemini-3.1-flash-lite`). A 150 s deadline makes an interrupted generation retryable, and only the current generation may commit.
  - `parseFeedback` rejects output that:
    - is malformed or missing sections
    - cites events not in the timeline, or leaves a claim uncited (except a "not observed" priority or criterion)
    - makes a pass/fail, grade, or competency claim
  - The feedback prompt gets only recorded messages and Clinical Actions, never Clinical Truth, with communication-only rules.
  - Learner Reflections are append-only rows that store the prompt text as shown, with `clientRequestId` for idempotent retry. Skip is allowed only before a prompt's first response.
  - Feedback is withheld from `ownDebrief` until both prompts have an answer or skip.
  - The Scenario Version has an optional instructor-authored `debrief`, treated as the guidelines the feedback AI follows (user, 2026-09-29):
    - `feedbackGuidance` is free-form instructions placed in the feedback system prompt. The evidence rules take precedence.
    - `communicationCriteria` are listed in the system prompt and rated in section 4.
    - `reflectionPrompts` are fixed prompts.
  - Prompt source, in order: fixed authored prompts; then, with guidance only, the AI writes both prompts in the same generation call as the feedback; otherwise the generic platform defaults.
  - While generated prompts are pending, `ownDebrief` returns `preparing` (with `failed` to offer "Try again"), and `reflect` returns `not_available`. Generated prompts are stored on the feedback row and pass the same checks, including the performance-word check.
  - Dev has no authored `debrief`, so the defaults apply and the criteria section says none are set.
  - Restarted Attempts show "no Debrief". Evidence links jump to `#event-N` in the timeline.
- **Demonstrated behavior (#14, 2026-09-29):** Before the guidance follow-up: lint, 85 tests across 18 files (67 existing + 18 new), and build pass. The guidance follow-up adds 4 tests (guided prompt and validation, prompts held until generated with failure and retry, authored prompts preferred, and the preparing view). With it, lint, 89 tests across 18 files, and build pass, and it is pushed to dev. A live check of generated prompts could not run: Gemini returned 503 on both models. That path is covered only by mocked tests. Pushed to dev. A live Gemini check (outside the app, same prompt and validator) on the recorded timeline of Attempt `js7b7y…` returned feedback that `parseFeedback` accepted: five sections, every claim cited, a "not observed" priority, `criteria: null`, and no grade language.

  Browser demo on dev, new Attempt `js72qacfbp1rwn1n1mea65gqd58fbseq`:
  - Two live Elena replies; she didn't invent a date of birth, and after stabilization she reported nausea.
  - Five actions, then an escalation message, then End with confirmation.
  - The Debrief showed only the two default prompts while the backend feedback row was already `completed`.
  - Feedback stayed hidden after one answer and was revealed after the second prompt was skipped. It showed five sections, evidence links resolving to timeline anchors, a "Not observed" priority about her fear of choking, and "instructors have not set Communication Criteria". No grade language.
  - The reveal survived a reload. A later planning answer was appended after the skip.
  - Restarted Attempt `js7b7y…` shows "so it has no Debrief".
  - Dev data: one feedback row (generation 1), three reflection rows, and the Attempt's 11 events unchanged.

  The Chrome window was hidden, so the demo drove the page's own buttons and fields by script. The retry path after a failed generation was not induced live; tests cover it.
- **Limitations:**
  - From #14: feedback quality depends on prompt adherence. The validator checks that cited events exist, not that each claim accurately describes them; a "not observed" priority may still cite context events. Feedback does not use the Learner's reflections, and the serving model is not logged.
  - From #13: the ending minimum counts every recorded Learner message.
  - From #11: actions are allowed while a reply is pending; pressing an action again after a lost response records a new occurrence; the concluding observation repeats itself slightly.
  - From #10: no Retry before the 60 s deadline; an unsent message is lost on reload; no post-generation screening of patient replies; a blank message or empty request id throws.
  - From #9: Start has no request-level retry idempotency, and reload does not recheck availability.
- **Operator step:** No UI manages Learning Groups, Scenario availability, or authored Debrief content yet. `npx convex run attemptStart/pilotProvisioning:provision` idempotently publishes Initial PACU Assessment and enrolls current Learner and Faculty Memberships. The Convex watcher is not running; push backend changes with `npx convex dev --once`. A Vite server (not started by Claude) is serving port 5173.
- **Blockers:** None. The free-tier Gemini key regularly hits 503 "high demand"; a billing-enabled key would likely be more reliable. Open questions: how instructors will author Communication Criteria and Reflection Prompts (no authoring UI yet), Learning Group administration, and whether removing availability after Start should end the Active Attempt. The unchanged lock still reports 22 audit findings. The Vercel check fails on `alpha` and the PRs (probably the legacy Vercel project).
- **Next action:** Get Grok's review of the guidance follow-up commit on PR #21 (instructor `feedbackGuidance` and AI-generated Reflection Prompts, chosen by the user on 2026-09-29), then merge PR #21 into `alpha` with a merge commit once the user confirms. Keep `convex/_generated` files that differ only in line endings out of commits. Then #15 (Revisit an Ended Attempt). `GOOGLE_GEMINI_API_KEY` is set on dev (free tier; keep it out of `.env.local` and `VITE_`).

Read [AGENTS.md](../../AGENTS.md), this note, and the working diff when switching tools. Product boundaries remain in [CONTEXT.md](../../CONTEXT.md); startup commands are in [DEPLOYMENT.md](DEPLOYMENT.md). Historical decisions remain in the [alpha map](https://github.com/DEM1323/patient-proxy/issues/2), linked issues, and Git history (`d664d1b:docs/alpha/WAYFINDER.md`).
