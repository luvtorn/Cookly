import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import ErrorPage from "./(public)/error";
import Loading from "./(public)/loading";

it("offers retry without exposing error details", async () => {
  const reset = vi.fn();
  render(
    <ErrorPage error={new Error("private connection details")} reset={reset} />,
  );
  expect(
    screen.queryByText(/private connection details/),
  ).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(reset).toHaveBeenCalledOnce();
});

it("announces the loading state", () => {
  render(<Loading />);
  expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
  expect(screen.getByRole("status")).toHaveTextContent(
    "Preparing some cooking inspiration",
  );
});
