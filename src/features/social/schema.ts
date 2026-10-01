import { z } from "zod";

export const idSchema = z.string().min(1).max(100);
export const reactionSchema = z.object({
  recipeId: idSchema,
  kind: z.enum(["like", "save"]),
  active: z.boolean(),
});
export const commentBody = z.string().trim().min(1).max(1500);
export const commentSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("create"),
    recipeId: idSchema,
    body: commentBody,
  }),
  z.object({
    operation: z.literal("edit"),
    recipeId: idSchema,
    id: idSchema,
    body: commentBody,
    updatedAt: z.iso.datetime(),
  }),
  z.object({
    operation: z.literal("delete"),
    recipeId: idSchema,
    id: idSchema,
  }),
]);
export const commentQuery = z.object({
  recipeId: idSchema,
  cursor: z.object({ id: idSchema, createdAt: z.iso.datetime() }).optional(),
});
export const savedQuery = z.object({
  view: z.enum(["saved", "liked"]).optional().catch(undefined),
  q: z.string().trim().max(100).catch(""),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
});
export function savedUrl(input: z.infer<typeof savedQuery>) {
  const params = new URLSearchParams();
  if (input.view === "liked") params.set("view", "liked");
  if (input.q) params.set("q", input.q);
  if (input.page > 1) params.set("page", String(input.page));
  return `/saved${params.size ? `?${params}` : ""}`;
}
export type SocialErrorCode =
  "AUTH" | "INVALID" | "UNAVAILABLE" | "LIMIT" | "CONFLICT" | "FAILED";
export type SocialResult<T> =
  { success: true; data: T } | { success: false; code: SocialErrorCode };
export type ReactionState = {
  isLiked: boolean;
  isSaved: boolean;
  likeCount: number;
};
export type CommentView = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: string;
  username: string | null;
  avatar: string | null;
  canEdit: boolean;
};
export type CommentPage = {
  items: CommentView[];
  count: number;
  cursor: { id: string; createdAt: string } | null;
};
