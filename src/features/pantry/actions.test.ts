import { expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  actor: vi.fn(),
  limit: vi.fn(),
  change: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("@/lib/auth/user-action", () => ({ actionUser: mocks.actor }));
vi.mock("@/lib/auth/rate-limit", () => ({ consumeLimit: mocks.limit }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.refresh }));
vi.mock("./service", () => ({
  changePantry: mocks.change,
  PantryError: class extends Error {
    constructor(public code: string) {
      super(code);
    }
  },
}));
import {
  addPantryIngredient,
  removePantryIngredient,
  clearPantry,
} from "./actions";
it("rejects guests and rate-limited writes without calling persistence", async () => {
  mocks.actor.mockRejectedValueOnce(new Error("Denied"));
  expect(await addPantryIngredient({ ingredientId: "a" })).toEqual({
    success: false,
    code: "AUTH",
  });
  mocks.actor.mockResolvedValue({ id: "owner" });
  mocks.limit.mockResolvedValueOnce(false);
  expect(await clearPantry()).toEqual({ success: false, code: "LIMIT" });
  expect(mocks.change).not.toHaveBeenCalled();
});
it("uses the server actor and revalidates localized pages", async () => {
  mocks.actor.mockResolvedValue({ id: "owner" });
  mocks.limit.mockResolvedValue(true);
  mocks.change.mockResolvedValue([]);
  expect(await removePantryIngredient({ ingredientId: "a" })).toEqual({
    success: true,
    data: [],
  });
  expect(mocks.change).toHaveBeenCalledWith("owner", "remove", {
    ingredientId: "a",
  });
  expect(mocks.refresh).toHaveBeenCalledWith("/pl/pantry");
});
