"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function DesktopNavigation() {
  const pathname = usePathname();
  return (
    <nav className="desktop-navigation" aria-label="Main navigation">
      <Link
        href="/"
        className={pathname === "/" ? "nav-home" : undefined}
        aria-current={pathname === "/" ? "page" : undefined}
      >
        Home
      </Link>
      <Link href="/#recipes">Discover</Link>
      <Link href="/#pantry">Pantry</Link>
      <Link href="/#categories">Categories</Link>
    </nav>
  );
}
