# Codex Repo Instructions

## Goal
Keep changes small, safe, and well-scoped. Prefer clarity over cleverness.

## Scope
- In: work inside this repo only
- Out: changing tooling, CI, or unrelated refactors unless asked

## Constraints
- No new dependencies without approval
- Preserve existing behavior unless stated otherwise
- Keep diffs minimal and easy to review

## Startup Docs
- Before making changes, read `README.md`
- Before making changes, read all Markdown files under `docs/`
- Before making changes, read any nearby `README.md` and `RULES.md` files in the part of the repo you are editing
- Treat these files as project guidance and constraints unless the user explicitly overrides them
- If two docs conflict, prefer the more local doc for that code area and ask before proceeding if the conflict is material

## Process
- Ask clarifying questions if requirements are missing
- If proceeding, state assumptions explicitly
- Summarize what changed and why
- List files touched

## Tests
- Only run tests when asked or when the change is risky
- If not run, say so
