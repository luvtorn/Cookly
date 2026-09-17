import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MobileNavigation } from "./mobile-navigation";

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return { ...actual, useReducedMotion: () => true };
});

describe("MobileNavigation", () => {
  it("exposes disclosure state and returns focus when closed with Escape", async () => {
    const user = userEvent.setup();
    render(<MobileNavigation />);
    const toggle = screen.getByRole("button", { name: "Open navigation" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    screen.getByRole("link", { name: "Discover recipes" }).focus();
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("navigation")).not.toBeInTheDocument(),
    );
    expect(toggle).toHaveFocus();
  });
});
