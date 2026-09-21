# Cookly

Cookly is a social recipe platform in development, built with Next.js App Router, strict TypeScript, Tailwind and PostgreSQL/Prisma. The current slice connects real recipe discovery, recipe details and a protected editorial studio.

## Editorial studio — 2026-09-21

- `/admin` and `/admin/recipes` are ADMIN-only. Overview counts are real and scoped to the administrator's recipes; the editor supports ingredients, ordered steps, taxonomy, cover upload, drafts, publication and archiving. Moderation and user management are not implemented.
- Every mutation checks the current database role/status and recipe ownership. Server Actions enforce same-origin requests and authenticated limits. Server Function argument logging is disabled to prevent password disclosure in development.
- `Recipe.isEditorial` is a persisted server-controlled flag, independent of later role changes. Public editorial attribution is **Cookly**, with no administrator identity. Normal recipes use their author's public display name. Publication does not grant verification.
- Home reads published, non-hidden recipes with search, curated categories and 12-item pagination. `/recipes/[slug]` exposes only public content. Missing database configuration retains the offline empty shell; database failures render an explicit unavailable state.
- Category links use matching curated tags (`quick`, `fresh`, `comfort`, `vegetarian`), the `desserts` category, or assigned cuisine for Global Flavors. The editor manages these tags explicitly.
- Covers accept JPEG/PNG/WebP up to 3 MiB; the Server Action body limit is 4 MiB. Uploads are limited to 20 per administrator/hour, saves to 60/hour. Uploaded metadata is HMAC-signed, bound to the administrator, and expires after 30 minutes. Arbitrary client URLs/IDs are not accepted. Existing cover metadata is read from the database.
- `coverImageIsAi` labels generated illustrations on recipe detail pages. Ten matching images were created using built-in imagegen and saved in `public/images/editorial/`; exact prompts are in `docs/editorial-image-prompts.json`. These are editorial illustrations, not photographs of tested cooking results.
- Cloudinary **Create/Upload permission** is required in addition to successful `cloudinary:check`. The configured key currently passes ping but upload returns HTTP 403 (`missing permissions`, `create`); external upload and production recipe seeding are pending that permission. No remote deployment is included in this slice.
- On 2026-09-21, both the auth limiter and editorial migrations were applied to configured Neon after isolated tests and a clean identity preflight. The requested ACTIVE administrator was provisioned without inserting test users. The starter collection is not published yet.
- Local checks passed: lint, TypeScript, production build without DB/secrets, 77 unit/component tests, 10 isolated PostgreSQL integration tests, 27 offline Chromium scenarios and two full auth/editorial journeys. Remote CI/deployment verification remains separate.

### Explicit provisioning and seed commands

Migrations never seed data or provision accounts automatically. Inspect the target database first, test saved migrations locally, and use a direct Neon connection for deployment. The new `editorial_recipes` migration adds two false-by-default flags without changing existing attribution.

```bash
npm run admin:create -- --email admin@example.com --confirm-target
npm run images:editorial -- --confirm-upload
npm run seed:editorial -- --email admin@example.com --confirm-target
```

`admin:create` creates one ACTIVE ADMIN/Profile with a random scrypt-hashed password and prints the credentials once for the operator. Do not run it through a shared log collector. Existing email/username identities cause rollback; it never resets a password or promotes an existing account. The default internal profile username is `cookly-admin`.

`images:editorial` uploads the ten approved local covers using stable, non-overwriting Cloudinary public IDs and emits public URL/key JSON. Save the reviewed JSON as `prisma/starter-images.json` before running `seed:editorial`. The seed requires an active administrator, creates ten published unverified editorial recipes with canonical ingredients, and runs in one transaction. Re-running skips existing owned seed recipes, preserving edits and publication status. Conflicting identities abort the transaction. Do not use the legacy fictional `demo-data.sql` on production.

Pass `--test` instead of `--confirm-target` for provisioning/seed against `TEST_DATABASE_URL`; only a loopback database named `cookly_test` is accepted. Integration and browser tests use disposable identities and local images, never production Neon or live Cloudinary uploads. Abandoned uploads are not automatically deleted: retain them for operator review; do not delete an image still referenced by a recipe.

## Home and design

- Editorial typography, liquid-glass surfaces, responsive navigation, category links and a secondary Pantry teaser follow `design-package/home.png`. The hero features a real published recipe when the catalog has content.
- Theme preference respects the system initially and persists an explicit light/dark choice. Mobile navigation supports keyboard/Escape; native preview dialogs trap focus and return it to their trigger.
- Home stays a Server Component. `/?q=salmon`, `/?category=vegetarian` and `/?page=2` query the catalog. Invalid/repeated query values safely fall back to defaults.
- No fictional community authors or engagement counts are rendered. Sign in opens real authentication; Pantry remains explicitly deferred.
- Loading, empty, safe retry-error and branded 404 states are included. A standalone `/discover` and the Pantry routes remain unimplemented.
- DM Sans and Lora are self-hosted with their SIL licenses in `src/app/fonts/`. Legacy demo assets remain local, while new editorial covers use Cloudinary after explicit upload. There is no runtime AI dependency; offline tests use local image fixtures.

## Historical content state — 2026-09-18

Home no longer renders fictional recipes, creators, food photographs, the kitchen background or example Pantry contents. It retains the approved shell, typography, themes and category navigation, with an explicit catalog-not-connected empty state. Search/category parameters are UI state only, not database search. No database records were removed.

`prisma/demo-data.sql` is already an optional, repeatable SQL seed. Keep it separate from migrations: migrations change schema; seed data populates a deliberately selected development/demo database. Do not run demo seeding automatically during migrations, builds, CI or production deployment. Future reference-data seeding (categories/cuisines/canonical ingredients) should be separate from demo users/recipes. Original illustrative assets remain available for this optional seed, but are not requested by Home.

Cloudinary is the selected photo provider. See `docs/photo-storage.md` for the original comparison. The current editorial milestone adds ADMIN-only cover uploads; public uploads remain deferred.

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
- `AUTH_SECRET`: required for authentication operations, not offline builds/tests. Use a cryptographically random value of at least 32 characters, never a placeholder in production.
- `NEXTAUTH_URL`: canonical application origin, e.g. `http://localhost:3000` locally and the HTTPS site origin in production. Vercel can infer its deployment URL when this is absent. Keep preview/production settings separate.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: server-only Cloudinary configuration. Required only when using storage or running `npm run cloudinary:check`, not for builds or CI. Never expose the secret in client code or commit real values. The check performs an authenticated ping without uploading or changing assets.
- `NEXT_PUBLIC_APP_URL`: optional HTTP(S) public application URL; the example uses `http://localhost:3000`. Never put secrets in public variables.

Prisma uses `@next/env`, matching Next.js loading: process environment first, then environment-specific local files, `.env.local`, environment-specific files, and `.env`. CLI development commands default to development; set `NODE_ENV=production` when using production-specific files. Tests skip `.env.local`. Empty/whitespace-only values are treated as absent. Invalid configuration errors list variable names without exposing their values.

## Database

The schema contains the 21 supplied domain models plus `AuthRateLimit`, and 9 enums. It includes users/profiles, authentication records, recipes/taxonomy, social relationships, Pantry, reports and moderation history. The generated client lives in `src/generated/prisma/` and is ignored by Git.

The `20260916000000_init_cookly` migration was generated from an empty database model using `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script`. It includes the supplied schema's tables, foreign keys, indexes and delete actions without changing the data model. On 2026-09-18 it was successfully applied to the configured, initially empty Neon database using a direct connection. This does not confirm the database environment configured in Vercel.

### Optional demo data

Open `prisma/demo-data.sql`, copy the **entire file** into Neon SQL Editor, select the intended branch/database, and run it after the migration. It is a data-only seed, not a schema migration. It is not run automatically during build or deployment.

The file creates 5 fictional users/profiles, 5 categories, 4 cuisines, 4 tags, 31 canonical ingredients and 5 published, unverified recipes with 43 ingredient rows and 20 ordered steps. Demo users have reserved `.example` email addresses, no passwords, no sessions and no elevated roles; they are not login credentials. No fake likes, comments or verification are added. Running this file intentionally adds demo content; skip it for a clean production database.

The legacy optional demo seed references `/images/*.webp`. Current discovery reads the database, so importing that seed would expose its fictional recipes. Prefer the explicit editorial seed above.

The seed runs in one transaction. Existing IDs are skipped, never updated; an existing recipe's children are left untouched. Conflicting unique names/slugs belonging to different IDs cause a rollback instead of silently linking demo content to real records. Re-running is safe, but does not repair edited/deleted children of an existing demo recipe. On an error, roll back the failed transaction before retrying; do not run individual fragments.

The SQL was executed twice in a transaction against Neon to verify constraints and repeatability, then rolled back. **Demo data has not been persistently inserted**; the file is ready for manual import.

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
- Authentication uses NextAuth 4 Credentials/JWT without an adapter. `Account`, `Session` and `VerificationToken` remain unchanged and unused by credentials login. A future OAuth/adapter integration must explicitly resolve camelCase token fields and the absent `User.name` mapping.

## Authentication — 2026-09-18

`/auth/sign-up` creates a normalized email/username, scrypt password hash and Profile in one transaction. `/auth/sign-in` uses Credentials and a seven-day HttpOnly, SameSite=Lax session cookie (Secure on HTTPS). `/settings/account` reads the current user's name, username and email; it is private and noindex. Auth forms follow `design-package/auth.png` with local decorative photography only. OAuth, email confirmation, password reset, profile editing and avatar uploads are intentionally absent.

Password policy: 8–128 characters without trimming or composition rules. Hashes use asynchronous scrypt (`N=131072`, `r=8`, `p=1`), random salts, a versioned encoding and timing-safe comparison. Absent/passwordless accounts perform a dummy hash check. Protected services must use `requireUser`/`requireModerator`, which query current database status/role; JWT roles and client IDs are not authorization inputs.

`AuthRateLimit` stores HMAC-only identifiers, atomic fixed-window counters and expiry. Login allows 10 attempts per normalized email and 50 per IP per 15 minutes; registration allows 5 per IP per hour. Expired records are removed in bounded batches during auth activity. Only `x-vercel-forwarded-for` in the Vercel runtime is trusted; local/non-Vercel traffic shares a fallback bucket. Limiter/storage failures deny authentication. NextAuth protects credential/signout POSTs with CSRF tokens; registration uses Next.js Server Action origin protection.

### Auth presentation

Sign in and registration share a native modal dialog. In-app navigation intercepts the auth URL and preserves the underlying page and scroll; direct links/reloads show the same modal over Home. Mode switches use Next.js-supported native history replacement inside the existing dialog, keeping one history entry and clearing form values. Closing an intercepted modal goes back; direct access closes to Home. Successful login replaces the URL with the validated callback.

The public parallel auth slot explicitly clears on Home and account destinations. Add a null slot page for future non-auth destinations rather than a global catch-all, which can mask genuine HTTP 404s. Background controls are inert while the dialog is open. Pending submissions disable closing and switching.

Shared glass tokens separate backdrop optics, tint, a convex light/dark rim, and pointer-following glints. Categories, green buttons, search, auth tabs, Sign in and icon controls share the material. Pointer coordinates are written to CSS variables in one delegated, event-driven animation frame; there is no React render per movement or idle animation loop. Focus retains a separate outline and static highlight; touch uses a pressed highlight; reduced motion disables tracking and pending/disabled controls do not glint.

Chromium progressively enhances the header, controls and modal rim with local SVG displacement filters. A deterministic rounded-rectangle map bends only the edges, without turbulence or filtering text. Maps are regenerated only when geometry changes and released with their elements. Firefox/WebKit deliberately retain the CSS reflection/blur material: accepting `backdrop-filter: url(...)` does not prove that an engine renders it correctly. The header fallback uses a denser tint so navigation stays readable even without backdrop blur. This approximates lens-like glass, not the proprietary iOS renderer.

At desktop widths (1024px+), both auth modes share a 960px-wide, `min(720px, 100dvh - 48px)`-tall, 40/60 composition. The existing local photo fills the left panel with a fixed crop and caption scrim. Only the form remounts/fades; paired registration fields, validation messages and scrolling never resize the window or photo. Tablet/mobile hide the photo, scroll the form internally, and keep the close button outside the scroll area.

Additional visual checks (after a production build):

```bash
node scripts/verify-glass-lens.mjs
npx playwright install firefox webkit
npx playwright test --config playwright.glass.config.ts --workers=1
```

The optical fixture compares displacement off/on on a checkerboard using the same compositing pipeline: the rim must visibly change while text pixels remain identical. Chromium E2E records glint videos and checks photo DOM identity/exact geometry, both themes, keyboard, reduced motion, pending, and touch. Screenshots/videos and the optical comparison are local ignored artifacts under `test-results/`; run the optical fixture after E2E, since the default E2E run clears that output directory.

### Rollout: separate from deployment

1. Configure `AUTH_SECRET`, `NEXTAUTH_URL` and the intended `DATABASE_URL` securely.
2. Run `npm run auth:preflight` against that database. It reports only counts of normalization conflicts/noncanonical identifiers and never changes records. Resolve any failures manually before rollout.
3. After explicit approval, use a direct PostgreSQL connection and `npm run prisma:deploy` to apply `20260918000000_auth_rate_limits`.
4. Deploy and verify register → login → account → logout on the intended Vercel environment.

The auth migration was validated on isolated PostgreSQL and applied to configured Neon on 2026-09-21. Identity preflight found zero conflicts/noncanonical values. **Remote Vercel authentication is not yet verified and deployment remains separate.** The migration creates the limiter table without rewriting existing user data.

### Isolated auth tests

Provision an empty disposable PostgreSQL database named `cookly_test` on loopback, then set `TEST_DATABASE_URL` in the shell (never point tests at Neon). Test commands refuse non-loopback databases and never fall back to production `DATABASE_URL`.

```bash
npm run test:db:migrate
npm run test:integration
npm run build
npm run test:auth:e2e
```

The integration/E2E configurations inject test-only secrets and the isolated URL; E2E generates a fresh random secret per run. Full E2E uses port 3101; offline Home/auth UI tests use port 3100 with empty DB/secret settings. Both require free ports and always start fresh production servers. Tests write disposable users/limit records only to `cookly_test`; discard that test database when finished. Never use real personal data there.

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

`.github/workflows/ci.yml` runs on pull requests, pushes to `main`, and manual dispatch using Node.js 22. The general job validates, lints, typechecks, tests, builds and runs Chromium without a database or secrets. A separate auth job uses disposable PostgreSQL 17 with test-only credentials/secrets to apply migrations and run integration/full auth E2E. Neither job accesses production Neon. Failure reports are retained for seven days. A successful remote workflow run must be confirmed separately.

See `PRODUCT.md` for behavior, `ROADMAP.md` for milestone status and `AGENTS.md` for engineering rules. Approved visual references are in `design-package/`. User-owned recipe editing, avatar uploads and deployed Vercel smoke verification remain subsequent milestones.
