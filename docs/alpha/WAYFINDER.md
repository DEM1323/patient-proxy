# Alpha current status

- **Branch:** `codex/clinical-action`, created from `alpha` at `7c85223`. User confirmed this alpha as the development baseline; the earlier PACU schema/indexes are not being restored.
- **Current task:** [Take a recoverable Clinical Action (#11)](https://github.com/DEM1323/patient-proxy/issues/11), implemented, demonstrated, and committed on `codex/clinical-action`, with a PR open against `alpha`. Grok reviewed the diff before commit and found no blocking defects; it did not rerun the suite or the live Attempt. See the #11 brief in [HANDOFF.md](HANDOFF.md).
- **#11 design:** The eight actions, their observation rules, and progression stages are authored content in `clinicalTruth.clinicalActions`, so they are pinned with the Scenario Version. The user's 2026-09-25 rulings:
  - SpO2 improves only after both airway positioning and oxygen/monitoring, in either order. Until then vitals stay at arrival values, shown as "93% on oxygen" once oxygen is applied.
  - Identifier verification confirms a match without values.
  - Nausea is reported at stabilization, and an emesis basin afterwards concludes the progression.

  `convex/attemptInteraction/clinicalActions.ts` replays recorded actions to compute the stage and observation deterministically. The `takeAction` mutation stores each occurrence with its revealed observation and `clientRequestId`: the same id returns the recorded occurrence, and a new id is an intentional repeat. `ownAttempt` returns action labels and revealed observations only. Elena's prompt now uses the reached stage's state and includes actions as nurse-side notes. Provisioning publishes a new Scenario Version when authored content changes: dev is on v2, and Attempts on v1 keep no actions.
- **Demonstrated behavior (#11, 2026-09-25):** Lint, 57 tests across 14 files (45 existing + 12 new), and build pass. Tests cover:
  - the approved action list and each progression rule
  - retry idempotency versus intentional repeats
  - stage-aware prompts, version pinning, and hidden rules
  - denial for Faculty, another Learner, malformed ids, unknown actions, and Ended Attempts

  Live on dev: a new Attempt `js7b7y4ee8jw54v7461tt03p5h8f3907` on v2 (Start again ended `js7c4x…` as `learner_restarted`).
  - Hand hygiene, identifiers, and vitals (93% room air) were recorded, then oxygen and vitals again (93% on oxygen).
  - Airway positioning revealed the stabilization and nausea announcement.
  - Elena's live reply: "My stomach... it feels really sick. I'm afraid I'm going to be sick."
  - The emesis basin concluded the progression, and final vitals showed 98% on oxygen.
  - A reload restored all 11 events in order, with unique request ids.

  Lost-response retry was not induced in the browser; it is covered by backend and frontend tests.
- **Completed:** [#9](https://github.com/DEM1323/patient-proxy/issues/9) merged into `alpha` as `49535a8` (feature `a3d64a6`). [#10](https://github.com/DEM1323/patient-proxy/issues/10) merged through [PR #18](https://github.com/DEM1323/patient-proxy/pull/18) as `7c85223` (feature `d1bf0a4`). Grok's review on PR #18 found no blocking defects; its non-blocking items (hidden Retry before the 60 s deadline, no post-generation screening, blank message or empty request id throwing instead of returning a status) remain open. No production deployment.
- **#10 design:** `convex/attemptInteraction/` holds `send`/`retry` mutations and a scheduled Gemini action (key in the Convex env only). Messages and open exchange state (`pending`/`failed`) are read through `ownAttempt`. One exchange may be open per Attempt, and a `clientRequestId` never records a second Learner message. Only the current `generation` may commit, and only while Active. A 60 s deadline makes an interrupted reply retryable, and late replies append nothing. Models: `gemini-3.5-flash`, retried once on 503, then `gemini-3.1-flash-lite` (`gemini-2.5-flash` returns 404 for new keys; the free tier limits `gemini-3.8-flash`). The prompt uses the Learner Brief, `clinicalTruth.initialState`, and prior messages. `progression` is withheld until #11.
- **Demonstrated behavior (#10, 2026-09-25):** Lint, 45 tests across 13 files, and build pass (Gemini mocked in unit tests). Live on dev `adorable-echidna-264`, in Attempt `js7c4xkb780jy8dz3h78e2rcd98f3104`:
  - The missing-key, 404, and 503 failures each showed Retry with one recorded Learner message.
  - After the fallback change, Retry produced "I... I'm not sure. Where am I?", and two more turns stayed consistent with the authored state (5/10 aching pain, cold).
  - Asked about oxygen and nausea, Elena invented no vitals and did not reveal the later nausea.
  - A reload while a reply was pending restored the pending state, then the reply.
  - Dev events 1–7 alternate in order, and the first message took 5 generations with no duplicates.
- **Limitations:** From #11: actions are allowed while a reply is pending, so a reply generated from the earlier state can land after a newer action. After a lost response, pressing the same action button again (instead of Retry action) records a new occurrence even if the first write landed; Grok listed this as optional polish. The concluding observation repeats itself slightly ("positioned for nausea… positioned safely with an emesis basin at hand"); changing that wording publishes v3. Inherited from #9: Start has no request-level retry idempotency, and reload does not recheck availability. From #10: a pending reply shows no Retry before its 60 s deadline; a message whose send never reached the server is lost on reload; grounding is prompt-based with no post-generation screening; the serving model is not logged.
- **Operator step:** No UI manages Learning Groups or Scenario availability yet. `npx convex run attemptStart/pilotProvisioning:provision` idempotently publishes Initial PACU Assessment v1, makes it available to the "PACU Pilot" Learning Group, and enrolls all current Learner and Faculty Memberships. Run on `adorable-echidna-264` (1 Membership enrolled); rerun after admitting new Members. The Convex watcher is not running; push backend changes with `npx convex dev --once`.
- **Blockers:** None. Open questions: how Learning Group membership should be administered beyond the provisioning command, and whether removing availability after Start should end the Active Attempt (an "access suspension" ending). The unchanged lock still reports 22 audit findings (5 low, 6 moderate, 10 high, 1 critical). The Vercel check fails on `alpha` and on PR #18; the alpha deploys to Cloudflare, so this is probably the legacy Vercel project (logs not inspected).
- **Next action:** Merge the #11 PR into `alpha` with a merge commit once the user confirms. Then continue with #13 (End the Attempt once). Keep the four line-ending-only generated files (`api.js`, `dataModel.d.ts`, `server.d.ts`, `server.js`) out of commits. `GOOGLE_GEMINI_API_KEY` is set on dev (free tier; keep it out of `.env.local` and `VITE_`). `codex/dev-setup` and `codex/patient-exchange` are merged and can be deleted.

Read [AGENTS.md](../../AGENTS.md), this note, and the working diff when switching tools. Product boundaries remain in [CONTEXT.md](../../CONTEXT.md); startup commands are in [DEPLOYMENT.md](DEPLOYMENT.md). Historical decisions remain in the [alpha map](https://github.com/DEM1323/patient-proxy/issues/2), linked issues, and Git history (`d664d1b:docs/alpha/WAYFINDER.md`).
