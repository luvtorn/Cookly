"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserRound } from "lucide-react";
import { safeCallback } from "./schema";
import { rememberModalOrigin } from "./modal-origin";

export function SignInLink() {
  const router = useRouter();
  return (
    <Link
      className="sign-in-button"
      href="/auth/sign-in"
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
          `/auth/sign-in?callbackUrl=${encodeURIComponent(callback)}`,
          { scroll: false },
        );
      }}
    >
      <UserRound size={18} aria-hidden="true" />
      <span>Sign in</span>
    </Link>
  );
}
