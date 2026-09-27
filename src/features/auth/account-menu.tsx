"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useI18n } from "@/lib/i18n/context";

export function SignOutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const { t, href } = useI18n();
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(false);
          try {
            await signOut({ callbackUrl: href("/") });
          } catch {
            setError(true);
            setPending(false);
          }
        }}
      >
        {pending ? t("account.signingOut") : t("common.signOut")}
      </button>
      {error && <p role="alert">{t("common.tryAgain")}</p>}
    </>
  );
}
export function AccountMenu({
  name,
  username,
  avatarUrl,
  isAdmin = false,
  variant = "header",
}: {
  name: string;
  username?: string;
  avatarUrl?: string | null;
  isAdmin?: boolean;
  variant?: "header" | "dock";
}) {
  const details = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (details.current) details.current.open = false;
  }, [pathname]);

  useEffect(() => {
    const closeFromOutside = (event: PointerEvent) => {
      const menu = details.current;
      if (
        menu?.open &&
        event.target instanceof Node &&
        !menu.contains(event.target)
      )
        menu.open = false;
    };
    document.addEventListener("pointerdown", closeFromOutside);
    return () => document.removeEventListener("pointerdown", closeFromOutside);
  }, []);

  return (
    <details
      ref={details}
      className={`account-menu account-menu--${variant}`}
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (next instanceof Node && event.currentTarget.contains(next)) return;
        event.currentTarget.open = false;
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && details.current) {
          details.current.open = false;
          details.current.querySelector("summary")?.focus();
        }
      }}
    >
      <summary aria-label={`Account: ${name}`}>
        <span className="account-initials" aria-hidden="true">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="" width={34} height={34} />
          ) : (
            name.trim().slice(0, 2).toUpperCase()
          )}
        </span>
        <span className="account-name">{name}</span>
      </summary>
      <div className="account-dropdown glass">
        <AccountLinks
          username={username}
          isAdmin={isAdmin}
          onNavigate={() => {
            if (details.current) details.current.open = false;
          }}
        />
      </div>
    </details>
  );
}

export function AccountLinks({
  username,
  isAdmin = false,
  onNavigate,
}: {
  username?: string;
  isAdmin?: boolean;
  onNavigate?: () => void;
}) {
  const { t, href } = useI18n();
  return (
    <>
      {isAdmin && (
        <Link href="/admin" onClick={onNavigate}>
          {t("account.studio")}
        </Link>
      )}
      {username ? (
        <Link href={href(`/u/${username}`)} onClick={onNavigate}>
          {t("account.myProfile")}
        </Link>
      ) : null}
      {!isAdmin ? (
        <Link href={href("/my-recipes")} onClick={onNavigate}>
          {t("account.myRecipes")}
        </Link>
      ) : null}
      <SignOutButton />
    </>
  );
}
