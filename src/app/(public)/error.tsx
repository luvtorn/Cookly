"use client";

import Link from "next/link";

import { Leaf } from "lucide-react";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main-content" className="status-shell glass">
      <Leaf className="status-icon" size={36} aria-hidden="true" />
      <p className="eyebrow">A small kitchen mishap</p>
      <h1>Let’s try that again.</h1>
      <p>We couldn’t prepare this page. Please try again in a moment.</p>
      <button className="button-primary" onClick={reset}>
        Try again
      </button>
      <Link href="/" className="text-link">
        Back to Home
      </Link>
    </main>
  );
}
