"use client";
import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getNavigationState } from "./navigation-state";
import { useI18n } from "@/lib/i18n/context";

export function DesktopNavigation() {
  const pathname = usePathname() ?? "";
  const state = getNavigationState(pathname);
  const { t, href } = useI18n();
  return (
    <nav className="desktop-navigation" aria-label={t("nav.main")}>
      <Link
        href={href("/")}
        className={state.isHome ? "nav-home" : undefined}
        aria-current={state.isHome ? "page" : undefined}
      >
        {t("common.home")}
      </Link>
      <Link
        href={href("/recipes")}
        className={state.isRecipes ? "nav-home" : undefined}
        aria-current={state.isRecipes ? "page" : undefined}
      >
        {t("common.recipes")}
      </Link>
      <Link
        href={href("/pantry")}
        className={state.isIngredients ? "nav-home" : undefined}
        aria-current={state.isIngredients ? "page" : undefined}
      >
        {t("common.myIngredients")}
      </Link>
      <Link
        href={href("/recipes/new")}
        className="new-recipe-button"
        aria-current={state.isCreate ? "page" : undefined}
      >
        <Plus size={18} strokeWidth={2.4} aria-hidden="true" />
        <span>{t("common.newRecipe")}</span>
      </Link>
    </nav>
  );
}
