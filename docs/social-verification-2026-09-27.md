# Saved recipes, likes and comments — verification

## Scope

Private localized Saved pages, card/detail reactions, and owner-managed plain-text comments are implemented. Existing toast and account-header changes are preserved. Comments from administrators capture editorial authorship at creation; public output uses Cookly without exposing the administrator's identity.

## Local checks

- ESLint, strict TypeScript and production build passed.
- 118 unit/component tests passed.
- 21 integration tests passed against isolated loopback PostgreSQL (`cookly_test`).
- 43 public Chromium tests passed.
- All three database-backed Chromium journeys passed: authentication/creator, Studio, and social lifecycle.
- Social browser coverage includes guest sign-in return, save/unsave, like/unlike, reload persistence, Saved navigation and Back/Forward, and comment creation/editing/confirmed removal.
- Saved and Community screenshots cover 390, 768, 1100 and 1448 px, both themes, and EN/RU/PL. Layout assertions check horizontal overflow; keyboard controls and reduced motion are included.
- Integration coverage checks inactive/unauthenticated users, ownership, private Saved queries, hidden content, stale edits, idempotent/concurrent reactions, pagination and persistent editorial identity.

Screenshots and Playwright traces are local ignored artifacts under `test-results/`; fixtures are not production content.

## Release boundary

Migration `20260927220000_comment_editorial` was applied only to the isolated test database. It must be applied to the deployment database before releasing the new application version. Neon, production content and deployment configuration were not modified. Commit, push and deployment are separate steps.

### Approved follow-up

The user subsequently approved applying the same migration to the connected Neon database. Prisma confirmed it was the only pending migration and applied it successfully; a read-only check confirmed `Comment.isEditorial` exists. No production test users or comments were created. The private Saved page now also includes a Liked recipes tab (`?view=liked`), with search, pagination, and preserved return links. Commit, push and deployment remain separate steps.
