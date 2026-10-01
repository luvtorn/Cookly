import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi, beforeEach } from "vitest";
import { RequestReview, type OwnerVerification } from "./request-form";
import { requestVerificationAction } from "./request-action";
vi.mock("./request-action", () => ({ requestVerificationAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
const recipe: OwnerVerification = {
  id: "recipe",
  status: "PUBLISHED",
  isHidden: false,
  verificationStatus: "NONE",
  creatorMessage: null,
};
beforeEach(() => vi.clearAllMocks());
it("submits only recipe id and author note, retaining text on failure", async () => {
  vi.mocked(requestVerificationAction).mockResolvedValue({
    success: false,
    code: "limit",
  });
  render(<RequestReview recipe={recipe} />);
  const user = userEvent.setup();
  await user.click(
    screen.getByText("Request Cookly review", { selector: "summary" }),
  );
  await user.type(
    screen.getByLabelText("Message to the editor (optional)"),
    "Please review",
  );
  await user.click(
    screen.getByRole("button", { name: "Request Cookly review" }),
  );
  expect(requestVerificationAction).toHaveBeenCalledWith({
    recipeId: "recipe",
    creatorNote: "Please review",
  });
  expect(screen.getByRole("status")).toHaveTextContent("ten review requests");
  expect(screen.getByLabelText("Message to the editor (optional)")).toHaveValue(
    "Please review",
  );
});
it("shows creator feedback but offers no repeated rejected request", () => {
  render(
    <RequestReview
      recipe={{
        ...recipe,
        verificationStatus: "REJECTED",
        creatorMessage: "Clarify steps",
      }}
    />,
  );
  expect(screen.getByText("Needs changes")).toBeVisible();
  expect(screen.getByText(/Clarify steps/)).toBeVisible();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
it("does not offer review for drafts or hidden publications", () => {
  const { rerender } = render(
    <RequestReview recipe={{ ...recipe, status: "DRAFT" }} />,
  );
  expect(screen.queryByText("Request Cookly review")).not.toBeInTheDocument();
  rerender(<RequestReview recipe={{ ...recipe, isHidden: true }} />);
  expect(screen.queryByText("Request Cookly review")).not.toBeInTheDocument();
});
