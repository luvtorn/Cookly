# Search and recipe motion verification

## Changes

- Search has one stationary glass shell; only its transparent child scrolls. Available space excludes the header and mobile navigation. The menu prefers downward placement when several results fit.
- Escape handles loading and empty states; dismissed requests cannot reopen the popup. Keyboard selection scrolls within the list.
- Shared cards lift 4px and zoom the image to 1.04 on fine-pointer hover, with independent keyboard focus. Catalog entrances use a capped 180ms stagger keyed by the applied query.
- Recipe sections reveal once using Framer Motion without hiding server-rendered content. Reduced motion and touch retain static alternatives.

## Verification

- ESLint, TypeScript (including generated route types), production build and 108 unit tests passed. The four new search unit cases were rerun after the positioning correction.
- Full Chromium run: 41 passed. This includes all three locales, 390/768/1100/1448px search surfaces, hit-testing, keyboard selection, reduced motion and existing navigation/auth-modal regressions.
- A separate local PostgreSQL visual check captured 16 catalog/detail screenshots in both themes at those four widths. Anchor visibility, hover, reduced motion and overflow checks passed. Test fixtures deliberately shared one local cover; no Cloudinary upload or production database operation occurred. Temporary recipe/user fixtures were removed afterward.
- Screenshots and videos are ignored artifacts under `test-results/offline` and `test-results/recipe-motion-qa`.

The first browser run exposed upward suggestions overlapping the header; positioning now reserves that space. An old dock test assumed expanded labels could not overlay the content gutter; it now checks collapsed clearance and invariant content position, matching the approved design. A locale-switch timeout passed on the clean full rerun without changing language behavior.

No dependencies, API contracts, schema, deployment, commit or push changes.
