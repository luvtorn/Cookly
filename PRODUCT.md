# Cookly — Product Specification

## 1. Product summary

Cookly is a social recipe platform for discovering, publishing, saving, discussing, and cooking recipes created by real people.

The product combines three ideas:

1. a polished recipe discovery product;
2. a lightweight social network for home cooks and creators;
3. a pantry matcher that finds recipes based on ingredients a user already has.

Cookly must be useful without AI. AI is reserved for later optional features such as ingredient substitutions, recipe assistance, and semantic search.

## 2. Product goals

### Primary goal

Build a portfolio-quality consumer web application that immediately demonstrates strong frontend, full-stack, UX, database, moderation, and product engineering skills to recruiters.

### Secondary goal

Create a product whose UI, discovery patterns, catalog pages, user profiles, forms, admin tooling, and responsive design can be shown to future freelance/business clients as evidence of commercial web-development capability.

### Constraints

- Target operating cost: approximately 0 PLN/month at portfolio scale.
- MVP should be realistically finishable in roughly 14–20 focused development days.
- One Next.js application. No separate NestJS backend in MVP.
- Responsive on mobile, tablet, and desktop.
- Full light/dark theme support.
- Approved designs in `design-package/` are the visual source of truth.

## 3. Target users

### Guest

Wants to discover recipes and inspect creators without creating an account.

Can:

- browse homepage and discovery feed;
- search and filter recipes;
- open recipe pages;
- view public creator profiles;
- open Pantry and try ingredient matching in a temporary session.

Cannot:

- publish;
- like/comment/save/follow;
- persist Pantry items across devices.

### User / creator

Any registered user can also be a recipe creator.

Can:

- maintain a public profile;
- publish and edit own recipes;
- like and save recipes;
- comment;
- follow creators;
- maintain Pantry ingredients;
- request Cookly verification for eligible recipes;
- report inappropriate recipes/comments.

### Moderator

Can:

- review reports;
- review recipe verification requests;
- hide/restore reported content where authorized;
- record moderation decisions.

### Admin

Moderator capabilities plus:

- manage user roles/status;
- manage ingredient/category/cuisine/tag taxonomy;
- manage verification decisions;
- view administrative overview metrics.

## 4. Core product principles

1. **Discovery first.** Home is a calm discovery experience, not a dashboard.
2. **Real recipes from real people.** Community content is central.
3. **Creation lives on dedicated pages.** Recipe creation is never forced into Home.
4. **Verified is editorial trust, not medical certification.**
5. **Social features remain lightweight.** Cookly is about recipes first, social graph second.
6. **Pantry matching is deterministic.** Ingredient matching uses canonical ingredient IDs, not AI guesses.
7. **Beautiful by default.** Functional but visually inconsistent UI is not considered complete.

## 5. Visual product rules

Approved references:

- `design-package/home.png`
- `design-package/auth.png`
- `design-package/profile.png`
- `design-package/pantry.png`
- `design-package/admin.png`

Key style characteristics:

- Apple-inspired liquid-glass / glassmorphism;
- translucent layered surfaces;
- controlled backdrop blur and thin glass borders;
- generous spacing;
- large editorial headings + clean sans-serif UI typography;
- premium food photography;
- restrained green accents in light mode;
- deep charcoal/olive + green/coral accents in dark mode;
- meaningful animation and micro-interactions;
- no noisy bottom user strip;
- no overcrowded homepage widgets;
- no recipe editor directly on Home.

## 6. MVP features

### 6.1 Home `/`

Purpose: make a strong first impression and send users into discovery.

Content:

- floating glass navigation;
- concise hero;
- recipe search;
- one featured recipe;
- community/featured recipe section;
- curated categories;
- small Pantry teaser;
- theme switcher;
- authentication/profile entry point.

Home MUST NOT contain:

- recipe creation form;
- admin-like analytics;
- large creator/user directory;
- excessive statistics or widgets.

### 6.2 Discover `/discover`

- search by recipe title;
- filters: category, cuisine, difficulty, maximum total time, tags;
- sort: newest, popular, highest rated/liked if rating is not implemented use likes;
- pagination or cursor-based loading;
- URL-driven filters where practical;
- loading/empty/error states.

### 6.3 Recipe page `/recipes/[slug]`

Displays:

- cover image;
- title/summary;
- creator;
- Cookly Verified badge when applicable;
- prep/cook/total time;
- servings;
- difficulty;
- category/cuisine/tags;
- ingredients;
- ordered instruction steps;
- like/save controls;
- comments;
- report action;
- related recipes when inexpensive to query.

Structured SEO metadata should be included when fields are sufficient.

### 6.4 Authentication

Routes:

- `/auth/sign-in`
- `/auth/sign-up`

MVP:

- email/password registration;
- email/password login;
- logout;
- secure session;
- redirect back to intended route when practical.

Optional after MVP stabilization:

- Google OAuth.

### 6.5 Public creator profile `/u/[username]`

- avatar;
- display name;
- username;
- bio;
- optional location;
- follower/following/recipe/like counts;
- follow/unfollow;
- creator recipes;
- profile tabs only when content exists.

Collections/Saved tabs may initially be private or deferred.

### 6.6 Own profile/settings

Routes:

- `/settings/profile`
- `/settings/account`

Profile editing:

- display name;
- username;
- bio;
- avatar;
- optional location.

Account settings:

- password change can be post-MVP if it delays launch;
- theme preference is client-side persisted and system-aware.

### 6.7 Recipe creation

Routes:

- `/recipes/new`
- `/recipes/[id]/edit`

Required fields:

- title;
- short description;
- cover image;
- servings;
- prep time;
- cook time;
- difficulty;
- category;
- optional cuisine;
- ingredients with amount/unit;
- ordered steps;
- optional tags.

States:

- save draft;
- publish;
- archive own recipe.

Publishing rule:

- a normal user recipe may be published without waiting for admin approval;
- it is unverified by default;
- moderation may hide/archived content after reports;
- the creator may request Cookly verification separately.

### 6.8 Cookly verification

Verification is separate from normal publication.

Flow:

1. creator publishes recipe;
2. creator requests verification;
3. status becomes `PENDING`;
4. moderator/admin reviews recipe;
5. decision is `VERIFIED` or `REJECTED`;
6. decision is stored in moderation audit history.

Material recipe edits after verification reset the verification status to `NONE` for MVP.

### 6.9 Likes

- one like per user per recipe;
- like/unlike;
- optimistic UI allowed with correct rollback;
- public aggregate count.

### 6.10 Favorites / saved recipes

- one favorite per user per recipe;
- private to the user in MVP;
- saved recipes page: `/saved`.

### 6.11 Comments

- authenticated users can comment;
- owner can delete own comment;
- moderator/admin can hide/remove comments;
- pagination for long threads;
- replies are deferred unless simple one-level replies fit schedule.

### 6.12 Following

- follow/unfollow public creators;
- cannot follow self;
- follower/following counts;
- dedicated follower lists can be deferred.

### 6.13 Pantry `/pantry`

Purpose: find recipes using ingredients the user already has.

Input:

- canonical ingredients selected from database;
- guest selection may live in URL/session/local state;
- signed-in users persist Pantry items.

Filters:

- cooking time;
- difficulty;
- cuisine;
- maximum missing ingredients.

Matching v1:

```
matchPercent = matchedRequiredIngredients / requiredIngredients * 100
```

Ranking:

1. match percentage descending;
2. missing ingredient count ascending;
3. likes/popularity as tie-breaker;
4. newest as final tie-breaker.

Important:

- quantities and unit conversion are NOT part of match confidence in v1;
- optional ingredients do not reduce the score;
- UI explicitly shows matched and missing ingredients.

### 6.14 Reporting & moderation

Users can report:

- recipe;
- comment.

Report reasons:

- spam;
- harassment;
- inappropriate content;
- copyright;
- misinformation/unsafe cooking content;
- other.

Admin routes:

- `/admin`
- `/admin/verification`
- `/admin/reports`
- `/admin/users`

Admin dashboard contains:

- user count;
- published recipe count;
- pending verification count;
- open report count;
- concise moderation queues.

Moderation actions must be stored in an audit trail.

## 7. Explicitly out of MVP

- payments;
- subscriptions;
- direct messages/chat;
- live notifications;
- native mobile apps;
- meal-plan calendar;
- grocery-store integrations;
- nutrition database/calorie guarantees;
- AI recipe generation;
- AI chatbot;
- image generation;
- complex recommendation algorithms;
- multi-language content translation;
- real-time collaborative recipe editing.

## 8. Planned post-MVP features

Priority order after stable release:

1. Collections;
2. notifications;
3. one-level comment replies;
4. trending/personalized feed;
5. Google login;
6. meal planning/shopping list;
7. AI substitution assistant;
8. semantic recipe search.

AI must never become a requirement for core browsing, publishing, social, moderation, or Pantry matching.

## 9. Route map

### Public

- `/`
- `/discover`
- `/recipes/[slug]`
- `/u/[username]`
- `/pantry`

### Auth

- `/auth/sign-in`
- `/auth/sign-up`

### Signed-in user

- `/recipes/new`
- `/recipes/[id]/edit`
- `/saved`
- `/settings/profile`
- `/settings/account`

### Admin / moderator

- `/admin`
- `/admin/verification`
- `/admin/reports`
- `/admin/users`

## 10. Main user journeys

### Journey A — recruiter/demo visitor

1. Open Home.
2. Immediately understand Cookly.
3. Search/browse a recipe.
4. Open a polished recipe detail page.
5. Open creator profile.
6. Try Pantry.

Success condition: product feels real before login is required.

### Journey B — creator

1. Register.
2. Complete profile.
3. Create recipe.
4. Add ingredients and steps.
5. Upload cover image.
6. Publish.
7. View public page.
8. Optionally request verification.

### Journey C — community user

1. Discover recipe.
2. Like/save it.
3. Comment.
4. Follow creator.
5. Return to saved recipes later.

### Journey D — Pantry

1. Enter ingredients.
2. Choose optional filters.
3. See ranked matches.
4. Understand missing ingredients.
5. Open recipe.

### Journey E — moderator

1. Open admin dashboard.
2. Review verification queue or reports.
3. Inspect content.
4. Approve/reject/hide/dismiss.
5. Audit action is stored.

## 11. Data ownership and permissions

- User may edit/archive only own recipe unless moderator/admin.
- User may delete only own comment unless moderator/admin.
- Favorite/like/follow operations derive user identity from server session, never client-supplied user ID.
- Admin/moderator actions are independently authorized server-side.
- Public DTOs never expose email, password hash, sessions, report details, internal moderation notes, or role-management internals.

## 12. Non-functional requirements

### Performance

- public read-heavy pages should prefer Server Components;
- paginated feeds/comments;
- optimized responsive images;
- no unbounded queries;
- indexes for common filters and moderation queues.

### Accessibility

Target WCAG 2.2 AA where practical:

- keyboard navigation;
- semantic landmarks/headings;
- visible focus states;
- correct form labels;
- sufficient contrast;
- reduced-motion support;
- status never encoded only by color.

### SEO

- index public recipes and creator profiles;
- canonical URLs;
- Open Graph;
- sitemap;
- Schema.org Recipe where enough data exists;
- admin/auth/settings pages are not indexed.

### Security

- server-side authorization;
- Zod at trust boundaries;
- secure password hashing;
- secure cookies;
- rate-limit auth/comment/report/upload paths when needed;
- validate image MIME and size;
- sanitize user-generated text if HTML/markdown is introduced;
- secrets only in server environment variables.

## 13. Demo seed requirements

Seed must create an attractive demonstration environment:

- 8–12 users/creators;
- 40–60 canonical ingredients;
- 5–8 categories;
- 6–10 cuisines;
- 10–15 useful tags;
- 24–36 recipes with high-quality cover images;
- likes, favorites, follows, comments;
- 3–5 pending verification requests;
- 4–6 reports in mixed statuses;
- at least one admin and one moderator.

Do not use real private user data in seeds.

## 14. MVP success criteria

Cookly MVP is complete when:

- a guest can discover/search/filter/open recipes and profiles;
- a user can register, create, publish and edit a recipe;
- likes, saves, comments and follows work with correct authorization;
- Pantry returns deterministic ranked recipe matches;
- creator can request verification;
- moderator/admin can process verification and reports;
- all major pages work on mobile/tablet/desktop;
- light and dark themes are visually coherent;
- design matches approved `design-package/` references;
- critical E2E tests pass;
- lint, typecheck, test and production build pass;
- deployed demo can run on free tiers at portfolio traffic.
