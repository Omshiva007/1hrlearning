# 1hrLearning Agent Instructions

Baseline: Universal AI Development Baseline v1.4
Installed master: [docs/AI_DEVELOPMENT_BASELINE.md](docs/AI_DEVELOPMENT_BASELINE.md)

These instructions apply to every coding task and resumed session in this repository. More specific `AGENTS.md` files may add directory guidance but must not weaken this contract.

## Required Development Contract

Before editing:

- Understand the requested outcome and define verifiable acceptance criteria.
- Read applicable instructions and only the project context needed for the task.
- Inspect the current implementation, relevant tests, and starting Git state.
- Identify affected components, consumers, interfaces, data, and indirect wiring.
- Separate and preserve existing user changes.
- Resolve material ambiguity before implementing dependent behavior; proceed on routine authorized choices.

While implementing:

- Make the smallest complete change that satisfies the requirement.
- Follow existing TypeScript, Express, Next.js, Prisma, and shared-package patterns; avoid unrelated refactors or formatting.
- Add meaningful inline comments to every new or materially changed non-trivial code path. Comments must explain intent, invariants, business rules, security decisions, edge cases, or reasoning that the code alone does not make clear; do not add comments that merely restate syntax.
- Preserve unrelated behavior and contracts; state intentional compatibility changes.
- Validate at trust boundaries and preserve authorization, data integrity, point-economy rules, session transitions, and privacy controls.
- Protect secrets and sensitive information. Use approved environment and credential mechanisms without exposing values.
- Do not weaken validation, tests, access controls, or checks to make a change pass.

Before completing:

- Verify acceptance criteria with meaningful checks appropriate to the change.
- Review the complete diff, including new files, generated effects, and accidental deletions.
- Update authoritative documentation when behavior, commands, interfaces, or constraints change.
- Report results, checks actually executed, failures or unrun checks, and material limitations.
- Do not claim verified completion or production readiness when required evidence is missing.

For substantial work, maintain resumable progress in `docs/TASKS.md`. For high-impact changes, document compatibility, recovery, and independent-review needs. Follow user authorization and environment policy for external, destructive, production, or credential-using actions.

## Repository orientation and context routing

- `apps/frontend`: Next.js user application.
- `apps/admin`: Next.js administration application.
- `apps/backend`: Express API, Prisma schema/migrations, services, jobs, and backend tests.
- `packages/shared`: shared types, constants, and Zod validators.
- Read `README.md` for product scope and workflows.
- Read `docs/DEVELOPMENT_WORKFLOW.md` before selecting checks or changing shared behavior.
- Read the Prisma schema and relevant migrations for persistent-data changes.
- Inspect all consumers before changing `packages/shared`.
- Read `.github/workflows` for CI, security, or release-workflow changes.
- Existing local testing guides are references; verify commands against current manifests before relying on them.

## Project safeguards

- Treat point transfers/balances, session state, authentication, role gates, and migrations as high-impact.
- Keep API validation in shared Zod schemas where that is the existing pattern and enforce authorization server-side.
- Do not expose meeting links before implemented authorization/status rules allow it.
- Never commit `.env` files, tokens, passwords, or provider credentials.
- Preserve unrelated working-tree changes; do not stage or commit them unless explicitly requested.
- Run focused checks first and broaden them according to impact.

## Supported verification

From the repository root:

- `npm run type-check` — all workspace type checks.
- `npm run test` — configured workspace tests.
- `npm run build` — production builds for configured workspaces.
- `npm run lint` — workspace lint commands; currently maps primarily to type checks.

Backend schema changes additionally require Prisma validation/generation and migration review. User-visible workflows require relevant API or browser verification when available. Record anything not run.
