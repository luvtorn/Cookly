# Community demo content — 2026-10-02

## Scope and production result

This is explicitly requested demo content in the working Cookly database, not a production test fixture. Two ACTIVE USER accounts publish ten recipes each, with isEditorial=false and AI cover disclosure. The bios identify both accounts as Cookly demonstration profiles. No likes, comments, followers, ratings, or claims of actual cooking were invented.

- [Everyday profile](https://cookly-proj.vercel.app/en/u/cookly_everyday_demo)
- [Weekend profile](https://cookly-proj.vercel.app/en/u/cookly_weekend_demo)
- 20 PUBLISHED recipes: 16 NONE and 4 PENDING.
- [Pending queue](https://cookly-proj.vercel.app/admin/verification?status=PENDING) (admin authentication required).
- No administrator decisions, migrations, deployment, commit, or push.

## Workflow and resuming

The first two recipes were created through the visible user editor, saved as drafts, reviewed, then published. Browser automation became unreliable; the remaining content used the same deployed authenticated Server Actions as the editor through scripts/community-demo-client.mjs. Registration, signed-in ownership, cover-upload receipts, validation, draft creation, publication and voluntary review requests remained enforced by the application. SQL queries used for conflict checks and verification are SELECT-only; accounts, ingredients and recipes were not inserted directly into PostgreSQL.

Credentials are in .env.demo-accounts.local, ignored by Git. Never copy them into this document, logs, screenshots, source control, or the manifest. These reserved example.com demo addresses cannot receive mail.

Commands:

```sh
node scripts/community-demo-client.mjs --inspect
node scripts/community-demo-client.mjs --verify
# Production writes: only with fresh explicit authorization, and no concurrent run.
node scripts/community-demo-client.mjs --apply-cookly-demo
```

The client checks account identity conflicts, existing titles/ownership/content and normalized canonical ingredients. Existing published demo recipes are not republished. New ingredients use the editor's explicit createNew confirmation. New recipes are saved DRAFT and checked before publication. Existing PENDING requests are not submitted again. Application action IDs are discovered from the current deployed client bundles and may change after a deployment. Stop on conflicts rather than overwriting content.

Content: prisma/community-demo-recipes.json.
Public IDs, URLs, cover URLs and request IDs: prisma/community-demo-manifest.json.
Final AI images: public/images/community-demo/00.jpg through 19.jpg (all below 3 MiB).
Built-in image generation prompt set: prisma/community-demo-cover-prompts.json.
The JPEGs are format-optimized copies of separate generated originals; the first two production uploads used their PNG originals. Each recipe has an individual Cloudinary cover with coverImageIsAi=true.

## Published recipes

| Author   | Recipe                                                                                                              | Verification |
| -------- | ------------------------------------------------------------------------------------------------------------------- | ------------ |
| Everyday | [Avocado Egg Toast](https://cookly-proj.vercel.app/en/recipes/avocado-egg-toast-7a944ba6)                           | NONE         |
| Everyday | [Banana Oat Porridge](https://cookly-proj.vercel.app/en/recipes/banana-oat-porridge-2a1a56f9)                       | PENDING      |
| Everyday | [Creamy Broccoli Soup](https://cookly-proj.vercel.app/en/recipes/creamy-broccoli-soup-1fdfbb73)                     | NONE         |
| Everyday | [Garlic Butter White Beans](https://cookly-proj.vercel.app/en/recipes/garlic-butter-white-beans-e8888469)           | NONE         |
| Everyday | [Greek Chickpea Salad](https://cookly-proj.vercel.app/en/recipes/greek-chickpea-salad-bf6061d5)                     | PENDING      |
| Everyday | [Roasted Vegetable Couscous](https://cookly-proj.vercel.app/en/recipes/roasted-vegetable-couscous-40e5ed7a)         | NONE         |
| Everyday | [Spinach Ricotta Pasta](https://cookly-proj.vercel.app/en/recipes/spinach-ricotta-pasta-6d107113)                   | NONE         |
| Everyday | [Tuna Sweetcorn Wraps](https://cookly-proj.vercel.app/en/recipes/tuna-sweetcorn-wraps-66f59a5a)                     | NONE         |
| Everyday | [Turkey Vegetable Stir-Fry](https://cookly-proj.vercel.app/en/recipes/turkey-vegetable-stir-fry-4489e6b9)           | NONE         |
| Everyday | [Yogurt Berry Parfait](https://cookly-proj.vercel.app/en/recipes/yogurt-berry-parfait-ae9422ab)                     | NONE         |
| Weekend  | [Apple Cinnamon French Toast](https://cookly-proj.vercel.app/en/recipes/apple-cinnamon-french-toast-8ea85c5a)       | NONE         |
| Weekend  | [Baked Cod with Tomatoes](https://cookly-proj.vercel.app/en/recipes/baked-cod-with-tomatoes-b0223003)               | NONE         |
| Weekend  | [Beef Mushroom Stew](https://cookly-proj.vercel.app/en/recipes/beef-mushroom-stew-9dfa9e27)                         | NONE         |
| Weekend  | [Lemon Herb Roast Chicken](https://cookly-proj.vercel.app/en/recipes/lemon-herb-roast-chicken-13ae0f7a)             | NONE         |
| Weekend  | [Pear Walnut Crumble](https://cookly-proj.vercel.app/en/recipes/pear-walnut-crumble-f0194b43)                       | NONE         |
| Weekend  | [Potato Leek Soup](https://cookly-proj.vercel.app/en/recipes/potato-leek-soup-a590b27b)                             | PENDING      |
| Weekend  | [Strawberry Cheesecake Cups](https://cookly-proj.vercel.app/en/recipes/strawberry-cheesecake-cups-da3348a2)         | NONE         |
| Weekend  | [Stuffed Bell Peppers](https://cookly-proj.vercel.app/en/recipes/stuffed-bell-peppers-a37da7d4)                     | PENDING      |
| Weekend  | [Sweet Potato Black Bean Chilli](https://cookly-proj.vercel.app/en/recipes/sweet-potato-black-bean-chilli-a9568e1e) | NONE         |
| Weekend  | [Vegetable Lasagne](https://cookly-proj.vercel.app/en/recipes/vegetable-lasagne-f69eae73)                           | NONE         |

## Four author-initiated pending requests

- [Banana Oat Porridge — administrative review](https://cookly-proj.vercel.app/admin/recipes/cmur1a5l7000104kzkq9zmdoc); [history](https://cookly-proj.vercel.app/admin/verification/cmur1a5l7000104kzkq9zmdoc/history). Request ID: cmur1d74s000804l652jlg31v.
- [Greek Chickpea Salad — administrative review](https://cookly-proj.vercel.app/admin/recipes/cmur4125j000304icq2cy8jnr); [history](https://cookly-proj.vercel.app/admin/verification/cmur4125j000304icq2cy8jnr/history). Request ID: cmur418mk000s04ic79wpsvar.
- [Potato Leek Soup — administrative review](https://cookly-proj.vercel.app/admin/recipes/cmur42x15005z04ickljw6dna); [history](https://cookly-proj.vercel.app/admin/verification/cmur42x15005z04ickljw6dna/history). Request ID: cmur4326a006m04ic377bn3iq.
- [Stuffed Bell Peppers — administrative review](https://cookly-proj.vercel.app/admin/recipes/cmur43kya008i04icxkw5uwgh); [history](https://cookly-proj.vercel.app/admin/verification/cmur43kya008i04icxkw5uwgh/history). Request ID: cmur43pi6009d04icn529tebm.

Publication is immediate and independent of verification. Authors voluntarily request Cookly review after publication; a pending request does not hide the recipe. No recipe in this demo has a verified badge.

## Verification evidence and limitations

`node scripts/community-demo-client.mjs --verify` passed for both accounts: authenticated sessions, ten published recipes per owner, all twenty public pages and Cloudinary covers, owner editor access, foreign editor rejection and exactly two owner-initiated pending requests each. Catalog and Home Community were also checked in the browser. The verification command performs no content mutations.

Local lint, typecheck, JavaScript syntax check and the demo manifest/image-size validation passed. No application feature was changed in this content operation; the earlier Pantry test/build results are documented separately in `docs/pantry-verification-2026-10-01.md`.

Both public profiles display ten recipes and honest zero engagement. Representative profile and recipe pages were inspected in both themes on desktop. The recipe cover displays “Cover illustration generated with AI.” The signed-in Everyday account cannot open the Weekend recipe editor: the rendered boundary shows 404. The App Router can stream this boundary with HTTP 200; verification must check the rendered not-found boundary, not status alone.

The requested 390 px viewport override did not take effect in the in-app browser: the DOM still reported 1280×720. Mobile visual QA is therefore not claimed complete. No additional production test recipes or engagement were created for QA. Administrative queue membership was checked through the existing pending request records; a signed-in administrative browser walkthrough remains separate.

Screenshot: test-results/community-demo-profile.jpg (ignored local QA artifact).
