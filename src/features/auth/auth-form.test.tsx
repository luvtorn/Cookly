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
import { ToastProvider } from "@/components/shared/toast-provider";

it("announces a successful login before navigating and supports dismissal", async () => {
  mocks.signIn.mockResolvedValue({ ok: true, error: null });
  const user = userEvent.setup();
  render(
    <ToastProvider>
      <AuthForm mode="sign-in" callbackUrl="/en/recipes" />
    </ToastProvider>,
  );
  await user.type(
    screen.getByLabelText("Email address", { exact: true }),
    "cook@example.test",
  );
  await user.type(
    screen.getByLabelText("Password", { exact: true }),
    "a long cooking password",
  );
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent("You're signed in"),
  );
  expect(mocks.replace).toHaveBeenCalledWith("/en/recipes");
  await user.click(screen.getByRole("button", { name: "Close" }));
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
}, 15000);

it("does not announce success when credentials are rejected", async () => {
  mocks.signIn.mockResolvedValue({ ok: false, error: "CredentialsSignin" });
  const user = userEvent.setup();
  render(
    <ToastProvider>
      <AuthForm mode="sign-in" callbackUrl="/en/recipes" />
    </ToastProvider>,
  );
  await user.type(
    screen.getByLabelText("Email address", { exact: true }),
    "cook@example.test",
  );
  await user.type(
    screen.getByLabelText("Password", { exact: true }),
    "a long cooking password",
  );
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  await screen.findByRole("alert");
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
}, 15000);

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
  render(
    <ToastProvider>
      <AuthForm mode="sign-up" callbackUrl="/settings/account" />
    </ToastProvider>,
  );
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
}, 15000);
