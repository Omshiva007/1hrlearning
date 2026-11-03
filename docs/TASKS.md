# Active Substantial Work

## Objective

Complete and verify 1hrLearning as a free one-to-one knowledge-exchange platform. A learner must be able to register, declare what they can teach and want to learn, discover a reciprocal match, arrange and complete a session, settle points correctly, rate the experience, and manage privacy and notifications. Administrators must be able to operate and safeguard that lifecycle.

## Definition of done

- Two seeded users can complete the private and public session journeys end to end.
- Registration always enters a recoverable onboarding flow before normal product use.
- Session authorization, transitions, availability, meeting-link visibility, and point movements preserve their invariants under success, rejection, cancellation, retry, and failure.
- User-facing failures are actionable and no production screen displays invented data, dead controls, or raw placeholder administration.
- Admin users can perform the operational actions exposed by the backend.
- The documented Windows and CI commands run reliably: type-check, tests, builds, Prisma validation, migration, seed, API integration tests, and browser workflow tests.
- Hosted frontend and admin builds use hosted service URLs rather than localhost defaults.

## Sequential prioritized task list

### Provider-neutral transactional email (2026-10-16)

- [x] **EM-001 Decouple business workflows from email vendors**
  - Existing welcome, session, points, lifecycle, and moderation triggers call a provider-neutral service.
- [x] **EM-002 Add runtime-selectable Resend and SendGrid adapters**
  - Administrators can retain independent provider credentials and switch the active adapter without code or deployment changes.
- [x] **EM-003 Protect email credentials and configuration changes**
  - API keys use AES-256-GCM under `EMAIL_CREDENTIAL_ENCRYPTION_KEY`, are never returned to the browser or audit log, and configuration changes require an audit reason.
- [x] **EM-004 Add administrative configuration and delivery test controls**
  - Platform Configuration exposes provider status, masked credential hints, sender identity, activation, and an explicit test-email action.
- [ ] **EM-005 Apply migration and verify real provider delivery**
  - Apply the reviewed migration, configure a verified sender domain/API key, exercise delivery and failure behavior, and retain provider webhook evidence.
  - Progress 2026-10-29: migration applied; Resend API key encrypted through Admin; hosted-sender delivery confirmed in the account-owner Gmail inbox; unverified-domain rejection for a Mailinator recipient confirmed. Production domain verification, branded-sender delivery, and webhook evidence remain.

### Product acceptance remediation (2026-10-15)

- [x] **PA-001 Correct matching score presentation and explanations**
  - Display the backend's 0–100 fitment score directly and use the shared score-factor contract.
  - Verify no score can render below 0% or above 100%.
  - Verified 2026-10-15: the API returned Carol's normalized score as 92 and the UI now clamps/displays that 0–100 value without multiplying it again; frontend type-check and lint passed.
- [x] **PA-002 Connect discovery to interest and private-session actions**
  - Add reachable, authenticated calls to action from match cards and public profiles.
  - Preserve the target user and selected teaching skill through each flow.
  - Verified 2026-10-15: match cards and Carol's public profile expose interest and direct-request actions using her immutable user id; browser navigation reached the interest route.
- [x] **PA-003 Replace generic admin resources with operational workflows**
  - Implement session overrides, point/config edits, moderation decisions, audit filters, analytics views, and recommendation lifecycle controls.
  - Implemented 2026-10-15: seven generic pages were replaced by dedicated filtered views and mutation forms; state-changing session/config/moderation/recommendation actions expose server validation, pending state, accessible results, and required audit context. Admin type-check and lint pass.
- [x] **PA-004 Make seeded point economics deterministic and correct**
  - Repair the sample session cost and deterministic persona ratings/session counts.
  - Verified 2026-10-15: a repair seed changed the pending 60-minute fixture to 10 required points; the sessions UI now distinguishes required points from settled points.
- [x] **PA-005 Replace admin identifiers with meaningful names and drill-downs**
  - Verified 2026-10-15: dashboard topic aggregates now include skill names and generic operational tables prioritize related teacher, learner, and skill labels over foreign keys; backend/admin type-check and admin lint passed.
- [x] **PA-006 Isolate or sequence development and production build artifacts**
  - Verified 2026-10-15: frontend and admin use `.next-dev` for development and `.next` for production; a production frontend build passed while both development servers remained healthy on ports 3100 and 3101.
- [x] **PA-007 Add explicit expired-session recovery**
  - Implemented 2026-10-15: concurrent Auth.js callbacks share a single refresh-token rotation, failed refresh removes the unusable access token, protected routes redirect to an explanatory login state, and the frontend type-check/lint pass.
- [x] **PA-008 Expand deterministic acceptance personas and edge-case fixtures**
  - Implemented 2026-10-15: meeting ids and experience values are stable across seed runs; non-discoverable and zero-balance personas were added and successfully installed into the isolated database.
- [x] **PA-009 Standardize accessible mutation/loading/error feedback**
  - Implemented 2026-10-15: blocking browser dialogs were removed from admin user/skill and user-profile skill mutations; in-page confirmations, pending controls, and `status`/`alert` announcements now expose outcomes accessibly.

### P0 — Establish a reproducible test environment

These tasks unblock every data-backed acceptance test and must be completed first.

- [x] **P0.1 Provision isolated PostgreSQL and Redis**
  - Prefer Docker Compose; otherwise use workspace-scoped services that do not change or stop other projects.
  - Verify ports, health checks, credentials, and data directories are specific to 1hrLearning.
  - Done when Prisma and the backend can connect without `P1001`, and Redis health succeeds.
  - Verified 2026-10-15: workspace-scoped PostgreSQL 16.14 accepted a query against `1hrlearning` on loopback port `55432`; authenticated Redis 8.10.2 returned `PONG` on loopback port `56379`. The pre-existing PostgreSQL listener on `5432` was detected and left untouched.
- [x] **P0.2 Validate, migrate, generate, and seed the database**
  - Run Prisma validation/generation and review all migrations before applying them.
  - Seed the admin plus Alice, Bob, Carol, David, and Emma test personas idempotently.
  - Done when rerunning the seed creates no duplicates and the expected skills, balances, availability, and public session exist.
  - Verified 2026-10-15: Prisma validation, client generation, and both reviewed migrations succeeded. Two consecutive repair-capable seed runs retained exactly the admin and five personas, 39 skills, each persona's expected teaching/learning skills and balance, one open availability per persona, and one Alice public session.
- [x] **P0.3 Make local startup deterministic and project-specific**
  - Reserve and document frontend `3100`, admin `3101`, API `4000`, PostgreSQL `55432`, and Redis `56379` for this test run.
  - Add clear health/readiness output and a single verified startup procedure.
  - Done when all services start and stop without touching another Codex project.
  - Verified 2026-10-15: `npm run dev` starts the isolated data services, generates Prisma, applies pending migrations, repairs seed fixtures, and reports ready user/admin/API URLs. All three HTTP endpoints returned 200. Ctrl+C closed only ports `55432`, `56379`, `4000`, `3100`, and `3101`; the unrelated PostgreSQL PID on `5432` remained listening.
- [x] **P0.4 Repair the canonical Windows test runner**
  - Replace the failing `ts-node-dev`/`spawnSync` invocation with a deterministic one-shot runner.
  - Preserve test output and propagate the first failing exit status.
  - Done when root `npm run test` executes both backend tests on Windows and CI.
  - Verified 2026-10-15: the runner invokes local `ts-node` through Node (no `.cmd` shell dependency), propagates execution and assertion failures, and root `npm run test` executes both backend suites successfully. CI no longer suppresses migration or test failures.

### P0 — Protect session and point-economy invariants

These are trust-critical and must be fixed before broader UI testing.

- [x] **P0.5 Define and enforce the session transition matrix**
  - Explicitly permit only valid transitions such as pending to confirmed/cancelled and confirmed/in-progress to completed/cancelled/no-show.
  - Restrict confirm, complete, no-show, reschedule, notes, and meeting-link actions by role and current state.
  - Reject duplicate completion and direct transitions to rated status.
  - Done when positive and negative tests cover every transition and authorization boundary.
  - Verified 2026-10-15: a centralized policy checks all 98 current-state/target-state/participant-role combinations, blocks confirmation without a learner, rejects direct `RATED`, and protects rescheduling, notes, cancellation reasons, and meeting links by role and lifecycle state. Root type-check and all tests pass.
- [x] **P0.6 Make confirmation, cancellation, completion, and points atomic/idempotent**
  - Put session updates, point locks/transfers/refunds, availability changes, and application resolution into appropriate transactions.
  - Prevent retries from double-locking, double-refunding, or double-transferring points.
  - Ensure failure rolls back the complete state change.
  - Done when forced-failure integration tests leave balances, locks, sessions, and availability unchanged.
  - Verified 2026-10-15: database-enforced session ledger uniqueness and conditional transactional claims protect lock/refund/transfer effects. A forced rollback left balances, locks, session state, and availability unchanged; duplicate completion produced one transfer and one set of counters.
- [x] **P0.7 Make public-session acceptance transactional**
  - Verify the application still belongs to an open public session and the applicant still has sufficient available points.
  - Lock points before exposing confirmation externally; reject other applications and notify users only after commit.
  - Done when concurrent acceptance attempts produce exactly one learner and one point lock.
  - Verified 2026-10-15: simultaneous acceptance attempts against real PostgreSQL produced one accepted applicant, one rejected applicant, one learner assignment, and one 10-point lock. Notifications run only after commit.

### P1 — Complete the new-user activation journey

- [x] **P1.1 Route successful registration into onboarding**
  - After automatic sign-in, send new users to profile setup rather than directly to the dashboard.
  - Preserve a clear manual-login recovery path when automatic sign-in fails.
- [x] **P1.2 Enforce onboarding from environment-aware server code**
  - Remove the dashboard's hardcoded `http://localhost:4000` dependency.
  - Fail safely when onboarding status cannot be checked instead of silently granting normal dashboard access.
  - Avoid redirect loops and retain progress after refresh or re-login.
- [x] **P1.3 Make all four onboarding steps durable and recoverable**
  - Profile, teaching skills, learning skills, and availability must load existing progress and support back/forward navigation.
  - Validate partial request failures and show field/action-specific errors.
  - Mark onboarding complete only after required records are persisted.
- [x] **P1.4 Add onboarding integration and browser tests**
  - Cover registration validation, duplicate identity, API outage, automatic sign-in failure, resume, skip policy, and successful completion.
  - Verified 2026-10-28: registration/onboarding validation and recovery states are implemented, canonical steps retain persisted data, and authenticated browser routing reaches the saved dashboard or correct onboarding step.

### P1 — Complete the core learner/sharer workflow

- [x] **P1.5 Replace dashboard placeholders with real data**
  - Load taught/learned counts, available/locked points, and recent notifications.
  - Provide explicit loading, empty, authentication-expired, and API-unavailable states.
- [x] **P1.6 Correct the Requests frontend/API contract**
  - Derive the counterpart from `teacher`/`learner`; do not expect a nonexistent `request.user` property.
  - Ensure incoming/outgoing labels describe the correct person and action.
- [x] **P1.7 Verify reciprocal discovery and privacy**
  - Test teach/learn overlap, score explanations, undiscoverable users, reciprocal visibility, self-exclusion, filters, and empty states.
- [x] **P1.8 Complete private interest/request handling**
  - Test selected skill ownership, availability holding/release, point sufficiency, teacher confirmation/rejection, cancellation, and meeting-link masking.
- [x] **P1.9 Complete public session application handling**
  - Test creation, discovery, application, duplicate prevention, acceptance/rejection, deadlines, capacity, and post-acceptance visibility.
- [x] **P1.10 Complete post-session behavior**
  - Test completion, point settlement, calendar export, rating uniqueness, reputation update, testimonial creation/removal, low-balance messaging, and notifications.

### P1 — Replace incomplete admin placeholders

Implement each page against its existing authorized endpoint; do not expose raw JSON as the finished experience.

- [x] **P1.11 Sessions administration** — filtered readable list plus guarded, reasoned, audited override actions.
- [x] **P1.12 Point economy administration** — economy metrics plus validated, reasoned configuration editing.
- [x] **P1.13 Moderation administration** — status-filtered flag queue with resolution/dismissal notes.
- [x] **P1.14 Platform configuration** — supported-key controls with required audit reasons.
- [x] **P1.15 Audit log** — target-filtered actor/action/target view with readable before/after changes.
- [x] **P1.16 Analytics** — dated activation, sessions, matching, and point-economy views.
- [x] **P1.17 First-party recommendations/ads** — create, filter, activate, pause, and archive controls using the placement/category contract.
- [x] **P1.18 Admin authorization and recovery tests**
  - Cover user/moderator/admin role gates, expired tokens, forbidden controls, destructive confirmations, failed mutations, and audit creation.

### P2 — Correct UX integrity and deployment configuration

- [x] **P2.7 Repair public landing-page responsiveness**
  - Remove mobile horizontal overflow and keep navigation/account actions reachable at 360–390 px.
  - Stack fixed desktop grids and CTAs at mobile widths while preserving tablet and desktop hierarchy.
  - Verify the deployed homepage at mobile, tablet, and desktop widths with captured layout metrics and screenshots.
  - Verified 2026-11-03: production-style browser emulation reported viewport/document widths of `360/360`, `390/390`, `768/768`, and `1440/1440`; navigation and CTAs remained reachable, mobile sections stacked, tablet grids reflowed, and the desktop hierarchy remained intact. A scrolled-state regression check also confirms the sticky navigation uses an opaque theme surface, preventing section text from showing through its controls. Frontend type-check and production build passed.

- [x] **P2.1 Remove fabricated marketing metrics**
  - Replace fixed learner/session/rating numbers with verified live metrics or non-numeric product statements.
- [x] **P2.2 Replace dead links and controls**
  - Remove or implement all `href="#"` footer links and ensure every CTA reaches a real route and preserves authentication context.
- [x] **P2.3 Improve operational error feedback**
  - Standardize errors, retries, optimistic-state rollback, disabled/loading states, empty states, and accessibility announcements across frontend and admin.
- [x] **P2.4 Replace remaining unoptimized user images**
  - Use the established image component/loader and preserve safe fallbacks.
- [x] **P2.5 Make deployment URLs explicit**
  - Configure hosted API, WebSocket, frontend, admin, and authentication URLs in environment examples and deployment settings.
  - Remove unsafe production reliance on localhost fallbacks and document required variables.
- [x] **P2.6 Resolve dependency and build warnings**
  - Review rather than blindly force-fix reported vulnerabilities and deprecated packages.
  - Update browser compatibility data and remove build-time external-font fragility where practical.
  - Verified 2026-10-28: Browserslist data, Next/Auth/Express/Socket/Sentry/UUID/Zod dependencies, and ESLint CLI scripts were updated; SendGrid uses its REST contract without the vulnerable SDK. A clean sequential production build passes. Four transitive findings remain documented because their available npm fixes require unsafe Next/Bull major downgrades or migrations.

### P3 — Full regression and readiness evidence

- [x] **P3.1 Run broad automated verification**
  - `npm run type-check`
  - `npm run test`
  - `npm run build`
  - `npm run lint`
  - Prisma validate/generate/migration status
- [x] **P3.2 Run API integration suites with real PostgreSQL/Redis**
  - Authentication and refresh/logout.
  - Skills, availability, matching/privacy.
  - Private/public sessions and all negative transitions.
  - Points, notifications, calendar, ratings/testimonials.
  - Admin authorization, actions, and audit logs.
- [x] **P3.3 Run browser journeys with seeded personas**
  - New-user onboarding.
  - Alice/Bob reciprocal match and private session.
  - Carol/public-session application lifecycle.
  - Admin operational workflows.
  - Desktop/mobile layout, keyboard navigation, and error recovery.
- [x] **P3.4 Reconcile product documentation with evidence**
  - Update README feature statuses so “complete” means verified end to end.
  - Correct local testing instructions and remove stale endpoint examples.
- [x] **P3.5 Final diff, security, and recovery review**
  - Review all changed/new files, secrets, migrations, authorization, point accounting, deployment variables, rollback needs, and unresolved warnings.

## Current evidence baseline

- 2026-10-15: `npm run type-check`, `npm run test`, `npm run lint`, and `npm run build` passed across all four workspaces.
- Prisma validation passed and migration status reported all three migrations applied to the isolated PostgreSQL database.
- The real-database session-economy integration suite passed rollback, concurrent acceptance, and retry/idempotency checks.
- Browser verification passed seeded learner login, canonical `/onboarding/*` routing, activated dashboard data, admin login, live admin health metrics, and session inventory.
- 2026-10-15 remediation verification: repository type-check, unit/policy tests, and lint pass. Deterministic seed rerun created the two intended edge personas. A clean production admin build is currently blocked by an intermittent Windows `EPERM` while Next.js creates generated `.next/types` directories; no TypeScript or lint source failure was reported.
- 2026-10-28 final local acceptance: unit/policy tests, real-database transaction/concurrency tests, and the new HTTP acceptance suite passed. Browser verification passed Alice/Carol login, reciprocal discovery, private-request validation, public application/duplicate prevention, admin login/dashboard/session/configuration workflows, and accessible feedback. Live testing found and fixed expired reusable fixtures, broken profile-return links, and recursive admin action rendering.
- 2026-10-28 security/build review: clean type-check, tests, ESLint CLI lint, Prisma validation/migration status, and sequential production build passed. The production audit is reduced to four transitive advisories (Next-bundled PostCSS and Bull-bundled UUID); automatic fixes would require incompatible major changes and were deliberately not forced.
- The only intentionally deferred product task is the remaining EM-005 production-domain and webhook evidence. Resend account setup, encrypted Admin configuration, sandbox success delivery, and unverified-domain failure behavior are verified.

## Execution rule

Do not begin a lower-priority phase while an unresolved higher-priority item can invalidate its results. After each numbered task, run its focused checks and update this document with completion evidence, remaining limitations, and the next task.
