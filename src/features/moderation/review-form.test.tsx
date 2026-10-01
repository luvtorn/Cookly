import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { ReviewForm } from "./review-form";
const mocks = vi.hoisted(() => ({ review: vi.fn(), refresh: vi.fn() }));
vi.mock("./actions", () => ({ reviewRecipeAction: mocks.review }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
beforeEach(() => {
  mocks.review.mockReset();
  mocks.refresh.mockReset();
});
it("disables unchanged decisions and requires a message for reopening", () => {
  render(
    <ReviewForm
      recipeId="r"
      updatedAt="2026-10-01T00:00:00.000Z"
      currentStatus="NONE"
    />,
  );
  expect(
    screen.getByRole("button", { name: "Save verification status" }),
  ).toBeDisabled();
  fireEvent.click(
    screen.getByRole("combobox", { name: "New verification status" }),
  );
  fireEvent.click(screen.getByRole("option", { name: "Pending" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Save verification status" }),
  );
  expect(screen.getByRole("status")).toHaveTextContent("explain to the author");
  expect(mocks.review).not.toHaveBeenCalled();
});
it("confirms badge removal and submits an explicit version and target", async () => {
  mocks.review.mockResolvedValue({ success: true, message: "Review saved." });
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  render(
    <ReviewForm
      recipeId="r"
      updatedAt="2026-10-01T00:00:00.000Z"
      currentStatus="VERIFIED"
    />,
  );
  fireEvent.click(
    screen.getByRole("combobox", { name: "New verification status" }),
  );
  fireEvent.click(screen.getByRole("option", { name: "Not reviewed" }));
  fireEvent.change(screen.getByLabelText("Message to author"), {
    target: { value: "Review withdrawn" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Save verification status" }),
  );
  expect(mocks.review).not.toHaveBeenCalled();
  confirm.mockReturnValue(true);
  fireEvent.click(
    screen.getByRole("button", { name: "Save verification status" }),
  );
  await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
  expect(mocks.review).toHaveBeenCalledWith({
    recipeId: "r",
    updatedAt: "2026-10-01T00:00:00.000Z",
    targetStatus: "NONE",
    creatorMessage: "Review withdrawn",
    note: "",
  });
  confirm.mockRestore();
});
