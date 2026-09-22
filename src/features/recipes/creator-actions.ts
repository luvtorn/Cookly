"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { UploadApiResponse } from "cloudinary";
import { actionUser } from "@/lib/auth/user-action";
import { consumeLimit } from "@/lib/auth/rate-limit";
import { getCloudinary } from "@/lib/storage/cloudinary";
import { imageFormat, signImageReceipt } from "@/lib/storage/image-receipt";
import { saveUserRecipe } from "./service";

export async function saveUserRecipeAction(input: unknown) {
  try {
    const user = await actionUser();
    if (!(await consumeLimit("user-recipe-save", user.id, 30, 3600)))
      throw new Error("Limit reached.");
    const recipe = await saveUserRecipe(user.id, input);
    const paths = [
      "/",
      "/recipes",
      "/my-recipes",
      `/my-recipes/${recipe.id}/edit`,
      `/recipes/${recipe.slug}`,
    ];
    if (user.profile?.username) paths.push(`/u/${user.profile.username}`);
    for (const path of paths) revalidatePath(path);
    return { success: true as const, recipe };
  } catch {
    return {
      success: false as const,
      message: "Unable to save. Check the fields and cover, then try again.",
    };
  }
}

export async function uploadUserCoverAction(form: FormData) {
  try {
    const user = await actionUser();
    if (!(await consumeLimit("user-recipe-upload", user.id, 20, 3600)))
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
            asset_folder: "cookly",
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
