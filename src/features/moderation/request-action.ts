"use server";
import { actionUser } from "@/lib/auth/user-action";
import { requestVerification, VerificationRequestError } from "./service";
import { refreshVerification } from "./refresh";
export async function requestVerificationAction(input: unknown) {
  try {
    const user = await actionUser();
    const recipe = await requestVerification(user.id, input);
    refreshVerification(recipe.slug);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      code:
        error instanceof VerificationRequestError && error.code === "limit"
          ? ("limit" as const)
          : ("error" as const),
    };
  }
}
