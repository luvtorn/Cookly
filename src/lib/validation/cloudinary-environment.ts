import { z } from "zod";

const requiredValue = z.string().trim().min(1);
const cloudinaryEnvironmentSchema = z.object({
  CLOUDINARY_CLOUD_NAME: requiredValue.regex(/^[a-zA-Z0-9_-]+$/),
  CLOUDINARY_API_KEY: requiredValue.regex(/^\d+$/),
  CLOUDINARY_API_SECRET: requiredValue,
});

// Validate only when storage is used, so offline builds need no credentials.
// Never serialize these options into client props or log validation inputs.
export function requireCloudinaryOptions(source: Record<string, unknown>) {
  const result = cloudinaryEnvironmentSchema.safeParse(source);
  if (!result.success) {
    const names = [
      ...new Set(result.error.issues.map((issue) => issue.path[0])),
    ];
    throw new Error(
      `Missing or invalid environment variables: ${names.join(", ")}.`,
    );
  }
  return {
    cloud_name: result.data.CLOUDINARY_CLOUD_NAME,
    api_key: result.data.CLOUDINARY_API_KEY,
    api_secret: result.data.CLOUDINARY_API_SECRET,
    secure: true,
    timeout: 10000,
  };
}
