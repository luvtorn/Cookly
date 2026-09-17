# Cookly

Cookly is a social recipe platform in development. The current milestone includes a responsive, light/dark Home preview on top of Next.js App Router, strict TypeScript, Tailwind, and a PostgreSQL Prisma schema.

## Home preview

- Editorial typography, liquid-glass surfaces, responsive navigation, featured recipe, reusable recipe cards, category links and a secondary Pantry teaser follow `design-package/home.png`.
- Theme preference respects the system initially and persists an explicit light/dark choice. Mobile navigation supports keyboard/Escape; native preview dialogs trap focus and return it to their trigger.
- Home stays a Server Component. `/?q=salmon` searches sample recipe titles; `/?category=vegetarian` filters the small fixture set. These are presentation fixtures, not PostgreSQL seed data or the production discovery API. Invalid/repeated query values safely fall back to defaults.
- Four sample cards appear by default; filtered results also include the featured pasta. Sign-in, recipe details and Pantry buttons explicitly explain their future milestone rather than pretending to save data or navigating to missing pages. No ratings, real social counts, verification claims or authentication are simulated.
- Loading, empty, safe retry-error and branded 404 states are included. The `/discover`, recipe detail, auth and Pantry routes remain unimplemented.
- DM Sans and Lora are self-hosted with their SIL licenses in `src/app/fonts/`. Generated illustrative demo images are local optimized WebP files; their provenance and prompts are in `public/images/README.md`. No runtime AI service or external image host is required.

## Requirements

- Node.js 22 LTS (`.nvmrc` and `package.json` declare this runtime)
- npm (use the committed lockfile with `npm ci`)
- PostgreSQL/Neon only when database work begins

## Setup

```bash
npm ci
npm run dev
```

The homepage is available at `http://localhost:3000`. Development, generation, tests and build work without a database or auth secret. `dev` generates Prisma Client automatically before starting Next.js.

## Environment

Copy `.env.example` to `.env.local` when configuring integrations (`Copy-Item .env.example .env.local` in PowerShell, or `cp .env.example .env.local` on macOS/Linux). Keep real values only in ignored environment files or deployment environment settings.

- `DATABASE_URL`: optional for foundation checks; required for database access, migrations and Studio. Use a real `postgresql://` or `postgres://` URL with a host and database name. There are no fallback credentials.
- `AUTH_SECRET`: reserved for the authentication milestone; auth routes/providers are not active.
- `NEXT_PUBLIC_APP_URL`: optional HTTP(S) public application URL; the example uses `http://localhost:3000`. Never put secrets in public variables.

Prisma uses `@next/env`, matching Next.js loading: process environment first, then environment-specific local files, `.env.local`, environment-specific files, and `.env`. CLI development commands default to development; set `NODE_ENV=production` when using production-specific files. Tests skip `.env.local`. Empty/whitespace-only values are treated as absent. Invalid configuration errors list variable names without exposing their values.

## Database

The supplied schema contains 21 models and 9 enums, including users/profiles, authentication records, recipes/taxonomy, social relationships, Pantry, reports and moderation history. The generated client lives in `src/generated/prisma/` and is ignored by Git.

The `20260916000000_init_cookly` migration was generated from an empty database model using `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script`. It includes the supplied schema's tables, foreign keys, indexes and delete actions without changing the data model. **It has not been applied or tested against PostgreSQL yet.**

Commands:

```bash
npm run prisma:validate
npm run prisma:generate
```

After configuring a dedicated development database, `npm run prisma:deploy` applies the saved migrations. `npm run prisma:migrate -- --name <change_name>` creates/applies subsequent development migrations; it may require a shadow database. `npm run prisma:studio` opens the database browser. These commands require `DATABASE_URL` and must target the intended database. Never reset a database to resolve migration drift without explicit approval.

Review before the first database integration:

- Deleting a user cascades to their recipes, comments and social data; deleting a recipe cascades to its ingredients, steps, social data and verification requests. Existing moderation actors cannot be deleted; moderation target references are set to null when their content is deleted. Referenced categories and canonical recipe ingredients are protected by restrictive deletes.
- The schema does not yet enforce self-follow prevention, exactly one report target, one pending verification request per recipe, or positive quantities/times. These invariants belong to the corresponding service validation and, where appropriate, future migrations before those features ship.
- Publication (`DRAFT/PUBLISHED/ARCHIVED`) and verification (`NONE/PENDING/VERIFIED/REJECTED`) are separate. Normal publication does not wait for admin review.
- Auth.js is configuration scaffolding only. Its standard Prisma adapter expects token fields such as `access_token`; the supplied `Account` uses camelCase and `User` has no `name`. Adapter mapping/schema compatibility must be resolved during the authentication milestone, not inferred from successful Prisma generation.

## Checks

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
npm run format:check
```

Install Playwright's Chromium browser once before the first E2E run:

```bash
npx playwright install chromium
```

`typecheck` generates Prisma Client and Next.js route types before TypeScript, so it works without an existing `.next/` directory. `test:e2e` builds and starts the production server automatically. After an existing build, `npx playwright test` runs the same smoke test without rebuilding. Use `npm run start` to serve a production build manually.

Additional commands: `test:watch`, `test:coverage`, and `format`. Fonts and images are local: a cold production build no longer needs access to Google Fonts. Browser tests cover Home search, theme persistence, preview dialogs, mobile keyboard navigation, the 404 page, and overflow/screenshots at 320, 390, 768, 1024 and 1448px in both themes. Screenshots are written to ignored `test-results/`; these are review artifacts, not pixel-diff baselines.

## CI and delivery status

`.github/workflows/ci.yml` runs on pull requests, pushes to `main`, and manual dispatch using Node.js 22. It installs from the lockfile, validates the schema, generates clients/types, lints, tests, builds and runs Chromium against the production build. No database or secrets are required. Failure reports are retained for seven days. The workflow is configured locally; a remote green run is pending publication to GitHub.

See `PRODUCT.md` for behavior, `ROADMAP.md` for milestone status and `AGENTS.md` for engineering rules. Approved visual references are in `design-package/`; those references and the Prisma data model were preserved. Database connectivity, applying the migration, seed content, real discovery and authentication remain future milestones.
