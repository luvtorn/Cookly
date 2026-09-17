import Link from "next/link";
import { Leaf } from "lucide-react";

import { SiteFooter } from "@/components/shared/site-footer";
import { SiteHeader } from "@/components/shared/site-header";

export default function NotFound() {
  return (
    <div className="public-shell">
      <SiteHeader />
      <main id="main-content" className="status-shell glass">
        <Leaf className="status-icon" size={36} aria-hidden="true" />
        <p className="eyebrow">404 · Off the menu</p>
        <h1>This page isn’t on the menu.</h1>
        <p>Let’s head back to the kitchen and find something delicious.</p>
        <Link href="/" className="button-primary">
          Back to Home <span aria-hidden="true">→</span>
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
