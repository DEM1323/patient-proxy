# Alpha Deployment Spine

## Prerequisites

- Node.js 22 or newer
- A Convex account and project for cloud development or a local Convex deployment
- A Cloudflare account for production deployment

## Local setup

1. Install dependencies with `npm ci`.
2. If this machine is not authenticated, run `npx convex login` and complete browser sign-in using the account that has access to `umb/patient-proxy`. Keep login tokens in the CLI's credential store; do not paste them into chat or tracked files.
3. For the first connection from this checkout, run `npm run dev:backend -- --configure existing --team umb --project patient-proxy --dev-deployment cloud`. Reuse the existing development deployment and WorkOS configuration. **This command syncs local functions and schema to the shared development backend.** First coordinate with anyone using that deployment and check [current status](WAYFINDER.md); an older checkout can replace newer functions and remove indexes. Subsequent starts use `npm run dev:backend`.
4. Convex writes the deployment selector, public backend URL, and WorkOS settings from `convex.json` to ignored `.env.local`. Because the retained Next.js dependency may make it write `NEXT_PUBLIC_CONVEX_URL`, rename that key to `VITE_CONVEX_URL`, preserving its development URL. Keep only one backend URL key: leaving both aliases makes Convex warn and refuse automatic URL updates. Keep `VITE_WORKOS_REDIRECT_URI=http://localhost:5173/callback`; restart Vite after editing local configuration if it has not restarted automatically. Any CLI-generated cookie secret also stays in this ignored file.
5. In a second terminal, start the SPA with `npm run dev -- --host localhost --port 5173 --strictPort`. The ordinary `npm run dev` also defaults to port 5173; the explicit flags prevent silently switching to a port WorkOS does not allow. If 5173 is occupied, stop your prior frontend process first.
6. Open `http://localhost:5173/deployment-check` and verify every row reports ready or configured. The Cloudflare row reports configuration; it does not prove a local Vite request passed through Cloudflare.
7. Open `/`, choose **Sign in with Google**, and complete Google sign-in with an exact identity already approved in the development Pilot Roster. The callback should return to `/` and show that Member's assigned journeys. Reload and confirm those journeys and **Sign out** remain visible without another sign-in. A provider unit test checks `devMode`, but only this browser check demonstrates session persistence.

Do not fetch or display backend secret values to verify setup. WorkOS API keys, the private roster, and Gemini configuration stay in the existing protected Convex deployment. Only request missing configuration after identifying the specific failed check.

## Switching development tools

Open this checkout in Codex, Claude Code, or Cursor. All three use root [AGENTS.md](../../AGENTS.md); [CLAUDE.md](../../CLAUDE.md) imports it with `@AGENTS.md`. Cursor needs no duplicate rules file. See official [Codex instruction discovery](https://learn.chatgpt.com/docs/agent-configuration/agents-md), [Claude imports](https://code.claude.com/docs/en/memory), and [Cursor AGENTS.md support](https://cursor.com/docs/rules).

Before continuing in another tool, read the shared guide, [current status](WAYFINDER.md), and working diff. Simultaneous editing requires separate Git worktrees and branches. Each checkout needs its own ignored local environment; coordinate changes to a shared Convex development deployment too.

The legacy Next.js prototype remains available through `npm run dev:legacy`. It still requires its prior Supabase and Gemini environment variables.

## Verification

Run `npm run lint`, `npm test`, and `npm run build` once for the alpha baseline. Build already runs `npm run typecheck`; use standalone typecheck for focused edits rather than repeating it during the same baseline. Use `npx wrangler deploy --dry-run` to validate the Cloudflare bundle without publishing it. Keep environmental permission failures separate from code failures, and rerun only checks affected by a fix.

## Production

1. Deploy Convex and build the SPA with its production URL and public WorkOS configuration: `VITE_WORKOS_CLIENT_ID=client_01M0B87CY3Q8E21FXPX3ZZHZWK VITE_WORKOS_REDIRECT_URI=https://patient-proxy-alpha.dem1323.workers.dev/callback npx convex deploy --yes --cmd "npm run build" --cmd-url-env-var-name VITE_CONVEX_URL`.
2. Store Gemini only in Convex with `npx convex env set GOOGLE_GEMINI_API_KEY <value> --prod`. Never prefix this secret with `VITE_`.
3. Authenticate Wrangler with `npx wrangler login` or a scoped CI API token.
4. Publish the production-configured `dist` directory with `npx wrangler deploy`. Do not rebuild between steps 1 and 4 without setting `VITE_CONVEX_URL` again.

The provisioned alpha targets are:

- Convex team/project: `umb/patient-proxy`
- Convex development deployment: `adorable-echidna-264` at `https://adorable-echidna-264.convex.cloud` (check the current-status note before syncing)
- Convex production deployment: `little-elk-419` at `https://little-elk-419.convex.cloud`
- Cloudflare account: `Dem1323@outlook.com's Account` (`0811a789ae9a6d0fb3af833a80665403`)
- Cloudflare Worker: `patient-proxy-alpha` at `https://patient-proxy-alpha.dem1323.workers.dev`
- WorkOS development client: `client_01M0B769HEAC4CG1QQZQ2YB4GT`
- WorkOS production client: `client_01M0B87CY3Q8E21FXPX3ZZHZWK`

The alpha sign-in flow uses Google. Development allows
`http://localhost:5173/callback` with CORS from `http://localhost:5173`;
production allows
`https://patient-proxy-alpha.dem1323.workers.dev/callback` with CORS from the
hosted application origin. WorkOS API keys and `PILOT_ROSTER_JSON` exist only
as protected Convex deployment environment variables. The private roster is
present in development and production with distinct Learner and Faculty
identities; their emails are intentionally not documented.

The client-only AuthKit integration currently sets `devMode` because the
`workers.dev` alpha does not have a custom WorkOS authentication API domain.
This follows WorkOS guidance and stores the refresh token in browser local
storage so it survives the callback reload. Before handling production-grade
data, configure a custom authentication domain and remove `devMode` so WorkOS
can use its secure HTTP-only cookie mode.

`PILOT_ROSTER_JSON` uses this versioned shape. Emails are normalized only by
trimming whitespace and lowercasing; domains and aliases do not grant access.

```json
{
  "version": 1,
  "entries": [
    {
      "email": "approved-person@example.edu",
      "institutionKey": "umb",
      "roles": ["learner", "faculty"]
    }
  ]
}
```

Allowed additive roles are `learner`, `faculty`, `author`, and
`institutionalAdmin`. The alpha rejects duplicate emails, duplicate or unknown
roles, malformed entries, and institution keys other than `umb`. Never commit
the real roster or pass it through a `VITE_` variable.

For a controlled smoke test, verify an approved Learner, an unapproved identity,
and a Member with additive roles. Confirm the denied identity receives contact
instructions and that each assigned journey appears independently. Membership
and Pilot Institution scope must come from Convex; browser WorkOS role claims
are not application authorization.

`wrangler.jsonc` serves `dist` through Cloudflare Workers static assets. `not_found_handling: "single-page-application"` makes direct navigation to TanStack Router routes fall back to `index.html`.
