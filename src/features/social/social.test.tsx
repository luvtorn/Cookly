import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/shared/toast-provider";
import { SocialProvider } from "./social-provider";
import { RecipeReactions } from "./recipe-reactions";
import { Comments } from "./comments";
import type { CommentPage } from "./schema";
const mocks = vi.hoisted(() => ({
  reaction: vi.fn(),
  comment: vi.fn(),
  load: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh, push: vi.fn() }),
}));
vi.mock("./actions", () => ({
  setReactionAction: mocks.reaction,
  changeCommentAction: mocks.comment,
  loadCommentsAction: mocks.load,
}));
beforeEach(() => vi.clearAllMocks());
function wrap(children: React.ReactNode, viewer: string | null = "owner") {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <ToastProvider>
        <SocialProvider
          viewer={viewer}
          unavailable={false}
          initial={{ recipe: { isLiked: false, isSaved: false, likeCount: 0 } }}
        >
          {children}
        </SocialProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
}
it("shares optimistic like state between controls, blocks repeats, and rolls back failure", async () => {
  let finish: ((value: { success: false; code: string }) => void) | undefined;
  mocks.reaction.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  wrap(
    <>
      <RecipeReactions recipeId="recipe" likeCount={0} />
      <RecipeReactions recipeId="recipe" likeCount={0} compact />
    </>,
  );
  expect(
    screen.getAllByRole("button", { name: "Like recipe" })[1].parentElement,
  ).toHaveClass("recipe-reactions", "recipe-reactions--compact");
  fireEvent.click(screen.getAllByRole("button", { name: "Like recipe" })[0]);
  await waitFor(() =>
    expect(screen.getAllByRole("button", { name: "Remove like" })).toHaveLength(
      2,
    ),
  );
  for (const button of screen.getAllByRole("button", { name: "Remove like" }))
    expect(button).toBeDisabled();
  finish?.({ success: false, code: "FAILED" });
  await waitFor(() =>
    expect(screen.getAllByRole("button", { name: "Like recipe" })).toHaveLength(
      2,
    ),
  );
  expect(mocks.reaction).toHaveBeenCalledTimes(1);
});
it("shows save feedback only after success and exposes guest sign-in links", async () => {
  mocks.reaction.mockResolvedValue({
    success: true,
    data: { isLiked: false, isSaved: true, likeCount: 0 },
  });
  const view = wrap(<RecipeReactions recipeId="recipe" likeCount={0} />);
  await userEvent.click(screen.getByRole("button", { name: "Save recipe" }));
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent("Recipe saved"),
  );
  expect(mocks.refresh).toHaveBeenCalled();
  view.unmount();
  wrap(<RecipeReactions recipeId="recipe" likeCount={0} />, null);
  expect(screen.getByRole("link", { name: "Save recipe" })).toHaveAttribute(
    "href",
    "/en/auth/sign-in",
  );
});
const initial: CommentPage = {
  items: [
    {
      id: "comment",
      author: "Cook",
      username: "cook",
      avatar: null,
      body: "Original",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      canEdit: true,
    },
  ],
  count: 1,
  cursor: null,
};
it("retains failed drafts, edits inline, and requires confirmation before deletion", async () => {
  mocks.comment.mockResolvedValue({ success: false, code: "FAILED" });
  wrap(<Comments recipeId="recipe" initial={initial} />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Your comment"), "Keep my draft");
  await user.click(screen.getByRole("button", { name: "Post comment" }));
  await screen.findByRole("alert");
  expect(screen.getByLabelText("Your comment")).toHaveValue("Keep my draft");
  await user.click(screen.getByRole("button", { name: "Edit" }));
  expect(screen.getByDisplayValue("Original")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  mocks.comment.mockClear();
  await user.click(screen.getByRole("button", { name: "Delete" }));
  expect(mocks.comment).not.toHaveBeenCalled();
  expect(screen.getByText("Delete this comment?")).toBeInTheDocument();
  mocks.comment.mockResolvedValue({ success: true, data: null });
  mocks.load.mockResolvedValue({
    success: true,
    data: { items: [], count: 0, cursor: null },
  });
  await user.click(screen.getByRole("button", { name: "Delete" }));
  await waitFor(() =>
    expect(screen.queryByText("Original")).not.toBeInTheDocument(),
  );
  expect(mocks.comment).toHaveBeenCalledWith(
    expect.objectContaining({ operation: "delete", id: "comment" }),
  );
});
