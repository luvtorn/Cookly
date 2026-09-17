# AGENTS.md — Cookly Engineering Guide

## 1. Product

Cookly is a social recipe platform where people discover recipes, publish their own recipes, maintain a pantry, find recipes based on ingredients they already have, save recipes, like them, comment on them, follow creators, and build a cooking profile.

The product must remain useful without AI. AI features are optional later enhancements, not the core architecture.

Primary goals:

- portfolio-quality consumer product suitable for recruiter/technical interview review;
- polished, responsive, accessible UI;
- realistic production engineering practices without unnecessary enterprise complexity;
- approximately 0 PLN/month infrastructure cost for portfolio-scale usage;
- an MVP that can be completed quickly and extended safely later.

## 2. Roles

- GUEST: browse/search recipes and public profiles.
- USER: guest permissions + publish/edit own recipes, pantry, favorites, collections, likes, comments, follows.
- MODERATOR: review reports and recipe submissions where permitted.
- ADMIN: moderation, verification, taxonomy/content administration, user moderation and operational overview.

Never implement authorization only in the UI. Every protected mutation must be authorized server-side.

## 3. Recipe trust model

Publication follows PRODUCT.md and the supplied Prisma schema:

- DRAFT
- PUBLISHED
- ARCHIVED

A user may publish directly without admin approval. Published recipes are unverified by default. Moderation can hide content independently using `isHidden`.

Verification is a separate workflow: `NONE`, `PENDING`, `VERIFIED`, `REJECTED`. Creators request review after publication; moderator/admin approve or reject verification and record the decision. Rejection of verification does not itself unpublish a recipe. Do not imply medical, nutritional, safety, or professional certification. In UI prefer wording such as “Cookly verified” / “Reviewed by Cookly”.

Users may edit their own recipes. Material edits reset verification to `NONE` for MVP.

## 4. MVP scope

Required:

- public landing/discovery page;
- recipe feed/catalog;
- recipe search;
- filters (category, cuisine, difficulty, preparation time and relevant dietary tags);
- recipe details;
- account registration/login/logout;
- public user profiles;
- create/edit/delete own recipe;
- image upload for recipe cover;
- ingredient and instruction-step editor;
- likes;
- comments;
- favorites/saved recipes;
- pantry (“What can I cook?”);
- recipe matching based on pantry ingredients;
- admin moderation queue;
- admin approve/reject/verify actions;
- responsive desktop/tablet/mobile UI;
- loading, empty, error and not-found states.

Strongly preferred after core MVP:

- collections;
- following creators;
- notifications;
- reporting recipes/comments;
- recipe view counters/trending ranking.

Explicitly out of MVP:

- payments/subscriptions;
- chat/direct messages;
- live video;
- complex recommendation ML;
- native mobile apps;
- AI recipe generation;
- AI chat;
- grocery integrations;
- calorie/medical claims requiring authoritative nutritional datasets.

## 5. Technology stack

### Runtime / language

- Node.js 22 LTS
- TypeScript with `strict: true`
- npm

### Application

Use a single Next.js application for MVP. Do NOT create a separate NestJS service unless a real architectural need appears (multiple clients, independent scaling, heavy background processing, public API, etc.).

- Next.js 16+
- React
- App Router
- React Server Components by default
- Server Actions for appropriate authenticated mutations
- Route Handlers for HTTP endpoints, uploads/webhooks/public API needs

### UI

- Tailwind CSS
- shadcn/ui primitives where useful
- Radix primitives through shadcn where useful
- Lucide icons
- Framer Motion only for meaningful interaction/transition polish

Do not make every component a shadcn component. Product-specific UI should be custom-built.

### Data / database

- PostgreSQL
- Prisma ORM
- Neon free tier for production/preview database where appropriate

All schema changes must use Prisma migrations. Never use manual production schema edits.

### Authentication

Preferred: Auth.js / NextAuth-compatible solution with Prisma adapter where appropriate.

- email/password credentials may be supported;
- OAuth can be added later;
- passwords must be hashed using a reputable password hashing algorithm/library;
- sessions/tokens must use secure HttpOnly cookies where applicable.

Never store authentication tokens in localStorage unless a documented architecture explicitly requires it.

### Validation

- Zod at external trust boundaries;
- validate all mutations server-side even if client validation exists;
- client validation exists for UX, never as a security boundary.

### Forms

- React Hook Form for complex client forms where it improves UX;
- Zod schemas should be reusable where practical without coupling domain logic to UI.

### Server/client state

- Prefer Server Components and URL search params for server-owned data/filter state.
- TanStack Query only where client-side cache, polling, optimistic updates or interactive refetching provide real value.
- Do not add Redux unless the application develops a genuine global client-state requirement.

### Images/storage

- Store image files in an external object/image storage provider with a free tier (e.g. Cloudinary or compatible service).
- Store only metadata/URLs/public IDs in PostgreSQL.
- Validate file MIME type and size server-side.
- Generate responsive images and use `next/image` where appropriate.

### Testing

- Vitest for unit tests where suitable.
- React Testing Library for important interactive components.
- Playwright for critical end-to-end flows.

Minimum critical E2E coverage before calling MVP complete:

1. register/login;
2. create and publish a recipe;
3. admin moderation flow;
4. search/filter recipe;
5. pantry matching;
6. like/save/comment authorization behavior.

### Quality tooling

- ESLint
- Prettier
- TypeScript typecheck
- Husky + lint-staged optional; use only if it improves workflow rather than creating friction.

### Deployment

- Vercel for the Next.js app
- Neon PostgreSQL
- free-tier image storage
- GitHub Actions for CI where useful

Target portfolio operating cost: ~0 PLN/month. Do not introduce a paid dependency without documenting why it is needed and obtaining explicit approval.

## 6. Suggested domain model

This is a starting model, not permission to blindly create every table before the relevant feature exists.

Core entities:

- User
- Profile
- Recipe
- RecipeImage (only if multiple images are implemented)
- Ingredient
- RecipeIngredient
- RecipeStep
- Category
- Cuisine
- Tag
- RecipeTag
- Like
- Comment
- Favorite
- PantryItem
- Collection / CollectionRecipe (post-MVP if needed)
- Follow (post-MVP if needed)
- Report (post-MVP if needed)
- Notification (post-MVP if needed)
- ModerationAction / RecipeReview

Important constraints:

- Like: unique(userId, recipeId)
- Favorite: unique(userId, recipeId)
- Follow: unique(followerId, followingId), cannot follow self
- Pantry item should not create uncontrolled duplicate ingredients
- slugs must be unique and stable enough for public URLs
- recipe ownership must be explicit via authorId
- timestamps: createdAt, updatedAt where relevant
- prefer soft/archive semantics for content whose removal affects public history; do not add soft-delete everywhere by default.

## 7. Ingredient normalization

Pantry matching is a core feature and must not depend on comparing arbitrary display strings.

Use canonical Ingredient records with normalized names. RecipeIngredient references an Ingredient and stores recipe-specific amount/unit/display information.

Example:
Ingredient: `chicken breast`
RecipeIngredient: ingredientId + amount `500` + unit `g`

Normalization must be deterministic. Do not use AI for basic ingredient identity in MVP.

Initial matching algorithm:

- required ingredient IDs for recipe;
- pantry ingredient IDs for user;
- calculate intersection/required count;
- expose matched and missing ingredients;
- optionally distinguish optional recipe ingredients;
- rank by match percentage, then quality/popularity tie-breakers.

Do not pretend quantities are sufficient unless quantity/unit conversion has actually been implemented.

## 8. Architecture rules

Organize primarily by domain/feature, not by dumping all logic into generic folders.

Suggested structure:

```
src/
  app/
    (marketing)/
    (app)/
    admin/
    api/
  features/
    auth/
    recipes/
    discovery/
    pantry/
    comments/
    favorites/
    moderation/
    users/
  components/
    ui/
    shared/
  lib/
    auth/
    db/
    validation/
    storage/
  server/
    repositories/
    services/
  types/
prisma/
  schema.prisma
  migrations/
  seed.ts
```

Keep business rules out of React presentation components.

Preferred flow:
UI -> action/route handler -> validation -> service/domain logic -> repository/Prisma -> database

For simple reads, Server Components may query a repository/service directly. Avoid ceremony that adds no safety or clarity.

## 9. Server Components and client boundaries

- Components are Server Components by default.
- Add `"use client"` only when browser APIs, event handlers, hooks or interactive client state require it.
- Keep client boundaries as small as practical.
- Never move an entire page to the client merely because one child needs interaction.
- Fetch server-owned initial data on the server whenever practical.

## 10. API/action conventions

Return predictable typed results.

For actions, use a consistent discriminated result where appropriate:

```ts
type ActionResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: {
        code: string;
        message: string;
        fieldErrors?: Record<string, string[]>;
      };
    };
```

Do not leak stack traces, SQL errors, provider secrets or internal exception messages to users.

HTTP endpoints should use correct HTTP semantics/status codes.

## 11. TypeScript rules

- `strict` mode is mandatory.
- Avoid `any`. If unavoidable at an external boundary, isolate it and narrow immediately.
- Prefer `unknown` over `any` for untrusted data.
- Do not use non-null assertions (`!`) as a shortcut for missing validation.
- Prefer discriminated unions for state machines/statuses.
- Prefer explicit domain types over primitive soup when it improves safety.
- Do not duplicate Prisma-generated types unnecessarily; do create UI/domain DTOs when exposing the full DB model would be wrong.

## 12. Naming

- React components: PascalCase.
- hooks: `useSomething`.
- functions/variables: camelCase.
- constants: UPPER_SNAKE_CASE only for true constants/config keys; otherwise camelCase.
- files: use a consistent lowercase kebab-case convention except framework-required filenames.
- boolean names should read as predicates: `isVerified`, `hasLiked`, `canEdit`.
- handlers should describe intent: `handleSaveRecipe`, not `handleClick`.
- database fields and application code should use English.
- code, commits, comments and documentation should use English.

## 13. React/UI engineering

- Keep components focused; extract when a component has multiple responsibilities, not based on arbitrary line counts.
- Prefer composition over large prop matrices.
- Do not store derived state if it can be calculated safely.
- Avoid `useEffect` for data derivation or synchronization that React/server data flow can express directly.
- Stable list keys must come from entity IDs, never array indexes when ordering can change.
- Forms must expose pending/disabled/error/success behavior.
- Destructive actions require confirmation when accidental activation would be costly.
- Optimistic UI is encouraged for likes/favorites only when rollback/error handling is correct.

## 14. UX/design source of truth

Cookly has an approved visual system. The implementation MUST follow the approved design references stored in `design-package/`. These files are the product design source of truth, not loose inspiration.

Required design reference files:

- `design-package/home.png` — consumer homepage and primary visual language;
- `design-package/auth.png` — authentication layout and responsive direction;
- `design-package/profile.png` — public creator profile;
- `design-package/pantry.png` — pantry / ingredient matching experience;
- `design-package/admin.png` — admin/moderation dashboard and dark-theme reference.

### Design hierarchy

When implementing UI, use this priority order:

1. explicit task requirements;
2. approved design references in `design-package/`;
3. accessibility, responsiveness, and platform constraints;
4. existing project components/tokens;
5. agent judgment.

If implementation and reference conflict visually, the approved reference wins unless reproducing it would break accessibility, responsiveness, security, or required functionality. Do not redesign screens from personal preference.

### Visual language

The approved Cookly design uses a premium Apple-inspired liquid-glass / glassmorphism language:

- frosted translucent surfaces with controlled backdrop blur;
- thin translucent borders and subtle specular highlights;
- layered depth rather than heavy drop shadows;
- generous whitespace and strong separation between sections;
- restrained green accent system with neutral cream/white surfaces in light mode;
- deep charcoal / olive surfaces with restrained green and coral accents in dark mode;
- high-quality food photography as the primary visual content;
- large editorial/display typography for major headings paired with a clean sans-serif UI font;
- rounded components, but avoid excessive pill-shaped controls;
- no decorative user strips, noisy social-proof rows, handwritten doodles, or visual clutter unless explicitly present in the approved reference;
- consumer screens must feel editorial and calm, not like generic SaaS dashboards.

### Homepage constraints

The homepage is discovery-first. It must NOT expose recipe creation as a primary or immediate homepage action.

The homepage should prioritize:

- concise hero;
- search/discovery;
- featured/community recipes;
- curated categories;
- a secondary pantry teaser;
- clear separation between sections.

Do not cram unrelated widgets into the homepage. New features belong on dedicated routes unless the product requirements explicitly place them on Home.

### Responsive design

Every approved screen must be implemented for:

- mobile;
- tablet;
- desktop.

Do not merely scale desktop UI down. Recompose layouts at responsive breakpoints. Navigation, cards, hero media, grids, tables, and admin controls must have deliberate mobile/tablet variants.

Use content-driven breakpoints and Tailwind defaults where practical. Avoid device-specific hardcoded widths.

### Dark mode

Dark mode is mandatory for the full product, not only the admin panel.

- use semantic design tokens/CSS variables;
- never scatter raw light-only colors throughout components;
- ensure imagery, borders, glass opacity, focus states, shadows, and overlays are tuned separately for dark mode;
- persist theme preference and respect system preference on first visit;
- avoid pure black surfaces except where intentional; prefer deep charcoal/olive neutrals matching `design-package/admin.png`.

### Motion

Cookly should feel highly polished and animation-rich without becoming distracting. Use Framer Motion for meaningful motion.

Preferred motion patterns:

- page/section reveal;
- subtle glass panel entrance;
- card hover lift/parallax on pointer-capable devices;
- image scale/crop transitions;
- staggered recipe-card entrance;
- animated active navigation indicators;
- modal/drawer transitions;
- tab/content transitions;
- like/save micro-interactions;
- skeleton-to-content transitions.

Rules:

- motion must never block interaction;
- avoid gratuitous perpetual animation;
- mobile motion should be lighter than desktop;
- respect `prefers-reduced-motion`;
- use transform/opacity where practical to avoid layout thrashing;
- animations must not cause layout shift.

### Design implementation discipline

- Build reusable tokens before repeating visual values.
- Prefer semantic CSS variables such as `--surface-glass`, `--border-glass`, `--text-primary`, `--accent`, rather than copying RGB values everywhere.
- Centralize typography, radius, spacing, shadow, blur, and animation tokens.
- Do not introduce a second unrelated design system.
- shadcn/ui is a primitive library, not the visual identity. Restyle primitives to match Cookly rather than accepting default shadcn appearance.
- Avoid default dashboard/template aesthetics on consumer pages.
- New UI must visually fit beside the reference screens before it is considered complete.

### Visual QA for every UI PR

For meaningful UI changes, verify:

- desktop against the relevant `design-package/*.png` reference;
- mobile layout manually;
- tablet layout manually;
- light mode;
- dark mode;
- keyboard/focus states;
- reduced-motion behavior;
- loading, empty, error, and long-content states.

A UI feature is not done merely because it is functionally correct. It must also be visually consistent with the approved Cookly design system.

## 15. Accessibility

Target WCAG 2.2 AA where practical.

Mandatory:

- semantic HTML;
- keyboard navigation;
- visible focus states;
- labels for form controls;
- alt text for meaningful recipe imagery;
- sufficient contrast;
- buttons for actions, links for navigation;
- dialogs must manage focus correctly;
- do not encode status only by color;
- respect `prefers-reduced-motion`.

## 16. Security

Treat all browser input as untrusted.

Mandatory:

- server-side authorization on every protected mutation;
- Zod validation at boundaries;
- password hashing;
- HttpOnly/Secure/SameSite cookie configuration appropriate to environment;
- CSRF protection where the chosen auth/mutation model requires it;
- rate-limit sensitive endpoints/actions (auth, comments, uploads, recipe creation as needed);
- sanitize or safely render user-generated content;
- never render raw HTML from users without a trusted sanitizer;
- validate upload type and size;
- secrets only in environment variables;
- `.env*` secrets never committed;
- no secrets in `NEXT_PUBLIC_*` variables;
- do not trust role/user IDs sent by the client;
- Prisma queries must scope ownership/permissions server-side;
- protect admin routes and admin actions independently.

## 17. Privacy / user-generated content

Store the minimum personal information required.

- public profile information must be explicitly intended for public display;
- never expose email/password/session/internal moderation fields in public DTOs;
- provide deletion/removal behavior for user-owned content eventually;
- reports/moderation notes are private to moderators/admins;
- logs must not contain passwords, tokens or sensitive session data.

## 18. Performance

- use Server Components for read-heavy public pages;
- paginate feeds/comments; never fetch unbounded tables;
- select only needed DB fields;
- avoid N+1 queries;
- add DB indexes based on actual query patterns;
- debounce client search only when needed; prefer URL/search-param driven server search where suitable;
- optimize images;
- lazy-load expensive non-critical client UI;
- do not prematurely cache everything;
- measure before complex optimization.

Expected indexes eventually include fields used for recipe publication/status, author, slug, category/cuisine relationships, creation date, moderation queue and normalized ingredient lookup.

## 19. SEO / public web

Public recipes and creator profiles should be indexable.

- meaningful metadata/title/description;
- canonical URLs;
- Open Graph metadata;
- sitemap and robots configuration;
- semantic headings;
- recipe structured data (Schema.org Recipe) when the recipe contains the necessary fields;
- stable readable recipe slugs.

Private account/admin pages must not be indexed.

## 20. Error handling / observability

- use typed/domain errors where useful;
- global user-facing errors must be understandable and non-technical;
- log unexpected server errors with contextual identifiers, never secrets;
- use Next.js error boundaries (`error.tsx`) and `not-found.tsx` appropriately;
- failures in optional secondary features must not take down the whole recipe page.

A production error-monitoring provider can be added later if a free tier is available, but it is not required to ship MVP.

## 21. Database / migrations / seeds

- every schema change gets a migration;
- migration names describe intent;
- never rewrite already-applied production migrations;
- seed data must be deterministic enough for demos;
- seed must include visually good demo users, categories, ingredients and recipes;
- never use production user data in seeds;
- destructive DB commands require explicit human approval.

## 22. Git workflow

Default branching model:

- `main`: deployable production branch;
- feature branches: `feat/<short-name>`;
- bugfix branches: `fix/<short-name>`;
- maintenance: `chore/<short-name>`;
- refactors: `refactor/<short-name>`.

Prefer small, reviewable pull requests.

Commit convention (Conventional Commits):

- `feat:` new functionality
- `fix:` bug fix
- `refactor:` behavior-preserving refactor
- `test:` tests
- `docs:` documentation
- `chore:` tooling/maintenance
- `perf:` performance

Example: `feat(recipes): add pantry match scoring`

Do not mix unrelated refactors with feature work.

## 23. Pull request definition of ready

Before opening/merging a PR:

- scope is focused;
- acceptance criteria are satisfied;
- lint passes;
- typecheck passes;
- relevant tests pass;
- new behavior has appropriate tests;
- responsive behavior checked;
- loading/error/empty states considered;
- accessibility basics checked;
- no secrets/debug logs/dead code;
- DB migration reviewed if present;
- screenshots/video attached for meaningful UI changes where team workflow supports it.

## 24. Definition of Done

A feature is not done because “the happy path works”. It is done when:

- requirements are met;
- authorization is correct;
- input is validated;
- loading/error/empty states exist where relevant;
- mobile and desktop are usable;
- accessibility is reasonable;
- relevant tests pass;
- lint/typecheck pass;
- no known critical regression exists;
- documentation/schema/env examples are updated when necessary.

## 25. Environment variables

Maintain `.env.example` containing variable names and safe placeholders only.

Potential variables:

```
DATABASE_URL=
AUTH_SECRET=
NEXT_PUBLIC_APP_URL=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Do not add a variable until its integration exists.

## 26. Dependency policy

Before adding a package, ask:

1. Can the platform/framework already solve this cleanly?
2. Is the package maintained and widely trusted?
3. Does it materially reduce complexity?
4. What bundle/runtime/security cost does it add?

Avoid dependency collecting. Never add overlapping libraries for the same purpose without a documented reason.

## 27. AI feature policy

AI is post-MVP.

Potential future features:

- substitutions for missing ingredients;
- recipe Q&A based on the recipe itself;
- rewriting unclear user-authored cooking steps;
- translating recipes;
- moderation assistance (never sole moderation authority);
- extracting a draft recipe from pasted text/image with user confirmation.

Rules:

- application must remain useful if AI is unavailable;
- never trust model output as validated structured data;
- validate structured AI output with Zod;
- do not silently publish AI-generated content as verified;
- usage must have limits/budget protection;
- no paid AI dependency may be introduced without explicit approval.

## 28. Agent instructions

When an AI coding agent works in this repository:

1. Read this file before changing code.
2. Inspect relevant existing code before proposing a new abstraction.
3. Prefer the smallest change that completely solves the requested task.
4. Do not change unrelated code.
5. Do not introduce a new dependency, service, architectural layer, database table or environment variable unless required by the task.
6. Do not silently change public APIs, DB schema, auth behavior or permissions.
7. For schema changes, create a Prisma migration and explain impact.
8. Never run destructive database/file/git operations without explicit approval.
9. Never commit secrets or fabricate credentials.
10. Do not bypass TypeScript/ESLint errors with `any`, `@ts-ignore`, disabled rules or unsafe casts unless explicitly justified.
11. Preserve server/client boundaries and avoid unnecessary `use client`.
12. Reuse existing components, utilities and patterns before creating duplicates.
13. Keep business logic out of UI components.
14. Add/update tests for meaningful behavior changes.
15. Run the relevant validation commands after implementation.
16. If requirements are ambiguous and the ambiguity could materially change UX, schema, security or architecture, ask before implementing.
17. If a requested solution conflicts with this guide, explain the conflict rather than silently violating it.
18. Do not overengineer for hypothetical scale. Design for a credible portfolio product with clean extension points.

## 29. Required verification commands

Exact scripts may evolve, but the repository should expose equivalents of:

```
npm run lint
npm run typecheck
npm run test
npm run build
```

Run the narrowest relevant tests during development and the complete required checks before major PR completion.

## 30. Initial delivery roadmap

### Phase 0 — Foundation

- create Next.js app;
- configure TypeScript/lint/formatting;
- Tailwind/shadcn foundation;
- Prisma + Neon;
- auth;
- app shell/design tokens;
- CI/build validation.

### Phase 1 — Recipe core

- schema: users, recipes, ingredients, recipe ingredients, steps, categories/tags;
- seed content;
- discovery/feed;
- recipe details;
- search/filter;
- responsive UI.

### Phase 2 — Creator experience

- profile;
- recipe editor;
- image upload;
- drafts/submission;
- edit/delete own recipe.

### Phase 3 — Social

- likes;
- comments;
- favorites;
- public author pages;
- optional collections/follows if schedule permits.

### Phase 4 — Pantry

- ingredient normalization;
- pantry management;
- match algorithm;
- matched/missing ingredient UI;
- ranking/filtering.

### Phase 5 — Moderation/admin

- role enforcement;
- moderation queue;
- approve/reject;
- verify/unverify;
- basic user/content administration;
- audit/review record where appropriate.

### Phase 6 — Portfolio polish

- SEO/Open Graph;
- structured recipe data;
- loading/error/empty states;
- accessibility pass;
- E2E critical flows;
- performance pass;
- demo seed polish;
- README with architecture and screenshots;
- production deploy.

## 31. Scope discipline

The most important project-management rule: ship a polished vertical slice before expanding horizontally.

When choosing between:

- five half-finished features, or
- one complete discovery -> recipe -> save/publish flow,

choose the complete flow.

A smaller finished product is more valuable for this project's goals than a broad unfinished platform.
