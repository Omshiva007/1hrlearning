# Product Acceptance Audit

Date: 2026-10-28

## Business objective used for acceptance

1hrLearning must enable a free, reciprocal one-to-one knowledge exchange. A new user must be able to declare what they teach and learn, discover a relevant person, initiate or join a session, complete it, settle points, rate the experience, and control privacy and communications. An administrator must be able to safeguard and operate that lifecycle without direct database access.

Passing compilation or displaying an API response is not sufficient. A capability passes only when a persona can reach it through the interface, understand the next action, complete it, recover from failure, and observe the correct persistent state.

## Test personas and surfaces

- Alice: established learner/sharer (`alice@example.com`)
- Bob: reciprocal React learner (`bob@example.com`)
- Carol: public-session applicant persona (`carol@example.com`)
- Administrator: platform operator (`admin@1hrlearning.com`)
- User application: `http://localhost:3100`
- Admin application: `http://localhost:3101`
- Isolated API/data services: ports `4000`, `55432`, and `56379`

## Confirmed findings

| ID | Priority | Journey | Finding | Business impact | Reproduction |
|---|---|---|---|---|---|
| PA-001 | P0 | Discovery | Match score is multiplied twice and displays `9200%` for Carol. The UI also expects score-factor names that do not match the documented/backend factors. | Explainability and user trust are broken at the core matching decision. | Login as Alice → Discover → My Matches. |
| PA-002 | P0 | Private session | A match card only offers `View Profile`; the public profile has no `Send Interest` or `Request Session` action. Existing `/matches/[userId]/interest` and `/request` pages are unreachable from the normal journey. | A user can discover a match but cannot begin the exchange, so the primary business funnel stops before conversion. | Alice → Discover → Carol → View Profile. |
| PA-003 | P0 | Admin operations | Sessions, points, moderation, configuration, audit, analytics, and ads are generic read-only resource tables. Required override, edit, resolve, filter, reason, confirmation, and audit actions are absent. | Operators cannot safeguard or operate the lifecycle promised by the product. | Admin login → each navigation item named above. |
| PA-004 | P1 | Point economy | The seeded 60-minute public React session displays `0 pts` although the schema default and product documentation specify a non-zero session cost. | Test data teaches the wrong economic rule and cannot validate lock/transfer behavior through the UI. | Alice → My Sessions → React public session. |
| PA-005 | P1 | Admin comprehension | Dashboard demand/supply sections display truncated database skill IDs rather than skill names. Session inventory likewise exposes user and skill IDs with no drill-down. | Operators cannot make practical product decisions or identify affected people/topics. | Admin → Dashboard or Sessions. |
| PA-006 | P1 | Dev/test reliability | Running a production build while Next development servers remain active corrupts the shared `.next` output. Subsequent routes can fail with missing chunks or load without hydration until the dev server is restarted/reloaded. | Acceptance testing becomes intermittent and can produce false UI failures; the documented workflow lacks process isolation/ordering. | Start dev stack → run root build → open/login through the still-running dev app. |
| PA-007 | P1 | Authentication recovery | An expired frontend session can remain on a protected page until an API call triggers a failed refresh; the journey does not consistently provide a visible “session expired” explanation. | Users experience unexplained empty/stalled screens and lose confidence in saved work. | Retain an access session past expiry or invalidate its refresh token, then open Discover. |
| PA-008 | P2 | Test realism | Seeded ratings and session counts are randomized on first creation, and persona availability is a single generic future slot. | Screenshots and assertions are nondeterministic, while important empty/low-balance/no-availability scenarios are not represented. | Reseed a fresh database and compare persona metrics. |
| PA-009 | P2 | Admin UX | Privileged failures use browser `alert`/`confirm`, while generic pages initially show “No records found” during short loads. | Feedback is inconsistent, inaccessible, and can briefly misrepresent platform state. | Admin → Users/Skills mutations or quickly navigate among resource pages. |

## Verified working evidence

- Seeded Alice can authenticate and reach a dashboard backed by real user and point data.
- Canonical `/onboarding/profile`, `/share-side`, `/learn-side`, and `/availability` pages exist and reload saved persona data.
- Alice receives a reciprocal Carol match and self-exclusion holds.
- Alice can view her public session and its application panel.
- Privacy, discoverability, communication preference, and meeting-default controls are present.
- Admin authentication, role-gated navigation, live health metrics, user inventory, and skill inventory load.
- Automated transition-policy and real-database economy tests protect rollback, concurrency, and duplicate settlement.

## Final local acceptance evidence

- `npm run type-check`, `npm run test`, `npm run lint`, and the clean sequential `npm run build` pass across all workspaces.
- Prisma validation passes and all four migrations are applied to the isolated PostgreSQL service.
- `npm run test:acceptance` passes real-database rollback, concurrent acceptance, idempotent settlement, authentication rotation/logout, catalogue, availability, matching/privacy, public discovery/duplicate prevention, points, notifications, calendar, and admin authorization checks.
- Browser journeys pass Alice and Carol authentication, reciprocal discovery, private-request validation and profile return paths, future public-session discovery/application, and administrator dashboard/session/configuration workflows.
- Live acceptance found and fixed three additional defects: reusable public fixtures expiring between runs, action-button rendering recursively traversing React internals, and private-flow cancel links using an incompatible user-id profile route.

## Dependency and external-service position

Reviewed security updates removed critical findings and reduced the production audit to four transitive advisories: Next 15's bundled PostCSS and Bull's bundled UUID. npm only offers incompatible major framework/downgrade paths for those copies, so they are recorded for an explicit Next 16/queue migration rather than force-fixed. No vulnerable API is directly invoked by application code.

The local product lifecycle is accepted. On 2026-10-29, a Resend account and API key were configured through the administration panel and a sandbox message was confirmed in the account-owner Gmail inbox. Resend correctly rejected a Mailinator recipient while using its hosted test sender. Verified-domain configuration, branded-sender delivery, and webhook evidence remain deferred because they require DNS ownership.
