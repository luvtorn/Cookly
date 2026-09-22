import "server-only";
import { getDb } from "@/lib/db/client";
import { verifyAvatarReceipt } from "@/lib/storage/image-receipt";
import { profileSchema } from "./schema";

export async function updateOwnProfile(userId: string, input: unknown) {
  const data = profileSchema.parse(input);
  const avatar = data.avatarReceipt
    ? verifyAvatarReceipt(data.avatarReceipt, userId)
    : null;
  return getDb().$transaction(async (tx) => {
    const user = await tx.user.findFirst({
      where: { id: userId, status: "ACTIVE" },
      select: { id: true, profile: { select: { id: true } } },
    });
    if (!user?.profile) throw new Error("Profile unavailable.");
    const profile = await tx.profile.update({
      where: { userId },
      data: {
        displayName: data.displayName,
        username: data.username,
        bio: data.bio || null,
        location: data.location || null,
        ...(avatar ?? {}),
      },
      select: { username: true, displayName: true, avatarUrl: true },
    });
    if (avatar)
      await tx.user.update({
        where: { id: userId },
        data: { image: avatar.avatarUrl },
      });
    return profile;
  });
}
