"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { UploadApiResponse } from "cloudinary";
import { actionUser } from "@/lib/auth/user-action";
import { consumeLimit } from "@/lib/auth/rate-limit";
import { getCloudinary } from "@/lib/storage/cloudinary";
import { imageFormat, signAvatarReceipt } from "@/lib/storage/image-receipt";
import { updateOwnProfile } from "./service";

export async function updateProfileAction(input: unknown) {
  try {
    const user = await actionUser();
    if (!(await consumeLimit("profile-update", user.id, 20, 3600)))
      throw new Error("Limit reached.");
    const previousUsername = user.profile?.username;
    const profile = await updateOwnProfile(user.id, input);
    for (const path of [
      "/",
      "/recipes",
      "/settings/profile",
      `/u/${profile.username}`,
      ...(previousUsername ? [`/u/${previousUsername}`] : []),
    ])
      revalidatePath(path);
    return { success: true as const, profile };
  } catch {
    return {
      success: false as const,
      message:
        "Unable to update your profile. Check the username and try again.",
    };
  }
}

export async function uploadAvatarAction(form: FormData) {
  try {
    const user = await actionUser();
    if (!(await consumeLimit("avatar-upload", user.id, 10, 3600)))
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
            public_id: `cookly/avatars/${user.id}/${randomUUID()}`,
            overwrite: false,
            allowed_formats: ["jpg", "png", "webp"],
            transformation: [
              { width: 800, height: 800, crop: "fill", gravity: "auto" },
            ],
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
      receipt: signAvatarReceipt(user.id, result.public_id, result.secure_url),
    };
  } catch {
    return {
      success: false as const,
      message:
        "Upload failed. Use a JPEG, PNG or WebP up to 3 MiB and try again.",
    };
  }
}
