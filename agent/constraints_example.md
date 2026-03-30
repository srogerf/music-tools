# Codex Scope, Constraints, and Direction Template

Use this structure to clearly scope work, set constraints, and direct the Codex process.

## Core Pattern
1. State the goal in one sentence.
2. Set scope: what’s in and out.
3. Set constraints: time, risk, dependencies, compatibility, style.
4. Define success criteria.
5. Give process direction: ask for a plan, questions, or immediate action.

## Minimal Template
```text
Goal: <one sentence>

Scope:
- In: <what to include>
- Out: <what to avoid>

Constraints:
- <time/perf/security/compatibility/etc>

Success looks like:
- <measurable outcomes>

Process:
- <plan first / ask questions / proceed with assumptions>
```

## Example: Ask for Clarification Before Acting
```text
Goal: Implement a CSV export for the reports page.

Scope:
- In: client-side export for current table view
- Out: server-side job, background processing

Constraints:
- No new dependencies
- Must work in Safari 15+
- Keep changes under 5 files

Success looks like:
- User can click “Export CSV” and download data shown

Process:
- First list any missing info or risks, then propose a plan.
```

## Example: Give Strict Direction
```text
Goal: Fix failing tests.

Scope:
- In: only tests under src/payments
- Out: refactors or renaming public APIs

Constraints:
- Do not change snapshots
- Keep behavior identical

Success looks like:
- `npm test -- payments` passes

Process:
- Make the smallest code change, then summarize files touched.
```

## Optional Instruction to Force Questions First
```text
Before you start, ask me for any missing scope/constraints and propose assumptions if I don’t answer.
```
