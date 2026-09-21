import "server-only";

import { v2 as cloudinary } from "cloudinary";

import { requireCloudinaryOptions } from "@/lib/validation/cloudinary-environment";

// No configuration at import time, and no public upload/signature endpoint.
// Future callers must authenticate and authorize before using this SDK.
export function getCloudinary() {
  cloudinary.config(requireCloudinaryOptions(process.env));
  return cloudinary;
}
