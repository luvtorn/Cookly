# Photo storage proposal

Researched 2026-09-18. Decision: the user selected Cloudinary. The comparison below records the earlier evaluation; R2 is not the selected provider.

## Cloudinary connection

The official `cloudinary` SDK is accessed through the server-only `src/lib/storage/cloudinary.ts` module. Configuration is lazy: importing/building the application does not require credentials or make network requests. `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` are validated when storage is used. Do not put credentials in client props, `NEXT_PUBLIC_*` variables, logs or Git.

Run `npm run cloudinary:check` for an explicit authenticated Admin API ping. It loads environment files using the same Next.js loader, has a bounded request timeout, does not list/change/upload assets and prints no credentials or raw provider errors. It is not a build/CI hook. A successful ping verifies API connectivity and credentials, not the complete upload pipeline or the Vercel environment.

Public upload/signature endpoints remain disabled until authentication, ownership validation, rate limits and file validation exist. No database schema changes are needed for this connection milestone. Configure the same environment variables in the intended Vercel environment before deploying storage-dependent features.

## Provider choice

There is no verified apples-to-apples market-share ranking here for "companies storing user photographs". AWS reports millions of S3 customers across industries and workloads; that supports S3 as a broadly used professional skill, not a precise ranking of image services. [Amazon S3](https://aws.amazon.com/s3/)

| Option        | Fit for Cookly                                                                              | Trade-off                                                                                                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Amazon S3     | Direct experience with widely used object storage, IAM and signed uploads                   | Storage, operations and delivery are metered; image transformations and CDN design are separate. New-account credits are not a permanent zero-cost guarantee.                          |
| Cloudflare R2 | Recommended if learning S3-compatible storage and keeping recurring cost low are priorities | Standard free allowance: 10 GB-month, 1M Class A and 10M Class B operations/month; R2 egress is free. Usage above allowances is billed. Image processing is a separate responsibility. |
| Cloudinary    | Fastest route to a polished photo pipeline: upload API/widget, transformations and CDN      | Free plan has 25 shared monthly credits. Credits cover several resource types, not 25 GB of storage plus unlimited delivery. Provider-specific transformation APIs.                    |
| Vercel Blob   | Convenient with the existing Next.js deployment                                             | Hobby includes 1 GB storage and 10 GB transfer/month. Image processing is separate; Hobby service limits and non-commercial-use restrictions matter.                                   |

Sources: [S3 pricing](https://aws.amazon.com/s3/pricing/), [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [R2 S3 API compatibility](https://developers.cloudflare.com/r2/api/s3/api/), [Cloudinary pricing](https://cloudinary.com/pricing), [Vercel Blob pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing), [Vercel plans](https://vercel.com/pricing).

**Recommendation:** R2 with an S3-compatible SDK is a useful compromise for this portfolio's learning and cost goals. It is not a claim that R2 is more popular than S3, and it is not a complete Cloudinary replacement by itself. If shipping fastest is the priority, keeping Cloudinary remains reasonable.

For a normal cached public R2 photo URL, plan a custom domain. `r2.dev` is rate-limited and intended for development, not production. A custom domain may introduce a domain-registration cost if none is already owned. An authenticated Worker delivery path is another design with its own limits, not a free assumption. [R2 public delivery](https://developers.cloudflare.com/r2/buckets/public-buckets/)

Before implementation, confirm provider, account/billing consent and whether a suitable domain already exists. Keep separate development/production storage, per-user quotas and rate limits. Free-tier allowances are not a spending cap; transformation/compute costs must also be accounted for.

## Proposed avatar and recipe-cover flow

1. Authenticate the user on the server; derive their ID from the session. Authorize ownership of the profile/recipe, including suspended/banned-user rules.
2. Issue a short-lived upload authorization for a server-generated key in private staging. Never accept a client-chosen existing key or public arbitrary upload endpoint.
3. Validate uploaded bytes server-side: actual image format, file size, dimensions and decoded pixel limit. Initially accept JPEG/PNG/WebP, not SVG or animated files. Client checks improve UX but do not replace these checks.
4. Decode/re-encode, normalize orientation, remove EXIF/location metadata and generate bounded avatar/cover variants. Publish only validated output; do not expose raw staged files.
5. Store URL/key metadata in PostgreSQL (`Profile.avatarUrl/avatarKey`, `Recipe.coverImageUrl/coverImageKey` already exist). Do not store image bytes in PostgreSQL. Recheck ownership before committing the new reference.
6. Use a new immutable key for replacements. Update the DB reference after the new image is ready; delete the old asset only after success and only when no longer referenced. Retry failed cleanup and expire abandoned staged uploads. Handle concurrent replacements without deleting the current photo.

Recipe-cover changes should participate in the existing material-edit verification-reset rule. Define permitted image sizes, quotas, draft-photo visibility and deletion behavior during implementation. Upload UI needs progress, cancellation, retry, validation errors, keyboard access and a clear fallback when no image exists.

Authentication is not implemented yet. Do not ship publicly writable uploads merely to demonstrate the UI; implement/test session and ownership boundaries first. The Cloudinary connection milestone adds the official SDK and three server-only environment variables; no schema changes or public endpoints were added. Local authenticated ping, lint, typecheck, 37 tests and production build passed. Asset upload/replacement and Vercel connectivity remain unverified.
