"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen } from "lucide-react";
export function AdminNavigation() {
  const path = usePathname();
  return (
    <nav aria-label="Studio navigation">
      {[
        { href: "/admin", label: "Overview", Icon: LayoutDashboard },
        { href: "/admin/recipes", label: "Recipes", Icon: BookOpen },
      ].map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={
            (href === "/admin" ? path === href : path.startsWith(href))
              ? "page"
              : undefined
          }
        >
          <Icon size={19} aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
