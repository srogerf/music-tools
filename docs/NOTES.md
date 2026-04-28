# Notes

This file is for small repo-level follow-up notes that do not yet justify a
full design doc.

## Open Questions
- Should the random scale selection code live in `src/`?

## Considerations
- If it stays in `tools/`, `src/` remains a pure library with no CLI-specific behavior.
- If it moves into `src/`, clarify how CLI concerns are separated from library code.

## Implementation Notes
- Always mark shell scripts as executable.

## Security Follow-Ups
- Transport security is now handled at nginx for production HTTPS, but the API
  and server-side REST behavior still need application-level security review.
  Before user-specific features or private data are added, define the auth,
  authorization, CSRF/session, CORS, request validation, and rate-limit rules
  for `/api/v1/` endpoints.
