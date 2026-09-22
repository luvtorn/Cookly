import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { MobileNavigation } from "./mobile-navigation";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn() }),
}));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

describe("MobileNavigation", () => {
  it("exposes five destinations and restores focus after closing Profile", async () => {
    const user = userEvent.setup();
    render(
      <MobileNavigation
        user={{
          name: "Garden Cook",
          username: "garden_cook",
          isAdmin: false,
        }}
      />,
    );
    const navigation = screen.getByRole("navigation", {
      name: "Mobile navigation",
    });
    expect(navigation.getElementsByTagName("a")).toHaveLength(4);
    expect(
      screen.getByRole("link", { name: "Create a recipe" }),
    ).toHaveAttribute("href", "/en/recipes/new");
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    const profile = screen.getByRole("button", { name: "Open profile menu" });
    await user.click(profile);
    const sheet = screen.getByRole("dialog", { name: "Garden Cook" });
    expect(sheet).toHaveAttribute("open");
    expect(
      screen.getByRole("link", { name: "Public profile" }),
    ).toHaveAttribute("href", "/en/u/garden_cook");
    fireEvent(sheet, new Event("cancel", { cancelable: true }));
    expect(sheet).not.toHaveAttribute("open");
    expect(profile).toHaveFocus();
  }, 15000);
});
