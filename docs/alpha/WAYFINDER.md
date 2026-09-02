# Alpha Wayfinder

## Alpha outcome

An approved Learner at one Pilot Institution can complete one Simulated Patient Scenario end to end, and authorized Faculty can review the Ended Attempt. Pilot Institution isolation and recoverable behavior are verified. The canonical shared map is [Chart the route to the Patient Proxy pilot alpha](https://github.com/DEM1323/patient-proxy/issues/2).

## Next frontier

Implement [Start the PACU Attempt](https://github.com/DEM1323/patient-proxy/issues/9), the next behavior-first vertical slice.

## Delivery approach

- Use user story mapping to order work by the Learner and Faculty journeys.
- Use vertical slice architecture so each story owns its UI-to-Convex behavior rather than being split into horizontal technical layers.
- Use behavior-driven development: agree concrete Given/When/Then examples before implementing each slice, then automate them at the narrowest level that verifies the behavior.
- Deliver the agreed chain in order: enter the pilot; start the PACU Attempt; hold a recoverable patient exchange; take a recoverable Clinical Action; end the Attempt once; complete the Attempt Debrief; revisit an Ended Attempt; review an authorized Ended Attempt.
- Keep browser and Convex code grouped by feature. Routes compose feature entry points; protected Convex boundaries derive identity and institution scope.

## Verified completed behavior

- Legacy state inspected: Next.js 15.2.8, React 19, Supabase Google OAuth, and Gemini; Scenario state and Attempt Debrief behavior are not a reliable persistence baseline.
- Legacy production build fails without Supabase configuration, and legacy lint reports existing errors.
- The replacement Vite application builds and registers `/deployment-check` with TanStack Router.
- Cloudflare Workers local serving returns the SPA entry point for direct navigation to `/deployment-check`.
- Replacement type-checking, linting, tests, production build, and Wrangler deployment dry run pass.
- The production Convex deployment and Cloudflare Worker are provisioned; the hosted root, direct-route fallback, browser CORS, and Convex health query pass.
- Development and production WorkOS AuthKit environments use Google-only sign-in, approved redirect/CORS pairs, reachable JWKS endpoints, and private deployment-owned Pilot Rosters with distinct Learner and Faculty identities.
- The Learner and Faculty journeys are mapped into eight independently demonstrable vertical slices with concrete Given/When/Then acceptance examples and native blocking order.
- WorkOS authentication now enters Convex through a private exact-email Pilot Roster, binds Membership to the stable WorkOS user ID, and derives Pilot Institution scope without browser identity or role claims.
- Unapproved and unverified identities create no Membership and receive explicit Institutional Admin contact guidance; consumed roster identities cannot transfer to another WorkOS user.
- Additive roles render independently without inheritance, and the shared authorization boundary rejects roles or Pilot Institution scope not held by the current Member.
- The production Convex functions and Cloudflare SPA are deployed; hosted root, login, callback, deployment-check, and health boundaries pass smoke checks.

## Difficult-to-reverse decisions

- The alpha runtime is a Cloudflare-hosted Vite SPA with TanStack Router and Convex as its application backend.
- Institution-owned data must carry `institutionId`; Convex functions derive identity and enforce Membership/roles instead of trusting browser claims.
- Gemini and all secrets execute only in protected Convex functions.
- Legacy runtime remains until the replacement journey passes its checks.
- WorkOS AuthKit authenticates alpha users through Google and preserves a path to institutional OIDC/SAML.
- Authentication alone grants no access: a private Pilot Roster assigns each exact identity one Pilot Institution Membership with additive Learner, Faculty, Author, and Institutional Admin roles, then binds it to the stable WorkOS user ID.
- Attempt content is Learner-owned and automatically deleted 90 days after completion or, for incomplete Attempts, 30 days after last activity; the alpha offers no in-product downloads.
- Faculty review authorization is derived dynamically from current shared Learning Group membership, current Scenario availability, and Ended Attempt state; Institutional Admin analytics spans the Pilot Institution.
- The alpha Scenario is a curated 8-12-minute postoperative PACU encounter with Elena Ruiz for pre-licensure nursing Learners. Authored Clinical Actions reveal deterministic Scenario Observations; Simulated Patient dialogue and the Attempt Debrief must remain grounded in recorded evidence and make no competency claim.
- An Active Attempt is continuous rather than pausable: its current route may recover transport interruption, but the product offers no resume affordance; another simulation run is a new Attempt.
- Grounded multi-turn dialogue precedes Clinical Actions in delivery, while both remain increments of one `attempt-interaction` feature.
- Formative Feedback generation starts idempotently after ending but remains hidden until the Learner explicitly answers or skips both Reflection Prompts.
- The approved 90/30-day retention policy remains, but implementing and verifying automatic deletion is deferred beyond this alpha map.

## Known blockers

- The retained legacy Next.js/Supabase dependency tree has known audit findings; remove it at cutover after replacement checks pass.

## Next three actions

1. Implement [Start the PACU Attempt](https://github.com/DEM1323/patient-proxy/issues/9) through the replacement UI and Convex boundary.
2. Verify current Learning Group availability, Learner Brief isolation from Clinical Truth, pinned Scenario Version ownership, and cross-institution denial.
3. Demonstrate one new Active Attempt and the end-before-restart behavior before advancing to [Hold a recoverable patient exchange](https://github.com/DEM1323/patient-proxy/issues/10).
