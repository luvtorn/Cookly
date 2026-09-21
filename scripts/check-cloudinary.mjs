import nextEnv from "@next/env";
import { v2 as cloudinary } from "cloudinary";

import { requireCloudinaryOptions } from "../src/lib/validation/cloudinary-environment.ts";

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

let options;
try {
  options = requireCloudinaryOptions(process.env);
} catch (error) {
  // This validation function emits variable names only, never supplied values.
  console.error(
    error instanceof Error
      ? error.message
      : "Invalid Cloudinary configuration.",
  );
  process.exitCode = 1;
}

if (options) {
  try {
    cloudinary.config(options);
    const result = await cloudinary.api.ping();
    if (result.status !== "ok") throw new Error("Unexpected ping response");
    console.log(
      "Cloudinary authentication succeeded. No assets were uploaded or changed.",
    );
  } catch {
    // Provider errors can contain credentials/request details: never print them.
    console.error(
      "Cloudinary check failed. Verify credentials, network access and account permissions.",
    );
    process.exitCode = 1;
  }
}
