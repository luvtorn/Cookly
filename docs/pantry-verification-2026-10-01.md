# My Ingredients verification — October 1, 2026

## Scope

Replaced the Pantry preview with private persisted ingredient lists and PostgreSQL-ranked recipe matching. No application dependencies, migrations, tables or environment variables were added. No production Neon records were created or changed. Commit, push and deployment remain separate steps.

## Automated checks

- ESLint with zero warnings: passed.
- Typecheck (Prisma generation, Next route types, strict TypeScript): passed.
- Unit/component suite: 138 tests across 39 files passed.
- Production build: passed, including localized dynamic Pantry routes.
- Isolated PostgreSQL integration suite: 35 tests across five files passed. Pantry coverage includes ownership, active-account enforcement, concurrent additions, capacity, distinct mandatory ingredients, optional ingredients, publication/visibility exclusions, filters and stable pagination.
- Chromium: Pantry and Studio regression scenarios both passed. The Pantry scenario covers guest sign-in and callback, keyboard selection, persistence after refresh, matching, pagination, recipe return, filters, Back/Forward, empty/error suggestions, Escape and clear confirmation. Studio retains its ingredient picker and editing flow.
- Responsive checks cover EN/RU/PL, widths 390/768/1100/1448 and both themes, including overflow assertions and screenshots. A 390×600 reduced-motion scenario checks suggestion hit-testing above the bottom navigation.

## Fixes found during verification

- Next requires `dynamic` to be declared directly in the localized route, rather than re-exported from the shared page.
- Suggestions now account for the bottom navigation when positioning above an input near the bottom of a short viewport. Keyboard selection scrolls the suggestion list, not the page.
- Dismissed asynchronous suggestions do not reopen after Escape or focus departure.

## Test isolation and artifacts

Integration and browser writes used a fresh local PostgreSQL database named `cookly_test` on loopback port 55433. Fixtures are test-owned; no production user data was copied. Browser screenshots and traces are ignored artifacts under `test-results/auth/`. The local PostgreSQL runtime and cluster are also ignored test artifacts, not application dependencies.

The test Next.js server and isolated PostgreSQL instance were stopped after verification.

The PostgreSQL driver reports its existing future SSL-mode behavior warning during the production build; it does not fail the build. No production configuration was changed as part of this feature.
