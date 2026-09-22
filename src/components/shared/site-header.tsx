import { Leaf } from "lucide-react";
import { SignInLink } from "@/features/auth/sign-in-link";
import Link from "next/link";

import { MobileNavigation } from "@/components/shared/mobile-navigation";
import { DesktopNavigation } from "@/components/shared/desktop-navigation";
import {
  DesktopDock,
  type NavigationUser,
} from "@/components/shared/desktop-dock";
import { AccountMenu } from "@/features/auth/account-menu";
import { getCurrentUser } from "@/lib/auth/session";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { getI18n } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";

export async function SiteHeader() {
  const { locale, t } = await getI18n();
  const user = await getCurrentUser();
  const navigationUser: NavigationUser | undefined = user
    ? {
        name: user.profile?.displayName ?? t("common.cooklyMember"),
        username: user.profile?.username,
        avatarUrl: user.profile?.avatarUrl,
        isAdmin: user.role === "ADMIN",
      }
    : undefined;
  return (
    <>
      <Link className="skip-link" href="#main-content">
        {t("common.skipContent")}
      </Link>
      <header className="site-header glass">
        <Link
          href={localizePath(locale, "/")}
          className="wordmark"
          aria-label="Cookly home"
        >
          <Leaf aria-hidden="true" />
          Cookly
        </Link>
        <DesktopNavigation />
        <div className="header-actions">
          <ThemeToggle />
          <LanguageSwitcher />
          <span className="header-divider" aria-hidden="true" />
          <span className="header-account-access">
            {navigationUser ? (
              <AccountMenu {...navigationUser} />
            ) : (
              <SignInLink />
            )}
          </span>
        </div>
      </header>
      <DesktopDock user={navigationUser} />
      <MobileNavigation user={navigationUser} />
    </>
  );
}
