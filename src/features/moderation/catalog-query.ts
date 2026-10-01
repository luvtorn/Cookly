import { z } from "zod";
export const adminCatalogQuery = z.object({
  view: z.enum(["all", "studio"]).catch("all"),
  q: z.string().trim().max(100).catch(""),
  status: z.enum(["ALL", "PUBLISHED", "DRAFT", "ARCHIVED"]).catch("PUBLISHED"),
  verification: z
    .enum(["ALL", "NONE", "PENDING", "VERIFIED", "REJECTED"])
    .catch("ALL"),
  origin: z.enum(["ALL", "EDITORIAL", "COMMUNITY"]).catch("ALL"),
  visibility: z.enum(["ALL", "VISIBLE", "HIDDEN"]).catch("ALL"),
  page: z.coerce.number().int().min(1).max(10000).catch(1),
});
export function adminCatalogWhere(
  query: z.infer<typeof adminCatalogQuery>,
  adminId: string,
) {
  return {
    ...(query.view === "studio"
      ? { authorId: adminId, isEditorial: true }
      : query.origin !== "ALL"
        ? { isEditorial: query.origin === "EDITORIAL" }
        : {}),
    ...(query.status !== "ALL" ? { status: query.status } : {}),
    ...(query.verification !== "ALL"
      ? { verificationStatus: query.verification }
      : {}),
    ...(query.visibility !== "ALL"
      ? { isHidden: query.visibility === "HIDDEN" }
      : {}),
    ...(query.q
      ? {
          OR: [
            { title: { contains: query.q, mode: "insensitive" as const } },
            {
              author: {
                profile: {
                  username: { contains: query.q, mode: "insensitive" as const },
                },
              },
            },
          ],
        }
      : {}),
  };
}
