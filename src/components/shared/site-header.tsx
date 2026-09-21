import { Leaf } from "lucide-react";
import { SignInLink } from "@/features/auth/sign-in-link";
import Link from "next/link";

import { MobileNavigation } from "@/components/shared/mobile-navigation";
import { DesktopNavigation } from "@/components/shared/desktop-navigation";
import { AccountMenu } from "@/features/auth/account-menu";
import { getCurrentUser } from "@/lib/auth/session";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export async function SiteHeader() {
  const user = await getCurrentUser();
  return (
    <>
      <Link className="skip-link" href="#main-content">
        Skip to content
      </Link>
      <header className="site-header glass">
        <Link href="/" className="wordmark" aria-label="Cookly home">
          <Leaf aria-hidden="true" />
          Cookly
        </Link>
        <DesktopNavigation />
        <div className="header-actions">
          <ThemeToggle />
          <span className="header-divider" aria-hidden="true" />
          {user ? (
            <AccountMenu
              name={user.profile?.displayName ?? "Cookly member"}
              isAdmin={user.role === "ADMIN"}
            />
          ) : (
            <SignInLink />
          )}
          <MobileNavigation />
        </div>
      </header>
    </>
  );
}
