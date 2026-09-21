"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";

export function SignOutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(false);
          try {
            await signOut({ callbackUrl: "/" });
          } catch {
            setError(true);
            setPending(false);
          }
        }}
      >
        {pending ? "Signing out…" : "Sign out"}
      </button>
      {error && <p role="alert">Please try again.</p>}
    </>
  );
}
export function AccountMenu({
  name,
  isAdmin = false,
}: {
  name: string;
  isAdmin?: boolean;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  return (
    <details
      ref={details}
      className="account-menu"
      onKeyDown={(event) => {
        if (event.key === "Escape" && details.current) {
          details.current.open = false;
          details.current.querySelector("summary")?.focus();
        }
      }}
    >
      <summary aria-label={`Account: ${name}`}>
        <span className="account-initials" aria-hidden="true">
          {name.trim().slice(0, 2).toUpperCase()}
        </span>
        <span className="account-name">{name}</span>
      </summary>
      <div className="account-dropdown glass">
        {isAdmin && <Link href="/admin">Cookly studio</Link>}
        <Link
          href="/settings/account"
          onClick={() => {
            if (details.current) details.current.open = false;
          }}
        >
          Your account
        </Link>
        <SignOutButton />
      </div>
    </details>
  );
}
