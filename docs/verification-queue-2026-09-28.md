# Verification queue validation — 2026-09-28

## Production migration update — 2026-09-29

With explicit user approval, Prisma applied `20260928190000_verification_requests` to the configured Neon database. Preflight found exactly this pending migration, no failed migrations and no duplicate pending requests. The application connection successfully read `creatorMessage`; the nullable column, partial unique index and completed migration record were verified. No editorial backfill, recipe changes, commit, push or deployment was performed. The original production-boundary notes below describe the state at the time of the initial validation.

## Scope

Community publication is independent of editorial verification. Requests are explicit, owner-only and limited to ten successful submissions per rolling day. Studio publication approves editorial recipes automatically. Author feedback and internal notes are separate fields and are never selected by public recipe queries.

The queue fetches 12 recipes and up to five recent decisions per recipe. Full history is an administrator-only route paginated at 20 decisions. Pending requests are ordered oldest first; reviewed recipes are ordered by their latest decision.

## Automated checks

- ESLint with zero warnings; TypeScript; production build.
- 121 unit/component tests.
- 27 integration tests against isolated loopback PostgreSQL `cookly_test`, including concurrent duplicate requests, daily quota, request ordering/pagination, the partial unique index, ownership/status checks, stale reviews, edits, archival, Studio approval and snapshot-confirmed backfill.
- Chromium covers Studio, authentication, social regression and the author → request → changes → edit → resubmit → approval → revoke workflow. The verification test also checks private-note exclusion from author HTML and exclusion of both feedback fields from the public recipe.
- Responsive screenshots cover the queue at 390, 768, 1100 and 1448 pixels in both themes, plus localized owner feedback on My recipes. Artifacts remain ignored under `test-results/auth`.

Browser navigation tests explicitly wait for the destination URL and heading before following a result card. Administrative sign-in currently returns to Overview; tests enter Verification through the real navigation afterward.

The test runtime emits the existing Prisma/pg concurrent-query deprecation warning and may log a cancelled response stream during navigation. These are not assertion failures; no database/provider secrets are logged.

## Production boundary

`20260928190000_verification_requests` was applied only to isolated PostgreSQL. It stops on duplicate pending requests before adding the nullable feedback column and partial unique index. Existing private notes are not copied.

Production Neon migration and editorial approval have **not** been run. Before release, separately approve the migration, inspect the approval command's complete JSON target list, then apply its exact confirmation hash. Re-preview if the target snapshot changes. No commit, push or deployment is part of this delivery.
