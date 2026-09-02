# Alpha Deployment Spine

## Prerequisites

- Node.js 22 or newer
- A Convex account and project for cloud development or a local Convex deployment
- A Cloudflare account for production deployment

## Local setup

1. Install dependencies with `npm ci`.
2. Configure and start Convex with `npm run dev:backend`. Choose a local or cloud development deployment. Convex writes `CONVEX_DEPLOYMENT`, `VITE_CONVEX_URL`, `VITE_WORKOS_CLIENT_ID`, and `VITE_WORKOS_REDIRECT_URI` to the ignored `.env.local` file. If it detects the retained Next.js dependency and writes `NEXT_PUBLIC_CONVEX_URL`, copy that public URL to `VITE_CONVEX_URL` for the replacement SPA.
3. In a second terminal, start the SPA with `npm run dev`.
4. Open `http://localhost:5173/deployment-check` and verify that every row reports ready or configured, then open `/` and sign in with an approved test identity.

The legacy Next.js prototype remains available through `npm run dev:legacy`. It still requires its prior Supabase and Gemini environment variables.

## Verification

Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`. Use `npx wrangler deploy --dry-run` to validate the Cloudflare bundle without publishing it.

## Production

1. Deploy Convex and build the SPA with its production URL and public WorkOS configuration: `VITE_WORKOS_CLIENT_ID=client_01M0B87CY3Q8E21FXPX3ZZHZWK VITE_WORKOS_REDIRECT_URI=https://patient-proxy-alpha.dem1323.workers.dev/callback npx convex deploy --yes --cmd "npm run build" --cmd-url-env-var-name VITE_CONVEX_URL`.
2. Store Gemini only in Convex with `npx convex env set GOOGLE_GEMINI_API_KEY <value> --prod`. Never prefix this secret with `VITE_`.
3. Authenticate Wrangler with `npx wrangler login` or a scoped CI API token.
4. Publish the production-configured `dist` directory with `npx wrangler deploy`. Do not rebuild between steps 1 and 4 without setting `VITE_CONVEX_URL` again.

The provisioned alpha targets are:

- Convex team/project: `umb/patient-proxy`
- Convex production deployment: `little-elk-419` at `https://little-elk-419.convex.cloud`
- Cloudflare account: `Dem1323@outlook.com's Account` (`0811a789ae9a6d0fb3af833a80665403`)
- Cloudflare Worker: `patient-proxy-alpha` at `https://patient-proxy-alpha.dem1323.workers.dev`
- WorkOS development client: `client_01M0B769HEAC4CG1QQZQ2YB4GT`
- WorkOS production client: `client_01M0B87CY3Q8E21FXPX3ZZHZWK`

AuthKit uses Google as its only primary sign-in method. Development allows
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
