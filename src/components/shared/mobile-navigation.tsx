"use client";

import {
  BookOpen,
  House,
  Plus,
  Refrigerator,
  UserRound,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";

import type { NavigationUser } from "./desktop-dock";
import { getNavigationState } from "./navigation-state";
import { AccountLinks } from "@/features/auth/account-menu";
import { SignInLink } from "@/features/auth/sign-in-link";
import { useI18n } from "@/lib/i18n/context";

export function MobileNavigation({ user }: { user?: NavigationUser }) {
  const pathname = usePathname() ?? "";
  const state = getNavigationState(pathname);
  const dialog = useRef<HTMLDialogElement>(null);
  const profileButton = useRef<HTMLButtonElement>(null);
  const closeProfile = () => dialog.current?.close();
  const finishClose = () => profileButton.current?.focus();
  const { t, href } = useI18n();

  return (
    <>
      <nav
        className={`mobile-bottom-navigation glass${state.isEditor ? "mobile-bottom-navigation--hidden" : ""}`}
        aria-label={t("nav.mobile")}
      >
        <Link href={href("/")} aria-current={state.isHome ? "page" : undefined}>
          <House aria-hidden="true" />
          <span>{t("common.home")}</span>
        </Link>
        <Link
          href={href("/recipes")}
          aria-current={state.isRecipes ? "page" : undefined}
        >
          <BookOpen aria-hidden="true" />
          <span>{t("common.recipes")}</span>
        </Link>
        <Link
          href={href("/recipes/new")}
          className="mobile-create-button"
          aria-label={t("nav.createRecipe")}
          aria-current={state.isCreate ? "page" : undefined}
        >
          <span className="mobile-create-icon">
            <Plus aria-hidden="true" />
          </span>
          <span>{t("common.create")}</span>
        </Link>
        <Link
          href={href("/pantry")}
          aria-current={state.isIngredients ? "page" : undefined}
        >
          <Refrigerator aria-hidden="true" />
          <span>{t("common.ingredients")}</span>
        </Link>
        {user ? (
          <button
            ref={profileButton}
            type="button"
            aria-label={t("nav.openProfile")}
            aria-haspopup="dialog"
            onClick={() => dialog.current?.showModal()}
          >
            {user.avatarUrl ? (
              <Image
                className="mobile-nav-avatar"
                src={user.avatarUrl}
                alt=""
                width={24}
                height={24}
              />
            ) : (
              <UserRound aria-hidden="true" />
            )}
            <span>{t("common.profile")}</span>
          </button>
        ) : (
          <SignInLink
            className="mobile-profile-access"
            label={t("common.profile")}
            ariaLabel={t("common.signIn")}
          />
        )}
      </nav>
      {user ? (
        <dialog
          ref={dialog}
          className="mobile-account-sheet"
          aria-labelledby="mobile-account-title"
          onClose={finishClose}
          onCancel={(event) => {
            event.preventDefault();
            closeProfile();
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) closeProfile();
          }}
        >
          <div className="mobile-account-surface glass">
            <header>
              <div>
                <p className="eyebrow">{t("nav.yourSpace")}</p>
                <h2 id="mobile-account-title">{user.name}</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label={t("nav.closeProfile")}
                onClick={closeProfile}
              >
                <X aria-hidden="true" />
              </button>
            </header>
            <nav aria-label={t("nav.accountAccess")}>
              <AccountLinks
                username={user.username}
                isAdmin={user.isAdmin}
                onNavigate={closeProfile}
              />
            </nav>
          </div>
        </dialog>
      ) : null}
    </>
  );
}
