import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  register: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  signIn: vi.fn(),
}));
vi.mock("./actions", () => ({ registerAction: mocks.register }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.push,
    replace: mocks.replace,
    refresh: mocks.refresh,
  }),
}));
vi.mock("next-auth/react", () => ({ signIn: mocks.signIn }));
import { AuthForm } from "./auth-form";

it("supports password visibility, pending protection and safe registration errors", async () => {
  let finish:
    ((value: { success: false; message: string }) => void) | undefined;
  mocks.register.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const user = userEvent.setup();
  render(<AuthForm mode="sign-up" callbackUrl="/settings/account" />);
  await user.type(
    screen.getByLabelText("Display name", { exact: true }),
    "Cook",
  );
  await user.type(
    screen.getByLabelText("Username", { exact: true }),
    "cook_test",
  );
  await user.type(
    screen.getByLabelText("Email address", { exact: true }),
    "cook@example.test",
  );
  const password = screen.getByLabelText("Password", { exact: true });
  await user.type(password, "a long cooking password");
  await user.click(screen.getByRole("button", { name: "Show password" }));
  expect(password).toHaveAttribute("type", "text");
  await user.type(
    screen.getByLabelText("Confirm password"),
    "a long cooking password",
  );
  await user.click(screen.getByRole("button", { name: "Create account" }));
  expect(screen.getByRole("button", { name: "Please wait…" })).toBeDisabled();
  expect(mocks.register).toHaveBeenCalledTimes(1);
  finish?.({ success: false, message: "Please try again later." });
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Please try again later.",
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeEnabled(),
  );
});
