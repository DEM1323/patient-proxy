# Patient Proxy working guide

This is the authoritative shared guide for Codex, Claude Code, and Cursor. Claude imports it through `CLAUDE.md`; Cursor uses this file directly. Keep shared instructions here, without a second Cursor rules system.

## Outcome and scope

An approved Learner completes Elena Ruiz's PACU encounter, receives useful evidence-linked Formative Feedback, and authorized Faculty reviews the saved Ended Attempt. Finish environment setup before feature development.

- Use the existing Vite, TanStack Router, React, Convex, and WorkOS stack. The alpha lives in `src/alpha/` and `convex/`; the retained Next.js/Supabase prototype is legacy.
- Deliver one demonstrable feature at a time, from UI through persistence and authorization. Choose routine technical details as needed; add abstractions or tests for concrete requirements and risks.
- GitHub issues provide requirements and historical decisions, not a mandatory ticket sequence. No wayfinding ceremony, claim-first write, or new planning document is required to begin authorized work.
- Preserve established product requirements and access boundaries in [CONTEXT.md](CONTEXT.md). Consult the relevant issue and domain references when changing behavior.

## Start, switch tools, and hand off

1. Read this guide, [current status](docs/alpha/WAYFINDER.md), and the working diff (`git status --short`, `git diff`, `git diff --cached`; inspect relevant untracked files too).
2. Preserve existing work. Start alpha work from the existing `alpha` baseline on a working branch, normally `codex/<task>`; do not reset or replace another tool's edits.
3. Sequential tool switches may use the same checkout. Simultaneous editing requires separate Git worktrees and branches. Coordinate any shared Convex development deployment before syncing backend changes.
4. Keep `docs/alpha/WAYFINDER.md` short: branch, current task, demonstrated behavior, blockers, next action. Distinguish observed results from assumptions and pending user interaction.

## Local development and checks

- Node.js 22+; install the locked dependencies with `npm ci`.
- Backend: `npm run dev:backend`. Reuse the existing `umb/patient-proxy` development project and WorkOS integration; see [DEPLOYMENT.md](docs/alpha/DEPLOYMENT.md).
- Frontend in another terminal: `npm run dev`. Open `http://localhost:5173/deployment-check`, then `/` for sign-in. Keep port 5173 for the configured WorkOS callback.
- Baseline: `npm run lint`, `npm test`, `npm run build` (includes `npm run typecheck`). Run standalone typecheck for focused edits. Run `npx wrangler deploy --dry-run` when validating the Cloudflare bundle; it does not publish.
- Run applicable checks once, record pre-existing failures separately from regressions, and rerun only affected checks after a fix. Verify sign-in and refresh in a browser when authentication changes; ask the user to complete interactive authentication when necessary.
- No production deployment as part of setup. `npm run deploy`, `convex deploy`, and production configuration changes require a deployment task.

## Credentials and access

- Keep local configuration in ignored `.env.local`. Only public configuration may use `VITE_`. Never print or commit tokens, API keys, the private Pilot Roster, or real patient data.
- WorkOS authenticates; Convex authorizes. Derive identity, Membership, roles, and Pilot Institution scope on the backend. Never trust browser role or institution claims.
- Membership requires a verified exact identity on the private Pilot Roster and is bound to the stable WorkOS user ID. Roles are additive without inheritance; institution-owned data carries `institutionId`.
- Keep WorkOS/Gemini API keys and `PILOT_ROSTER_JSON` in the protected Convex deployment. Use synthetic clinical data only. Preserve Learner ownership, hidden Clinical Truth, and dynamic Faculty review scope.

## References as needed

- [Grok / Claude feature handoff map](docs/alpha/HANDOFF.md) for the remaining alpha route and review prompts; keep current progress in `WAYFINDER.md`.
- [Domain vocabulary and product boundaries](CONTEXT.md); [domain documentation conventions](docs/agents/domain.md).
- [Issue tracker](docs/agents/issue-tracker.md); [triage labels](docs/agents/triage-labels.md) when triaging.
- [Alpha decisions and feature references](https://github.com/DEM1323/patient-proxy/issues/2); historical detail remains in Git history.
