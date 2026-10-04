import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  remove: vi.fn(),
  clear: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));
vi.mock("./actions", () => ({
  addPantryIngredient: vi.fn(),
  removePantryIngredient: mocks.remove,
  clearPantry: mocks.clear,
}));
import { PantryIngredientList } from "./ingredient-list";
import { pantryQuerySchema } from "./schema";
it("keeps saved products when a mutation fails and resets page only on success", async () => {
  const user = userEvent.setup();
  mocks.remove
    .mockResolvedValueOnce({ success: false, code: "FAILED" })
    .mockResolvedValueOnce({ success: true, data: [] });
  render(
    <PantryIngredientList
      items={[{ id: "a", name: "tomato" }]}
      query={pantryQuerySchema.parse({ page: 2, maxMissing: "any" })}
    />,
  );
  await user.click(screen.getByRole("button", { name: "Remove tomato" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not save");
  expect(screen.getByText("tomato")).toBeVisible();
  expect(mocks.replace).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Remove tomato" }));
  expect(await screen.findByText("Ingredient list saved.")).toBeVisible();
  expect(mocks.replace).toHaveBeenCalledWith("/en/pantry?maxMissing=any", {
    scroll: false,
  });
});
it("does not clear without confirmation", async () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  const user = userEvent.setup();
  render(
    <PantryIngredientList
      items={[{ id: "a", name: "tomato" }]}
      query={pantryQuerySchema.parse({})}
    />,
  );
  await user.click(
    screen.getByRole("button", { name: "Clear ingredient list" }),
  );
  expect(mocks.clear).not.toHaveBeenCalled();
  confirm.mockRestore();
});
