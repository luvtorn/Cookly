import nextEnv from "@next/env";
import { readFile } from "node:fs/promises";
import { v2 as cloudinary } from "cloudinary";
nextEnv.loadEnvConfig(process.cwd(), true);
if (!process.argv.includes("--confirm-upload"))
  throw new Error(
    "Pass --confirm-upload to upload the approved starter covers.",
  );
const {
  CLOUDINARY_CLOUD_NAME: cloud_name,
  CLOUDINARY_API_KEY: api_key,
  CLOUDINARY_API_SECRET: api_secret,
} = process.env;
if (!cloud_name || !api_key || !api_secret)
  throw new Error("Cloudinary configuration is required.");
cloudinary.config({
  cloud_name,
  api_key,
  api_secret,
  secure: true,
  timeout: 60000,
});
const recipes = JSON.parse(
  await readFile(
    new URL("../prisma/starter-recipes.json", import.meta.url),
    "utf8",
  ),
);
const assets = {};
try {
  for (const recipe of recipes) {
    const public_id = `cookly/editorial/v1/${recipe.slug}`;
    const result = await cloudinary.uploader.upload(
      `public/images/editorial/${recipe.slug}.png`,
      {
        public_id,
        resource_type: "image",
        overwrite: false,
        format: "webp",
        transformation: [{ width: 1600, crop: "limit", quality: "auto" }],
      },
    );
    assets[recipe.slug] = { url: result.secure_url, key: result.public_id };
  }
  // Public metadata only. Persist the reviewed manifest with apply_patch, not credentials.
  console.log(JSON.stringify(assets, null, 2));
} catch (error) {
  console.error(
    JSON.stringify({
      message: "Cover upload failed; existing uploads preserved.",
      code: typeof error?.code === "string" ? error.code : undefined,
      httpCode: error?.http_code,
      category: /signature/i.test(error?.message ?? "")
        ? "signature"
        : /api.?key/i.test(error?.message ?? "")
          ? "api-key"
          : /cloud.?name/i.test(error?.message ?? "")
            ? "cloud-name"
            : /timeout/i.test(error?.message ?? "")
              ? "timeout"
              : /format/i.test(error?.message ?? "")
                ? "format"
                : "other",
    }),
  );
  process.exitCode = 1;
}
