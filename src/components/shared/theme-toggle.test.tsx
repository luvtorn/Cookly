import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "./theme-toggle";

const theme = vi.hoisted(() => ({ resolvedTheme: "light", setTheme: vi.fn() }));
vi.mock("next-themes", () => ({ useTheme: () => theme }));

describe("ThemeToggle", () => {
  it("switches from light to dark", async () => {
    theme.resolvedTheme = "light";
    render(<ThemeToggle />);
    await userEvent.click(
      screen.getByRole("button", { name: "Toggle color theme" }),
    );
    expect(theme.setTheme).toHaveBeenLastCalledWith("dark");
  });
  it("switches from dark to light", async () => {
    theme.resolvedTheme = "dark";
    render(<ThemeToggle />);
    await userEvent.click(
      screen.getByRole("button", { name: "Toggle color theme" }),
    );
    expect(theme.setTheme).toHaveBeenLastCalledWith("light");
  });
});
