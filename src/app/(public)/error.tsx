"use client";

import Link from "next/link";

import { Leaf } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t, href } = useI18n();
  return (
    <main id="main-content" className="status-shell glass">
      <Leaf className="status-icon" size={36} aria-hidden="true" />
      <p className="eyebrow">{t("error.eyebrow")}</p>
      <h1>{t("error.title")}</h1>
      <p>{t("error.description")}</p>
      <button className="button-primary" onClick={reset}>
        {t("common.tryAgain")}
      </button>
      <Link href={href("/")} className="text-link">
        {t("common.home")}
      </Link>
    </main>
  );
}
