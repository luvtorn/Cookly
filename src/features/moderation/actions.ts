"use server";
import { refreshVerification } from "./refresh";
import { actionAdmin } from "@/lib/auth/admin-action";
import { consumeLimit } from "@/lib/auth/rate-limit";
import { reviewRecipe, StaleReviewError } from "./service";
export async function reviewRecipeAction(input: unknown) {
  try {
    const admin = await actionAdmin();
    if (!(await consumeLimit("recipe-review", admin.id, 60, 3600)))
      throw new Error("Limit reached.");
    const result = await reviewRecipe(admin.id, input);
    refreshVerification(result.slug);
    return { success: true as const, message: "Review saved." };
  } catch (error) {
    return {
      success: false as const,
      message:
        error instanceof StaleReviewError
          ? "This recipe changed. Refresh and review the latest version before deciding."
          : "Unable to save the review. Check your access and the reason, then try again.",
    };
  }
}
