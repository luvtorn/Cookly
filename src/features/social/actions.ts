"use server";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { actionUser } from "@/lib/auth/user-action";
import { consumeLimit } from "@/lib/auth/rate-limit";
import { changeComment, setReaction, SocialError } from "./service";
import { readComments } from "./repository";
import {
  commentSchema,
  reactionSchema,
  type SocialResult,
  type ReactionState,
  type CommentPage,
} from "./schema";

function failure(error: unknown): {
  success: false;
  code: "INVALID" | "AUTH" | "UNAVAILABLE" | "LIMIT" | "CONFLICT" | "FAILED";
} {
  if (!(error instanceof ZodError) && !(error instanceof SocialError)) {
    console.error("[social] Operation failed.");
  }
  return {
    success: false,
    code:
      error instanceof ZodError
        ? "INVALID"
        : error instanceof SocialError
          ? error.code
          : "FAILED",
  };
}
async function authenticated() {
  try {
    return await actionUser();
  } catch {
    throw new SocialError("AUTH");
  }
}
function refresh(slug: string) {
  for (const locale of ["en", "ru", "pl"]) {
    for (const path of ["", "/saved", "/recipes", `/recipes/${slug}`])
      revalidatePath(`/${locale}${path}`);
    revalidatePath(`/${locale}/u/[username]`, "page");
  }
}
export async function setReactionAction(
  raw: unknown,
): Promise<SocialResult<ReactionState>> {
  try {
    const input = reactionSchema.parse(raw);
    const user = await authenticated();
    if (!(await consumeLimit(`social-${input.kind}`, user.id, 120, 60)))
      throw new SocialError("LIMIT");
    const result = await setReaction(user.id, input);
    refresh(result.slug);
    return { success: true, data: result.state };
  } catch (error) {
    return failure(error);
  }
}
export async function changeCommentAction(
  raw: unknown,
): Promise<SocialResult<null>> {
  try {
    const input = commentSchema.parse(raw);
    const user = await authenticated();
    const creating = input.operation === "create";
    if (
      !(await consumeLimit(
        creating ? "comment-create" : "comment-change",
        user.id,
        creating ? 10 : 30,
        600,
      ))
    )
      throw new SocialError("LIMIT");
    const result = await changeComment(user.id, input);
    refresh(result.slug);
    return { success: true, data: null };
  } catch (error) {
    return failure(error);
  }
}
export async function loadCommentsAction(
  raw: unknown,
): Promise<SocialResult<CommentPage>> {
  try {
    return { success: true, data: await readComments(raw) };
  } catch (error) {
    return failure(error);
  }
}
