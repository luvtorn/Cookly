import { z } from "zod";
import { savedQuery, savedUrl } from "@/features/social/schema";

const slug = z
  .string()
  .regex(/^[a-z0-9-]{1,100}$/)
  .optional()
  .catch(undefined);
export const catalogQuerySchema = z.object({
  q: z.string().trim().max(100).catch(""),
  category: slug,
  cuisine: slug,
  tag: slug,
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional().catch(undefined),
  maxTime: z.coerce.number().int().min(1).max(1440).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
});
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;
export function catalogUrl(query: CatalogQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "" && !(key === "page" && value === 1))
      params.set(key, String(value));
  }
  return `/recipes${params.size ? `?${params}` : ""}`;
}
export function catalogReturn(value: unknown) {
  if (typeof value === "string" && /^\/(?:en\/|ru\/|pl\/)?saved(?:\?|$)/.test(value)) {
    return savedUrl(savedQuery.parse(Object.fromEntries(new URLSearchParams(value.split("?")[1]))));
  }
  if (
    typeof value !== "string" ||
    !/^\/(?:en\/|ru\/|pl\/)?recipes(?:\?|$)/.test(value)
  )
    return "/recipes";
  return catalogUrl(
    catalogQuerySchema.parse(
      Object.fromEntries(new URLSearchParams(value.split("?")[1])),
    ),
  );
}
export function legacyCatalogUrl(
  params: Record<string, string | string[] | undefined>,
) {
  const query = catalogQuerySchema.parse(params);
  if (
    ["quick", "fresh", "comfort", "vegetarian"].includes(query.category ?? "")
  ) {
    query.tag = query.category;
    query.category = undefined;
  } else if (query.category === "global") query.category = undefined;
  return catalogUrl(query);
}
