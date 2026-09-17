"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      className="icon-button theme-toggle"
      aria-label="Toggle color theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="theme-sun" size={20} aria-hidden="true" />
      <Moon className="theme-moon" size={20} aria-hidden="true" />
    </button>
  );
}
