"use client";

import { BookOpen, House, Plus, Refrigerator } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { AccountMenu } from "@/features/auth/account-menu";
import { SignInLink } from "@/features/auth/sign-in-link";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { getNavigationState } from "./navigation-state";
import { useI18n } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/shared/language-switcher";

export type NavigationUser = {
  name: string;
  username?: string;
  avatarUrl?: string | null;
  isAdmin: boolean;
};

export function DesktopDock({ user }: { user?: NavigationUser }) {
  const pathname = usePathname() ?? "";
  const state = getNavigationState(pathname);
  const reduceMotion = useReducedMotion();
  const [isDocked, setIsDocked] = useState(false);
  const { t, href } = useI18n();

  useEffect(() => {
    const root = document.documentElement;
    const desktop = window.matchMedia("(min-width: 1100px)");
    let docked = false;
    let frame = 0;
    const commit = (next: boolean) => {
      if (next === docked) return;
      docked = next;
      setIsDocked(next);
      if (next) root.dataset.navigationDocked = "true";
      else delete root.dataset.navigationDocked;
    };
    const update = () => {
      frame = 0;
      if (!desktop.matches) return commit(false);
      if (!docked && window.scrollY >= 160) commit(true);
      else if (docked && window.scrollY <= 80) commit(false);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    desktop.addEventListener("change", schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      desktop.removeEventListener("change", schedule);
      delete root.dataset.navigationDocked;
    };
  }, []);

  return (
    <AnimatePresence>
      {isDocked ? (
        <motion.aside
          className="desktop-dock desktop-dock--visible"
          aria-label={t("nav.shortcuts")}
          initial={
            reduceMotion
              ? { opacity: 0, y: "-50%" }
              : { opacity: 0, x: -34, y: "-50%", scale: 0.92 }
          }
          animate={{ opacity: 1, x: 0, y: "-50%", scale: 1 }}
          exit={
            reduceMotion
              ? { opacity: 0, y: "-50%" }
              : { opacity: 0, x: -24, y: "-50%", scale: 0.94 }
          }
          transition={{
            duration: reduceMotion ? 0.12 : 0.27,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <div className="desktop-dock-surface glass">
            <nav aria-label={t("nav.main")}>
              <Link
                href={href("/")}
                aria-current={state.isHome ? "page" : undefined}
              >
                <span className="dock-icon">
                  <House aria-hidden="true" />
                </span>
                <span>{t("common.home")}</span>
              </Link>
              <Link
                href={href("/recipes")}
                aria-current={state.isRecipes ? "page" : undefined}
              >
                <span className="dock-icon">
                  <BookOpen aria-hidden="true" />
                </span>
                <span>{t("common.recipes")}</span>
              </Link>
              <Link
                href={href("/pantry")}
                aria-current={state.isIngredients ? "page" : undefined}
              >
                <span className="dock-icon">
                  <Refrigerator aria-hidden="true" />
                </span>
                <span>{t("common.ingredients")}</span>
              </Link>
              <Link
                href={href("/recipes/new")}
                className="dock-create"
                aria-current={state.isCreate ? "page" : undefined}
              >
                <span className="dock-icon">
                  <Plus aria-hidden="true" />
                </span>
                <span>{t("common.newRecipe")}</span>
              </Link>
            </nav>
            <div className="desktop-dock-utilities">
              <ThemeToggle showLabel />
              <LanguageSwitcher showLabel />
              {user ? <AccountMenu {...user} variant="dock" /> : <SignInLink />}
            </div>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
