# Alpha current status

- **Branch / work to preserve:** `codex/institution-members`, from merged `alpha` at `e1095ca` (PR #23, #16 Faculty review, merged 2026-09-29 with a merge commit). The documentation expansion is committed as `e1d6709`. The "Add a Member" slice is implemented, committed, and open as a PR against `alpha`. Grok's review found one blocking defect, fixed before commit: a missing or blank `PILOT_ROSTER_JSON` was treated as an empty roster, so cutover could commit and permanently drop env-only pending identities. Cutover now refuses before any write when the roster is missing, blank, or invalid, with errors that contain no roster values (this also covers Grok's duplicate-email polish point). A repeat run now reports `already_cut_over` with `cutoverAt` instead of zero counts. A regression test covers unset, blank, malformed, and duplicate rosters with no writes. The admin tests, typecheck, and lint were rerun; the fix is pushed to dev, where the repeat run returned `already_cut_over` with the original time. Four generated-file line-ending changes and untracked `.claude/` are unrelated; do not stage, reset, or discard them.
- **Current task:** Institution self-service slice 1, **Add a Member** (see [HANDOFF.md](HANDOFF.md)). The alpha represents the pre-provisioned UMass Boston portal; the owner-approved architecture is a private Convex database Pilot Roster, WorkOS authentication, and Convex-enforced Membership and scope.
- **Slice 1 design:**
  - **Schema:** `rosterAuthority` (one-time cutover marker), `rosterEntries` (one per exact normalized identity: `pending`, `bound`, or `revoked`; bound entries keep binding history), and private `auditEvents`.
  - **Admission** (`convex/membershipAccess/model.ts`): an existing WorkOS binding always wins. After cutover, a pending entry for the server-verified email binds to one new Membership in the same transaction, with no fallback to `PILOT_ROSTER_JSON`. Before cutover, the environment path is unchanged.
  - **Operator commands** (`convex/institutionAdmin/operator.ts`, internal, admin key only):
    - `cutOverToDatabaseRoster` imports the environment roster inside Convex and switches admission atomically. It adds a bound entry for every existing Membership (including Members absent from the roster), never rewrites current roles, and imports unbound identities as pending. It is idempotent and returns counts only.
    - `bootstrapInstitutionalAdmin` grants the role to one explicitly designated Membership, preserving its other roles, and refuses once the institution has an Institutional Admin.
  - **Admin API** (`convex/institutionAdmin/access.ts`): `members` (Members plus pending approvals in the caller's institution), `preapprove` (exact identity with any nonempty combination of the four roles; a same-roles retry is a no-op; other institutions' identities return a non-disclosing `unavailable`), and `revoke` (pending only; a bound identity returns `already_member`). Every operation requires the caller's current Institutional Admin role and derives the institution from that Membership. Changes are audited with actor provenance and before/after values; audits never contain emails.
  - **UI:**
    - `/admin/members` (`src/alpha/features/institution-admin/`) behind an Institutional Admin gate, with a "Pre-approve identity" form that says no invitation is sent.
    - A role-aware header (`membership-access/navigation.tsx`) shows each implemented destination once.
    - The home page has "Manage Members" for Institutional Admin and a no-link note for Author.
- **Demonstrated behavior (2026-10-01):** Before the review fix: lint, 117 tests across 24 files (103 existing + 14 new), and build pass. With the fix there are 118 tests (15 new). The backend tests cover the handoff's acceptance cases:
  - migration, idempotency, and no role reconciliation or fallback
  - bootstrap
  - all-role pre-approval and retry
  - concurrent first-sign-in binding with the stable ID
  - unverified, lookalike, and second-account denial
  - revoke and the bind race
  - institution isolation and non-admin or anonymous denial
  - no approvals before cutover

  The 5 frontend tests cover navigation dedup, the Members page, and the gate. On dev `adorable-echidna-264`, with the owner's approval:
  - Cutover ran: 1 bound, 1 pending, 1 already present, one `roster_migrated` audit with counts only.
  - The owner's existing Membership was designated first Institutional Admin and now holds Learner plus Institutional Admin (audited).
  - In the browser, the existing session's header showed Home, Scenarios, Your Attempts, Review, and Members, and Home showed both journeys.
  - `/admin/members` pre-approved a synthetic identity with all four roles; it persisted across a reload and was then revoked.
  - Audits recorded the bootstrap, the pre-approval, and the revocation.
- **Not yet demonstrated live:** first sign-in of a newly pre-approved identity, and a denied sign-in on the database path, need a second Google account (owner interaction). Group enrollment still uses the transitional provisioning command.
- **Blockers:** None for review. Vercel fails on PRs (Vercel project "patient-proxy"; the repo root still has the legacy Next.js config; logs need Vercel CLI auth and were not inspected). Gemini free-tier 503s and 22 dependency audit findings remain inherited.
- **Next action:** Merge the slice 1 PR into `alpha` with a merge commit once the owner confirms. A live admission demo needs the owner to sign in with a pre-approved second account. Slice 2 (manage participation) follows. Keep generated line-ending files (`api.d.ts` excepted) and `.claude/` out of commits.

## Inherited limits to retain

- Slice 1: `unavailable` for another institution's identity reveals that the identity is held elsewhere, though not where. Pending roles change only by revoking and re-approving until slice 2.
- #16: authorized review identifies Learners by roster email; live Faculty review remains pending.
- #15: automatic 90/30-day retention deletion is deferred; history makes no deletion claim.
- #14: citations are checked for event existence, not semantic accuracy; suggestions can be uncited; "performed incorrectly" is not in the word check; generated prompts are not checked for restating feedback; reflections do not inform feedback; the serving model is not logged.
- #13: the ending minimum counts every recorded Learner message.
- #11: actions are permitted while a reply is pending; another click after a lost response records another occurrence; the concluding observation repeats slightly.
- #10: Retry is hidden before 60 seconds; unsent messages are lost on reload; patient replies have no output screening; blank messages or request IDs throw.
- #9: Start lacks request-level retry idempotency; reopening an owned Attempt does not recheck availability.

Read [AGENTS.md](../../AGENTS.md) and the working diff when switching tools. Durable decisions are in [CONTEXT.md](../../CONTEXT.md); operational setup and the cutover are in [DEPLOYMENT.md](DEPLOYMENT.md). Historical requirements remain in the [alpha map](https://github.com/DEM1323/patient-proxy/issues/2), linked issues, PRs, and Git history.
