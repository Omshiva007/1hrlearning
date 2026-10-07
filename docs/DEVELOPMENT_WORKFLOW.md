# Development Workflow

This document operationalizes [`AGENTS.md`](../AGENTS.md) for contributors and AI coding agents.

## Before implementation

1. Translate the request into observable acceptance criteria.
2. Inspect Git status and preserve pre-existing user changes.
3. Read only relevant entry points, tests, shared contracts, and documentation.
4. Trace affected consumers and boundaries: UI to API; route to validation, authorization, service, and persistence; shared packages to all workspaces; Prisma to migrations, generated client, seed, and recovery.
5. Classify impact as routine, substantial, or high impact. Update `docs/TASKS.md` for substantial work.

## Implementation rules

- Prefer the smallest complete behavior change.
- Reuse established Next.js, Express, Prisma, TanStack Query, Zod, and shared-package patterns.
- Add meaningful inline comments to every new or materially changed non-trivial code path. Explain why the behavior exists, including relevant invariants, business rules, security constraints, and edge cases; avoid comments that simply narrate the code.
- Keep validation at trust boundaries and authorization server-side.
- Preserve API contracts unless compatibility work is explicitly required.
- Keep point calculations and session transitions centralized in their existing backend services.
- Avoid unrelated formatting, refactors, dependency upgrades, generated artifacts, or documentation churn.
- Do not read, edit, or print secret-bearing files unless secure use is required by the authorized task.

## Verification matrix

Run focused checks first, then broaden based on impact. Commands run from the repository root unless stated otherwise.

| Change area | Minimum evidence | Broader evidence for substantial/high impact |
|---|---|---|
| Shared contracts | `npm run type-check` | `npm run build`; affected API/UI workflows |
| Backend | backend type-check and affected tests | `npm run test`; live API and database workflow |
| Prisma | validation/generation and migration review | clean migration, seed, recovery assessment |
| Frontend | frontend type-check and affected page behavior | frontend build and browser workflow |
| Admin | admin type-check and affected admin behavior | admin build and role/action workflow |
| Auth/access | focused positive and negative tests | login, refresh, and role workflow |
| Points/session state | domain tests and invalid transitions | database-backed lifecycle and recovery review |
| Documentation | link/path/command inspection and diff | relevant smoke check when claims change |

Canonical commands:

```bash
npm run type-check
npm run test
npm run build
npm run lint
```

Backend tests are currently under `apps/backend/src/__tests__`. CI definitions are in `.github/workflows`. Never report a check as passed unless it executed successfully in the relevant context.

## Completion review

- Re-read acceptance criteria and exercise changed behavior.
- Review required inline comments for usefulness and accuracy alongside the implementation.
- Review `git diff`, `git status`, and all untracked files.
- Check generated effects, migrations, API contracts, environment examples, and documentation links where relevant.
- Record executed checks, failures, skipped checks, and environment blockers.
- Report compatibility and remaining review/recovery needs.
- Do not automatically stage, commit, push, deploy, or mutate external systems unless requested.

## Documentation routing

- Update `README.md` when product behavior, setup, or contributor entry points change.
- Update this workflow when supported commands or verification expectations change.
- Use `docs/TASKS.md` only for active substantial work; clear or archive completed records.
- Add durable architecture, decision, security, storage, API, or release docs only when no authoritative home exists.
- Treat historical completion reports and test guides as snapshots; verify claims against implementation.

## Known enforcement limits

Current CI performs type checks, backend build/tests, dependency audit, CodeQL, and secret scanning, but some workflow steps tolerate failures. This baseline records that limitation. Tightening CI enforcement requires a separate authorized automation change.
