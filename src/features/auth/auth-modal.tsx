"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import Image from "next/image";
import { AuthForm } from "./auth-form";
import { getModalOrigin } from "./modal-origin";

const subscribe = () => () => {};

export function AuthModal({
  mode: initialMode,
  callbackUrl,
  intercepted = false,
}: {
  mode: "sign-in" | "sign-up";
  callbackUrl: string;
  intercepted?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mode =
    pathname === "/auth/sign-up"
      ? "sign-up"
      : pathname === "/auth/sign-in"
        ? "sign-in"
        : initialMode;
  const registered = searchParams.get("registered") === "1";
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const reduced = useReducedMotion();
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState(false);
  const [closing, setClosing] = useState(false);
  const close = () => {
    if (!pending) setClosing(true);
  };

  useEffect(() => {
    if (!hydrated) return;
    const element = dialog.current;
    const origin = intercepted ? getModalOrigin(callbackUrl) : undefined;
    const trigger = origin?.trigger ?? document.activeElement;
    const scrollPosition = {
      left: origin?.left ?? window.scrollX,
      top: origin?.top ?? window.scrollY,
    };
    const returnPath = callbackUrl;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    element?.showModal();
    window.scrollTo({ ...scrollPosition, behavior: "instant" });
    return () => {
      element?.close();
      document.documentElement.style.overflow = previousOverflow;
      requestAnimationFrame(() => {
        if (document.querySelector("dialog[open]")) return;
        const target =
          trigger instanceof HTMLElement &&
          trigger !== document.body &&
          trigger.isConnected &&
          !trigger.closest("dialog")
            ? trigger
            : document.querySelector<HTMLElement>(".sign-in-button");
        target?.focus({ preventScroll: true });
        if (
          intercepted &&
          location.pathname + location.search + location.hash === returnPath
        )
          window.scrollTo({ ...scrollPosition, behavior: "instant" });
      });
    };
  }, [hydrated, callbackUrl, intercepted]);

  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(
      () => {
        if (intercepted) router.back();
        else router.replace("/", { scroll: false });
      },
      reduced ? 0 : 220,
    );
    return () => clearTimeout(timer);
  }, [closing, intercepted, reduced, router]);

  if (!hydrated) return null;
  return createPortal(
    <dialog
      ref={dialog}
      className="auth-dialog"
      aria-labelledby="auth-title"
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'a[href]:not([aria-disabled="true"]), button:not(:disabled), input:not(:disabled), [tabindex="0"]',
          ),
        ).filter((element) => element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls.at(-1);
        if (!first) {
          event.preventDefault();
          return;
        }
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === event.currentTarget)
        ) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      data-closing={closing || undefined}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <motion.div
        className="auth-modal glass"
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: closing ? 0 : 1, y: closing && !reduced ? 8 : 0 }}
        transition={{ duration: reduced ? 0 : 0.22 }}
      >
        <button
          type="button"
          className="icon-button auth-close"
          aria-label="Close authentication"
          disabled={pending || closing}
          onClick={close}
        >
          <X size={20} aria-hidden="true" />
        </button>
        <aside className="auth-modal-story" aria-hidden="true">
          <div className="auth-modal-photo">
            <Image
              src="/images/lemon-pasta.webp"
              alt=""
              fill
              sizes="400px"
              loading="eager"
            />
          </div>
          <div className="auth-photo-caption">
            <span className="auth-eyebrow">Real recipes. Real people.</span>
            <h2>
              Good food.
              <br />
              <em>Better together.</em>
            </h2>
            <p>A little inspiration for your everyday cooking.</p>
          </div>
        </aside>
        <AuthForm
          key={mode}
          mode={mode}
          callbackUrl={callbackUrl}
          registered={registered}
          onPendingChange={setPending}
        />
      </motion.div>
    </dialog>,
    document.body,
  );
}
