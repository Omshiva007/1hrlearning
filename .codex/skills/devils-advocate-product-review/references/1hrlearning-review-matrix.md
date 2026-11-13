# 1hrLearning adversarial review matrix

Use this reference only when reviewing the 1hrLearning / OKE product. Derive current truth from the repository and runtime; this matrix lists questions, not accepted facts.

## Business outcome

A participant should be able to join a free one-to-one knowledge exchange, declare what they can teach and want to learn, find a suitable reciprocal partner or public session, arrange and conduct a live session, settle points correctly, build reputation, and control privacy. Operators must be able to keep that lifecycle safe and recoverable.

## Actors

- New visitor and new account
- Learner
- Sharer/teacher
- Reciprocal participant acting in both roles
- Public-session applicant
- Moderator
- Administrator
- Scheduled/background system
- Email and meeting providers

## Critical journeys

### Acquisition and activation

- Public value proposition and CTAs lead to the intended registration path.
- Registration handles client validation, API validation, duplicates, API outage, and automatic-login failure.
- Onboarding persists profile, teaching skills, learning skills, availability, partial progress, and completion state.
- Refresh, back navigation, logout/login, and expired sessions resume safely.

### Discovery and matching

- Reciprocal skill overlap, availability, reputation, privacy, self-exclusion, and score explanation agree across API and UI.
- Empty results and non-discoverable users are intentional and understandable.
- Matching cards preserve the selected person and skill into the next action.

### Private exchange

- Interest/request creation validates actor, skill ownership, availability, points, duplicate requests, and self-action.
- The counterpart can accept or reject; held availability and points are released or committed correctly.
- Meeting details remain private until the authorized lifecycle state.
- Reschedule, cancel, no-show, completion, retry, and concurrent actions preserve invariants.

### Public sessions

- A sharer can publish a valid session and learners can discover and apply.
- Capacity, deadlines, duplicate applications, point sufficiency, and concurrent acceptance are enforced transactionally.
- Non-selected applicants receive correct state and notifications.

### Completion and value exchange

- Completion moves points exactly once and updates balances, locks, counters, availability, and notifications atomically.
- Ratings and testimonials are authorized, unique where required, removable where promised, and reflected in reputation.
- Calendar artifacts and meeting links represent the final confirmed schedule.

### Communication

- In-app notifications have correct recipients, links, unread state, deletion/read behavior, and retry semantics.
- Email triggers are provider-neutral, configurable, secret-safe, failure-tolerant, and privacy appropriate.
- Realtime behavior survives reconnects and multi-instance execution or has an explicit fallback.

### User control and safety

- Profile visibility, availability, ad/email preferences, account status, moderation, and session privacy are enforced server-side.
- Sensitive details and secrets never appear in public responses, logs, audit records, or meeting-link previews.

### Administration and operations

- Role gates distinguish user, moderator, and administrator on both UI and API.
- Sessions, points, moderation, configuration, audit logs, analytics, recommendations, users, skills, and email providers support the promised operation rather than raw-data display.
- High-impact changes require reason/context, create audit evidence, validate inputs, and expose failure/recovery states.

## Cross-cutting adversarial scenarios

- Double click, retry, replay, refresh, stale tab, concurrent actors, and duplicate webhook/job execution.
- Database succeeds while Redis/email/socket fails, and the reverse where applicable.
- Access token expiry during mutation and refresh-token rotation races.
- Insufficient points after discovery but before acceptance.
- Availability or session capacity changes between page load and submission.
- User deactivation, role change, or privacy change during an active workflow.
- Mobile widths, keyboard-only operation, visible feedback, and API-unavailable states.
- Empty database, deterministic seed rerun, migration rollback/recovery, and configuration absence.

## Completion boundary

Separate findings into:

- missing or defective product behavior;
- missing automated/runtime evidence;
- AWS deployment and environment configuration;
- external account, DNS, sender-domain, or credential setup;
- production go-live validation;
- optional future enhancements.

Do not classify AWS provisioning, hosted URLs, real provider credentials, or production smoke tests as undeveloped product functionality when the corresponding cloud-neutral code is implemented and locally verified.
