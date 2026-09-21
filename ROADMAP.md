# Cookly — MVP Roadmap

## Delivery philosophy

The roadmap is intentionally vertical-slice first. Every phase should leave the app in a runnable, demoable state.

Target: **14–20 focused development days**.

Do not start post-MVP work until the MVP quality gate is green.

## Authentication and sticky navigation — 2026-09-18

### Editorial studio and starter collection — 2026-09-21

- [x] Disable Server Function argument logging; preserve generic auth errors and rate limiting.
- [x] Migration adds persisted editorial attribution and AI-cover provenance; tested against isolated PostgreSQL.
- [x] ADMIN-only overview, owned recipe list and editor with canonical ingredients, ordered steps, draft/publish/archive and server ownership checks.
- [x] Database-backed Home search/categories/pagination and public recipe details; editorial author is Cookly without administrator identity.
- [x] ADMIN-only validated Cloudinary cover uploads with HMAC receipts, origin checks and bounded rate limits.
- [x] Explicit conflict-safe administrator provisioning and non-overwriting transactional starter seed; tested on isolated PostgreSQL.
- [x] Ten complete English recipe drafts and dish-specific generated covers saved locally; prompts and provenance documented.
- [x] Offline production build, lint and 77 unit/component tests; 10 PostgreSQL integration tests passed.
- [x] Chromium: 27 offline scenarios and two complete auth/editorial journeys passed; responsive studio screenshots reviewed in both themes.
- [x] Applied auth/editorial migrations to configured Neon and provisioned the requested ACTIVE administrator on 2026-09-21. No test users or starter recipes were inserted there.
- [ ] Upload approved covers and publish the ten starter recipes: blocked by Cloudinary key missing `create` permission (ping succeeds).
- [ ] Confirm remote CI and Vercel smoke checks after a separate deployment.

The remaining historical sections retain their delivery-time status. Avatars, public profile editing, ordinary-user recipe editing and full moderation remain later milestones.

### Modal and glass follow-up — 2026-09-21

#### Lens material and stable photo refinement

- [x] Layered glass with deterministic SVG edge displacement in Chromium; visually distinct CSS fallback in Firefox/WebKit, without new dependencies or continuous animation.
- [x] Pointer-following glints on categories, green controls, Sign in, search, auth tabs and icons; explicit Sign in rounding, separate keyboard rings, touch/disabled/reduced-motion handling.
- [x] Fixed desktop modal geometry (960px / up to 720px / 40:60), persistent full-height local photo and caption, paired registration fields, internal form scrolling and always-accessible close control.
- [x] Preserve server/client boundaries, auth endpoints, callback/history/focus behavior, database schema, uploads and deployment scope.
- [x] Lint, typecheck, production build, 68 unit/component tests, 6 isolated PostgreSQL integration tests, 27 offline Chromium scenarios, full auth E2E and 4 Firefox/WebKit fallback scenarios passed locally. Reviewed both themes and desktop/tablet/mobile screenshots; recorded pointer-motion videos. The optical fixture measured 4,788 changed rim pixels and zero changed text pixels. Modal/photo bounds and photo DOM identity remain unchanged across mode switches and validation errors.
- Production Neon, auth APIs, migrations, uploads and deployment were not changed. The temporary local test PostgreSQL was stopped after verification; remote smoke checks remain separate.

Initial modal delivery (the one-shot glint below is superseded by the refinement above):

- [x] URL-addressable auth modal over the current page; direct links/reloads over shared Home content.
- [x] Desktop photo/form composition, compact mobile/tablet form, native dialog focus/inert handling, scroll lock and pending close protection.
- [x] Shared reflective glass tokens and one-shot 1.8-second hover/focus border glints, including reduced-motion alternatives.
- [x] Preserve server auth, database schema, sticky header and noindex behavior; keep upload work deferred.
- [x] Lint, typecheck, production build, 66 unit/component tests (two workers), 6 isolated PostgreSQL integration tests, 23 offline Chromium scenarios and the full register/login/account/logout/CSRF scenario passed. Desktop/tablet/mobile screenshots checked in both themes; pending protection, focus, history, scroll restoration, reduced motion and 520px-tall mobile viewport covered.
- Remote Vercel verification remains separate. Test PostgreSQL and Playwright servers were stopped after verification; no production database changes.

- [x] Credentials registration/login/logout with NextAuth 4 JWT sessions; no Prisma adapter or OAuth.
- [x] Atomic User/Profile creation, normalized identifiers, versioned scrypt hashes and generic failures.
- [x] Server access helpers re-read current role/status; deleted, suspended and banned users lose protected access.
- [x] PostgreSQL atomic HMAC-keyed auth limits; new `auth_rate_limits` migration checked on isolated PostgreSQL.
- [x] Read-only connected-Neon identity preflight: zero conflicts and zero noncanonical identifiers; no existing records changed.
- [x] Responsive auth forms following `design-package/auth.png`, local decorative photo, both themes and accessible errors/pending/password visibility.
- [x] Protected read-only account screen, account/signout menu, noindex auth/settings.
- [x] Sticky glass navigation with anchor clearance and route-aware Home highlighting.
- [x] Separate CI PostgreSQL auth integration/E2E job; offline checks remain independent of production secrets/database.
- [x] Local lint, typecheck, formatting, Prisma validation, 66 unit/component tests, 6 real PostgreSQL integration tests, production build without DB/auth credentials, and 17 Chromium scenarios passed. Desktop/tablet/mobile light/dark screenshots reviewed; keyboard, reduced motion, long names, validation errors, pending states, session refresh, guest redirects and CSRF rejection covered.
- [ ] Apply auth migration to connected Neon as a separately approved step.
- [ ] Confirm remote CI and deployed Vercel auth smoke flow after deployment.

Next: authenticated Cloudinary avatar/recipe-cover upload, then public profile/account editing. No upload endpoints or editing controls are included in this auth slice. Historical milestone notes below describe their state at that time.

## Foundation synchronization — 2026-09-16

- [x] Supplied Prisma schema validated; client regenerated for all 21 models and 9 enums.
- [x] Initial `init_cookly` SQL migration and PostgreSQL migration lock prepared without connecting to a database.
- [x] Next.js and Prisma use consistent `.env*` loading, with safe Zod validation and no fallback database credentials.
- [x] Generation is part of development/typecheck/build; Node.js 22 is declared in the runtime configuration.
- [x] GitHub Actions workflow added for install, schema validation, typecheck, lint, tests, build and Chromium smoke testing.
- [x] Documentation references the existing `design-package/` directory.
- [x] Connect the configured PostgreSQL/Neon database and apply the initial migration (2026-09-18); seed constraints and repeatability tested with rollback. Vercel connectivity remains unconfirmed.
- [ ] Confirm the first successful remote GitHub Actions run after publishing the repository.
- [x] Implement local fonts, semantic design tokens, public route group and Home shell in the UI milestone.

Phase 0 remains partially complete until database and remote CI checks are confirmed. No product routes, seed content or active authentication were added in this iteration.

Local verification: clean `npm ci`, typecheck with regenerated Prisma/Next.js artifacts, lint, formatting, Prisma validation, 21 unit/component tests, production build, and one Chromium smoke test passed. The cold build required network access for the current Google Fonts setup. The saved SQL matches a fresh schema-only Prisma diff; no migration was applied.

### Notes for subsequent milestones

- Preserve the approved visual direction; evaluate denser glass behind small text, lighter mobile backgrounds and explicit matched/required ingredient counts alongside Pantry percentages during UI work.
- Reference-only star ratings, OAuth buttons, public Saved tabs and Collections do not expand the feature scope defined in PRODUCT.md.
- Before enabling an Auth.js Prisma adapter, review `Account` token-field naming (currently camelCase, while the standard adapter expects names such as `access_token`) and the absent `User.name` field. Decide mapping/schema changes during the auth milestone and ship a migration if needed; client generation does not certify adapter compatibility.

## Phase 0 — Project foundation

**Target: Day 1**

Deliverables:

- create Next.js 16+ project;
- TypeScript strict;
- Tailwind setup;
- shadcn primitives configured but visually restyled later;
- Framer Motion;
- Prisma 7 + PostgreSQL/Neon;
- `prisma.config.ts` and generated client location aligned with schema;
- environment validation;
- base route groups;
- global light/dark theme tokens;
- local fonts and typography setup;
- copy `design-package/` references into repository;
- lint/typecheck/test/build scripts;
- Vitest + RTL + Playwright scaffolding;
- CI workflow for lint/typecheck/test/build.

Definition of done:

- app boots locally;
- database connects;
- initial migration works;
- dark/light theme toggles;
- CI passes on clean repo.

## Phase 1 — Design system + public shell

**Target: Days 2–3**

Implementation update — 2026-09-17:

- [x] Responsive Home composition, semantic light/dark glass tokens, local DM Sans/Lora and optimized local demo images.
- [x] Public shell, desktop/mobile navigation, persistent/system-aware theme switch and reusable recipe cards.
- [x] Server-rendered, URL-driven filtering of explicitly labeled presentation fixtures; production discovery remains Phase 2.
- [x] Keyboard-accessible preview dialogs for deferred functions; no fake accounts, saved recipes, ratings or verification.
- [x] Loading, empty, retry-error and branded not-found shells; reduced-motion and focus styles.
- [x] Local lint, typecheck, formatting, 32 unit/component tests, production build and 12 Chromium E2E scenarios passed. Desktop/tablet/mobile screenshots reviewed in light/dark; keyboard, reduced motion, empty and long-content states checked. Loading/retry-error behavior is covered by component tests. Remote CI remains unconfirmed.

Deliberate reference adaptations: anonymous Sign in replaces the mockup's signed-in user; Categories replaces the not-yet-built Community destination; recipe metadata omits fabricated engagement; the Pantry teaser is visibly marked Coming soon. Dense caption glass improves text contrast, and mobile reduces the kitchen background. Generated images are illustrative preview assets, not real community submissions. No database migration was applied, no schema changed, and no dependencies or environment variables were added.

Deliverables:

- Cookly semantic color tokens;
- liquid-glass surface tokens;
- typography scale;
- radius/blur/shadow/motion tokens;
- responsive container primitives;
- navigation desktop/tablet/mobile;
- reusable RecipeCard;
- reusable glass controls;
- skeletons/empty/error states;
- reduced-motion strategy.

Pages:

- `/` shell closely matching `design-package/home.png`;
- not-found/error shells.

Testing:

- basic component tests for theme toggle/navigation;
- Playwright visual smoke flow on desktop/mobile viewport.

Definition of done:

- Home visual direction clearly matches approved reference;
- mobile and tablet navigation are intentional, not scaled desktop.

## Phase 2 — Taxonomy, seed data, discovery

**Target: Days 4–5**

Database update — 2026-09-18:

- [x] Apply `20260916000000_init_cookly` to the configured empty Neon database using a direct connection; migration history records success.
- [x] Prepare `prisma/demo-data.sql` for manual import: 5 fictional creators, taxonomy, 31 canonical ingredients and 5 published/unverified recipes with ordered ingredients and steps.
- [x] Execute the seed twice inside a transaction to verify repeatability, then roll back; no demo content persisted.
- [ ] Import demo data into the intended database when ready.
- [ ] Connect discovery to Prisma; Home now shows an explicit empty state, without presentation fixtures.
- [ ] Verify the Vercel deployment uses the intended Neon database.

Image handling is deferred; seed records reference the existing local illustrative assets. No authentication credentials or privileged users are seeded. The earlier foundation/UI notes describe their historical verification state.

Content cleanup — 2026-09-18:

- [x] Remove fictional recipes/authors, hero photography, kitchen background and Pantry example contents from the public UI. Keep the design shell and explicit unavailable/empty states; do not delete database records.
- [x] Keep the existing SQL seed opt-in, separate from schema migrations and deployment.
- [x] Research photo storage options in `docs/photo-storage.md`; the user selected Cloudinary.
- [x] Add official Cloudinary SDK, lazy server-only configuration, safe environment validation and an opt-in read-only connectivity check. Public upload endpoints remain deferred until authentication/authorization exists.
- [x] Confirm local Cloudinary credentials with authenticated API ping (no asset changes); lint, typecheck, 37 tests and production build pass. Vercel credentials and end-to-end uploads are not yet verified.
- [x] Verify cleanup with lint, typecheck, 30 unit/component tests, production build and 12 Chromium E2E tests. Inspect desktop/tablet/mobile empty states in light/dark; keyboard, reduced motion, long search, loading/error components and no demo-photo requests covered. Tests were rerun against a fresh server after stopping the stale local preview.
- [ ] Complete authentication/ownership checks before exposing avatar or recipe-cover uploads.
- [ ] Implement validated uploads, image normalization, safe replacement and orphan cleanup after selecting the provider.

Deliverables:

- Category/Cuisine/Tag/Ingredient repositories/services;
- deterministic seed with demo creators + recipes;
- `/discover`;
- recipe search;
- category/cuisine/tag/difficulty/time filters;
- URL search params as filter state;
- sorting;
- pagination;
- query indexes confirmed.

Home becomes data-driven:

- featured recipe;
- featured/community recipes;
- curated categories;
- Pantry teaser.

Testing:

- unit tests for query/filter mapping;
- E2E search/filter flow.

Definition of done:

- recruiter can browse a convincing public app without authentication.

## Phase 3 — Recipe details + SEO

**Target: Day 6**

Deliverables:

- `/recipes/[slug]`;
- ingredients;
- ordered steps;
- creator summary;
- tags/category/cuisine;
- verified badge behavior;
- public metadata;
- Open Graph metadata;
- Schema.org Recipe when valid;
- related recipes if query remains simple.

Testing:

- recipe public visibility rules;
- archived/draft/hidden recipe access behavior;
- not-found behavior.

Definition of done:

- recipe detail page is portfolio-ready and indexable.

## Phase 4 — Authentication + profile

**Target: Days 7–8**

Deliverables:

- Auth.js integration;
- email/password credentials;
- secure password hashing;
- register/login/logout;
- protected route helper;
- `/auth/sign-in` and `/auth/sign-up` matching `design-package/auth.png`;
- profile creation on registration;
- `/u/[username]` matching `design-package/profile.png`;
- `/settings/profile`;
- avatar upload if storage setup is ready.

Testing:

- register/login/logout E2E;
- authorization utility tests;
- duplicate email/username handling.

Definition of done:

- new user can create account and reach a complete public profile.

## Phase 5 — Recipe creator flow

**Target: Days 9–11**

Deliverables:

- `/recipes/new`;
- `/recipes/[id]/edit`;
- validated recipe form;
- ingredient autocomplete against canonical Ingredient table;
- add/remove/reorder ingredient rows;
- add/remove/reorder recipe steps;
- cover image upload;
- draft save;
- publish;
- archive;
- ownership enforcement;
- verified recipe material edit resets verification.

UX:

- autosave is optional, not required;
- form should clearly communicate validation and pending states;
- mobile recipe editor must remain usable.

Testing:

- service tests for publish/edit/archive permissions;
- create/publish recipe E2E;
- unauthorized edit E2E.

Definition of done:

- a creator can publish a real recipe end-to-end.

## Phase 6 — Social layer

**Target: Days 12–13**

Deliverables:

- like/unlike;
- save/unsave;
- `/saved`;
- comment create/delete;
- follow/unfollow;
- profile counters;
- recipe like/comment counts;
- optimistic like/save interactions where robust.

Do NOT add:

- chat;
- notifications;
- nested discussion trees.

Testing:

- like/favorite uniqueness;
- user cannot delete other user's comment;
- cannot follow self;
- social authorization E2E.

Definition of done:

- Cookly feels like a small social product, not only a recipe database.

## Phase 7 — Pantry matcher

**Target: Days 14–15**

Deliverables:

- `/pantry` matching `design-package/pantry.png`;
- ingredient autocomplete;
- persistent Pantry for logged-in users;
- guest temporary ingredient selection;
- match percentage calculation;
- missing ingredient calculation;
- sorting/ranking;
- filters: time/difficulty/cuisine/max missing;
- clear match explanation in recipe cards.

Testing:

- unit tests for matching algorithm;
- optional ingredients do not reduce score;
- ranking tie-break tests;
- Pantry E2E.

Definition of done:

- Pantry is deterministic, fast and understandable without AI.

## Phase 8 — Verification + reports + admin

**Target: Days 16–17**

Deliverables:

- verification request flow;
- report recipe/comment flow;
- `/admin` matching `design-package/admin.png` dark reference;
- `/admin/verification`;
- `/admin/reports`;
- `/admin/users` minimal moderation view;
- approve/reject verification;
- resolve/dismiss reports;
- hide/restore recipe/comment;
- moderation audit actions;
- moderator/admin route guards.

Testing:

- role permission matrix tests;
- verification E2E;
- report/moderation E2E;
- normal user cannot invoke admin action even by direct request.

Definition of done:

- admin workflow is real, not a static dashboard mockup.

## Phase 9 — Portfolio polish

**Target: Days 18–20**

Visual QA:

- compare every implemented screen with `design-package/*.png`;
- desktop/tablet/mobile;
- light/dark themes;
- long names/titles;
- empty states;
- loading states;
- error states;
- keyboard/focus states;
- reduced motion.

Performance:

- image sizing/compression;
- remove avoidable client components;
- inspect N+1 queries;
- review indexes;
- paginate everything unbounded;
- check bundle/client JS.

SEO:

- metadata;
- sitemap;
- robots;
- public canonical URLs;
- noindex auth/admin/settings.

Engineering:

- README with screenshots, architecture, setup and demo credentials;
- `.env.example`;
- deterministic seed;
- CI green;
- production deployment;
- demo admin and user accounts;
- remove development-only shortcuts.

Final quality gate:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

MVP is complete only when all required checks pass.

# Post-MVP roadmap

## v1.1 — Collections & better social discovery

- user collections;
- collection public/private mode;
- creator following feed;
- trending recipe ranking;
- improved creator discovery.

## v1.2 — Notifications

- likes/comments/follows/verification notifications;
- notification center;
- no realtime requirement initially.

## v1.3 — Cooking utility

- shopping list;
- meal plan;
- serving multiplier with unit-aware display where feasible;
- one-level comment replies.

## v1.4 — AI assistant, optional

Only after the non-AI product is mature.

Potential features:

- explain substitutions for missing ingredients;
- answer questions about an opened recipe;
- semantic recipe search;
- convert rough creator notes into structured draft fields.

Rules:

- AI may assist, never silently publish;
- AI output is always treated as untrusted data and validated;
- core product must still work if AI provider is disabled;
- introduce no paid AI dependency without explicit approval.

# Suggested implementation order for Codex prompts

Give Codex one bounded milestone at a time:

1. foundation only;
2. design system + Home shell;
3. Prisma migration + seed + discovery;
4. recipe details;
5. auth + profile;
6. creator flow;
7. social actions;
8. Pantry;
9. moderation/admin;
10. polish and production hardening.

Never ask Codex to “build Cookly” in one prompt. Require each milestone to pass lint/typecheck/tests/build before moving on.
