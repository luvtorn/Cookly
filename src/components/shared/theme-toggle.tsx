"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useI18n } from "@/lib/i18n/context";

export function ThemeToggle({ showLabel = false }: { showLabel?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useI18n();

  return (
    <button
      type="button"
      className="icon-button theme-toggle"
      aria-label={t("common.toggleTheme")}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <span className="dock-icon">
        <Sun className="theme-sun" size={20} aria-hidden="true" />
        <Moon className="theme-moon" size={20} aria-hidden="true" />
      </span>
      {showLabel && (
        <span className="theme-toggle-label">{t("common.theme")}</span>
      )}
    </button>
  );
}
