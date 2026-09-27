import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountMenu } from "./account-menu";

const navigation = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));
vi.mock("next-auth/react", () => ({ signOut: vi.fn() }));

describe("AccountMenu", () => {
  beforeEach(() => {
    navigation.pathname = "/";
  });

  it("closes when focus moves outside and supports Escape", async () => {
    const user = userEvent.setup();
    render(
      <>
        <AccountMenu name="Mikolaj Germanenko" username="mikolaj" />
        <button type="button">Outside</button>
      </>,
    );
    const summary = screen.getByText("Mikolaj Germanenko").closest("summary");
    const details = summary?.closest("details");
    expect(summary).not.toBeNull();
    expect(details).not.toBeNull();
    if (!summary || !details) throw new Error("Account menu did not render.");

    await user.click(summary);
    expect(details).toHaveAttribute("open");
    expect(screen.getByRole("link", { name: "My profile" })).toHaveAttribute(
      "href",
      "/en/u/mikolaj",
    );
    expect(
      screen.queryByRole("link", { name: "Edit profile" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Your account" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Outside" }));
    expect(details).not.toHaveAttribute("open");

    await user.click(summary);
    await user.keyboard("{Escape}");
    expect(details).not.toHaveAttribute("open");
    expect(summary).toHaveFocus();
  });
});
