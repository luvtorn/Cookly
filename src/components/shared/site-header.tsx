import { Leaf, UserRound } from "lucide-react";
import Link from "next/link";

import { MobileNavigation } from "@/components/shared/mobile-navigation";
import { PreviewNotice } from "@/components/shared/preview-notice";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export function SiteHeader() {
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
        <nav className="desktop-navigation" aria-label="Main navigation">
          <Link href="/" className="nav-home">
            Home
          </Link>
          <Link href="/#recipes">Discover</Link>
          <Link href="/#pantry">Pantry</Link>
          <Link href="/#categories">Categories</Link>
        </nav>
        <div className="header-actions">
          <ThemeToggle />
          <span className="header-divider" aria-hidden="true" />
          <PreviewNotice
            className="sign-in-button"
            ariaLabel="Sign in"
            title="Your cooking story starts here"
            description="Accounts are coming in the authentication milestone. For now, explore the sample recipes and make yourself at home."
          >
            <UserRound size={18} aria-hidden="true" />
            <span>Sign in</span>
          </PreviewNotice>
          <MobileNavigation />
        </div>
      </header>
    </>
  );
}
