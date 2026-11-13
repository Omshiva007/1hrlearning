---
name: devils-advocate-product-review
description: Audit a software product's claimed completion, business-objective coverage, end-to-end workflows, failure handling, operability, and verification evidence. Use for devil's-advocate reviews, completion audits, coverage assessments, readiness challenges, or questions such as "is everything done?"; do not use for ordinary implementation or narrow code review unless the user requests this adversarial perspective.
---

# Devil's Advocate Product Review

Challenge the product as a skeptical customer, operator, and reviewer. The goal is not to find arbitrary imperfections; it is to determine whether the product achieves its stated business outcome without relying on optimistic interpretation.

## Review contract

- Treat the review as read-only unless the user separately asks for fixes.
- Start from business objectives and user outcomes, not from the routes or screens that happen to exist.
- Distinguish product-development gaps from deployment, credentials, infrastructure, go-live validation, and optional enhancements.
- Preserve existing authorization boundaries. Do not create accounts, send messages, change cloud state, or use credentials merely to increase coverage without the required permission.
- Never equate code presence, a passing build, or a rendered screen with a completed workflow.
- Challenge documentation and completion claims against current code and executable evidence.

## Establish the evidence baseline

Read applicable repository instructions, product scope, active task records, manifests, architecture entry points, relevant shared contracts, tests, and current Git state. Inspect only enough implementation to trace the affected business journeys.

For 1hrLearning reviews, read [references/1hrlearning-review-matrix.md](references/1hrlearning-review-matrix.md). Use it as a coverage prompt, not as proof that any capability works.

Classify every material claim using the strongest evidence actually available:

1. **Declared** — documentation, task list, design, or comment only.
2. **Implemented** — code exists, but wiring or runtime behavior is unproven.
3. **Wired** — real UI/API/service/data consumers are connected.
4. **Automated** — meaningful positive and negative tests pass.
5. **Runtime verified** — exercised end to end in a representative local or test environment.
6. **Production verified** — exercised in the intended hosted environment with real dependencies.

Do not promote a claim beyond its evidence level. Record stale or contradictory evidence explicitly.

## Build coverage from outcomes

Create a compact capability and journey matrix. For each business-critical journey, examine:

- entry and discovery;
- happy path to durable outcome;
- validation and authorization boundaries;
- empty, loading, degraded, and unavailable states;
- rejection, cancellation, retry, duplicate submission, and partial failure;
- refresh, logout/login, expiry, and resume behavior;
- notifications and downstream side effects;
- operator/admin visibility, intervention, and auditability;
- privacy, secrets, financial/point integrity, and data consistency;
- accessibility and responsive behavior where users encounter the journey.

Check alternate actors and asymmetry. A workflow is not complete merely because one role can initiate it; the counterpart must be able to receive, decide, complete, recover, and observe the result.

## Look for false-completion signals

Actively search for:

- buttons, links, pages, or API routes without a working downstream consumer;
- UI expectations that do not match API response contracts;
- placeholders, fabricated data, demo-only branches, hardcoded identifiers, or seeded-only assumptions;
- localhost fallbacks, missing environment configuration, or behavior that silently changes by environment;
- background work that depends on a process staying alive;
- authorization enforced only in the client;
- non-atomic multi-step state changes, duplicate side effects, or missing idempotency;
- successful HTTP responses that leave the durable business state incomplete;
- tests that mock away the boundary they claim to verify;
- documentation that reports historical checks as current evidence;
- "complete" tasks whose acceptance criteria were never exercised.

## Use proportional verification

Run focused checks before broad suites. Prefer observable workflow evidence over superficial command success. When browser or API verification is possible, test at least one happy path and the highest-risk negative/recovery path for each critical capability.

If dependencies, credentials, external services, or production access are unavailable, continue with code and automated evidence, but label the resulting ceiling. Missing production evidence is not automatically a product-development defect.

## Report for decisions

Lead with a candid verdict:

- **Complete and verified**
- **Functionally complete with validation gaps**
- **Partially complete**
- **Not complete**

Then report:

1. business objective coverage;
2. critical end-to-end journey status and evidence level;
3. confirmed gaps, ordered by user/business impact;
4. unverified claims and the evidence needed to resolve them;
5. product-development work separated from deployment/go-live work;
6. a prioritized, sequential completion plan when requested.

Use severity labels consistently:

- **P0:** trust, security, data integrity, or core journey cannot complete;
- **P1:** important workflow is broken, misleading, or lacks recovery;
- **P2:** material usability, coverage, or operator gap;
- **P3:** polish, optimization, or optional enhancement.

State checks actually run, failures, unrun checks, limitations, and contradictory evidence. Do not use a percentage-complete score unless the user provides weighting or the report explains its weighting model.
