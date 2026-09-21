import Link from "next/link";
import { Leaf, LayoutDashboard, Utensils } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { AccountMenu } from "@/features/auth/account-menu";
import { AdminNavigation } from "@/features/recipes/admin-navigation";
export const metadata = {
  title: "Cookly studio",
  robots: { index: false, follow: false },
};
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();
  return (
    <div className="admin-shell">
      <Link href="#main-content" className="skip-link">
        Skip to content
      </Link>
      <aside className="admin-sidebar glass">
        <Link className="wordmark" href="/">
          <Leaf aria-hidden="true" />
          Cookly
        </Link>
        <p className="eyebrow">Editorial studio</p>
        <AdminNavigation />
        <div className="admin-sidebar-note">
          <Utensils aria-hidden="true" />
          <h2>
            Good food.
            <br />
            Thoughtfully shared.
          </h2>
          <Link href="/#recipes" className="text-link">
            Visit Cookly →
          </Link>
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="admin-topbar glass">
          <span>
            <LayoutDashboard size={18} aria-hidden="true" /> Cookly studio
          </span>
          <div>
            <ThemeToggle />
            <AccountMenu
              name={user.profile?.displayName ?? "Administrator"}
              isAdmin
            />
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
