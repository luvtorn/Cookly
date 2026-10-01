import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), limit: vi.fn() }));
vi.mock("@/lib/auth/user-action", () => ({ actionUser: mocks.user }));
vi.mock("@/lib/auth/rate-limit", () => ({ consumeLimit: mocks.limit }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { changeCommentAction, setReactionAction } from "./actions";
beforeEach(() => vi.clearAllMocks());
it("rejects unauthenticated mutations without touching the database", async () => {
  mocks.user.mockRejectedValue(new Error("Access denied"));
  expect(
    await setReactionAction({ recipeId: "recipe", kind: "save", active: true }),
  ).toEqual({ success: false, code: "AUTH" });
  expect(mocks.limit).not.toHaveBeenCalled();
});
it("validates inputs and enforces separate comment/reaction rate budgets", async () => {
  expect(
    await changeCommentAction({
      operation: "create",
      recipeId: "recipe",
      body: " ",
    }),
  ).toEqual({ success: false, code: "INVALID" });
  mocks.user.mockResolvedValue({ id: "owner" });
  mocks.limit.mockResolvedValue(false);
  expect(
    await changeCommentAction({
      operation: "create",
      recipeId: "recipe",
      body: "Hello",
    }),
  ).toEqual({ success: false, code: "LIMIT" });
  expect(mocks.limit).toHaveBeenLastCalledWith(
    "comment-create",
    "owner",
    10,
    600,
  );
  expect(
    await setReactionAction({ recipeId: "recipe", kind: "like", active: true }),
  ).toEqual({ success: false, code: "LIMIT" });
  expect(mocks.limit).toHaveBeenLastCalledWith("social-like", "owner", 120, 60);
});
