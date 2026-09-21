import { z } from "zod";

// Curated category slugs map to tags, cuisines or the desserts taxonomy.
export const discoveryQuerySchema = z.object({
  q: z.string().trim().max(100).catch(""),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
  category: z
    .enum(["quick", "fresh", "comfort", "vegetarian", "desserts", "global"])
    .optional()
    .catch(undefined),
});
