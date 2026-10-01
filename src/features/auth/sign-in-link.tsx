"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserRound, Bookmark, Heart } from "lucide-react";
import { safeCallback } from "./schema";
import { rememberModalOrigin } from "./modal-origin";
import { useI18n } from "@/lib/i18n/context";

export function SignInLink({
  className = "sign-in-button",
  label,
  ariaLabel,
  icon = "user",
  compact = false,
}: {
  className?: string;
  label?: string;
  ariaLabel?: string;
  icon?: "user" | "bookmark" | "heart";
  compact?: boolean;
} = {}) {
  const router = useRouter();
  const { t, href } = useI18n();
  const visibleLabel = label ?? t("common.signIn");
  return (
    <Link
      className={className}
      aria-label={ariaLabel}
      href={href("/auth/sign-in")}
      scroll={false}
      onClick={(event) => {
        if (
          event.button ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        event.preventDefault();
        const callback = safeCallback(
          location.pathname + location.search + location.hash,
        );
        rememberModalOrigin(callback, event.currentTarget);
        router.push(
          href(`/auth/sign-in?callbackUrl=${encodeURIComponent(callback)}`),
          { scroll: false },
        );
      }}
    >
      <span className="dock-icon">
        {icon === "bookmark" ? (
          <Bookmark size={18} aria-hidden="true" />
        ) : icon === "heart" ? (
          <Heart size={18} aria-hidden="true" />
        ) : (
          <UserRound size={18} aria-hidden="true" />
        )}
      </span>
      <span className={compact ? "sr-only" : undefined}>{visibleLabel}</span>
    </Link>
  );
}
