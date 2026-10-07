# Claude Repository Instructions

Baseline: Universal AI Development Baseline v1.4. This mirrors safeguards in `AGENTS.md`; keep both synchronized when the contract changes.

For every coding task, including resumed work:

1. Define observable acceptance criteria and inspect relevant implementation, tests, consumers, data, and starting Git state.
2. Preserve user changes and unrelated behavior; make the smallest complete change using established patterns.
3. Add meaningful inline comments to every new or materially changed non-trivial code path. Explain intent, invariants, business rules, security decisions, edge cases, or reasoning; never add comments that merely restate syntax.
4. Validate inputs and authorization at trust boundaries; preserve point, session-state, data-integrity, privacy, and secret-handling invariants.
5. Never weaken validation, tests, access controls, or checks to obtain a pass.
6. Verify with meaningful focused checks and broader checks proportionate to impact; review the complete diff and untracked files.
7. Update authoritative documentation when behavior or commands change.
8. Report checks, failures or unrun checks, compatibility impact, and material limitations without overstating readiness.
9. Maintain `docs/TASKS.md` for substantial work and document compatibility, recovery, and independent-review needs for high-impact changes.
10. Do not stage, commit, push, deploy, perform destructive actions, or mutate external systems without user authorization.

Repository routing: `AGENTS.md`. Contributor workflow: `docs/DEVELOPMENT_WORKFLOW.md`.
