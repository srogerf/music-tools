# Codex Scope, Constraints, and Direction Template (Strict)

Use this strict template when you want Codex to act with minimal ambiguity and zero scope creep.

## Strict Template
```text
Goal: <one sentence>

Scope:
- In: <explicit inclusions>
- Out: <explicit exclusions>

Constraints (must follow):
- <no new dependencies>
- <no refactors>
- <compatibility requirements>
- <time/size limits>

Success criteria (must be measurable):
- <exact command or observable behavior>

Process rules:
- Ask clarifying questions if any requirement is missing.
- If unanswered, proceed only with minimal, stated assumptions.
- Make the smallest change that satisfies success criteria.
- Summarize files touched and why.
```

## Example: Strict Mode
```text
Goal: Fix failing tests.

Scope:
- In: only tests under src/payments
- Out: refactors, renaming public APIs, or touching non-payments code

Constraints (must follow):
- Do not change snapshots
- Do not add dependencies
- Keep behavior identical

Success criteria (must be measurable):
- `npm test -- payments` passes

Process rules:
- Ask clarifying questions if any requirement is missing.
- If unanswered, proceed only with minimal, stated assumptions.
- Make the smallest change that satisfies success criteria.
- Summarize files touched and why.
```
