"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth/session";
import { consumeLimit } from "@/lib/auth/rate-limit";
import { getCloudinary } from "@/lib/storage/cloudinary";
import { imageFormat, signImageReceipt } from "@/lib/storage/image-receipt";
import { saveAdminRecipe } from "./service";
import type { UploadApiResponse } from "cloudinary";

async function actionAdmin() {
  const h = await headers();
  // Also reject missing Origin for cookie-authenticated mutations.
  const origin = h.get("origin");
  if (
    !origin ||
    new URL(origin).host !== (h.get("x-forwarded-host") ?? h.get("host"))
  )
    throw new Error("Access denied.");
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("Access denied.");
  return user;
}
export async function saveRecipeAction(input: unknown) {
  try {
    const user = await actionAdmin();
    if (!(await consumeLimit("recipe-save", user.id, 60, 3600)))
      throw new Error("Limit reached.");
    const recipe = await saveAdminRecipe(user.id, input);
    for (const path of [
      "/",
      "/admin",
      "/admin/recipes",
      `/admin/recipes/${recipe.id}/edit`,
      `/recipes/${recipe.slug}`,
    ])
      revalidatePath(path);
    return { success: true as const, recipe };
  } catch {
    return {
      success: false as const,
      message: "Unable to save. Check the fields and cover, then try again.",
    };
  }
}
export async function uploadCoverAction(form: FormData) {
  try {
    const user = await actionAdmin();
    if (!(await consumeLimit("recipe-upload", user.id, 20, 3600)))
      throw new Error("Limit reached.");
    const file = form.get("file");
    if (
      !(file instanceof File) ||
      file.size < 12 ||
      file.size > 3 * 1024 * 1024
    )
      throw new Error("Invalid image.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const format = imageFormat(bytes);
    if (!format || file.type !== `image/${format}`)
      throw new Error("Invalid image.");
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      getCloudinary()
        .uploader.upload_stream(
          {
            resource_type: "image",
            public_id: `cookly/recipes/${user.id}/${randomUUID()}`,
            overwrite: false,
            allowed_formats: ["jpg", "png", "webp"],
            transformation: [{ width: 1800, height: 1800, crop: "limit" }],
          },
          (error, response) =>
            error || !response
              ? reject(new Error("Upload failed."))
              : resolve(response),
        )
        .end(bytes);
    });
    return {
      success: true as const,
      url: result.secure_url,
      receipt: signImageReceipt(user.id, result.public_id, result.secure_url),
    };
  } catch {
    return {
      success: false as const,
      message:
        "Upload failed. Use a JPEG, PNG or WebP up to 3 MiB and try again.",
    };
  }
}
