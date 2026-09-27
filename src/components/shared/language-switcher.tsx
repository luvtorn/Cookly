"use client";

import clsx from "clsx";
import { Check, ChevronDown, Globe2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { setLocaleAction } from "@/lib/i18n/actions";
import {
  localeCookie,
  locales,
  localizePath,
  type Locale,
} from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/context";

const names: Record<Locale, string> = {
  en: "English",
  ru: "Русский",
  pl: "Polski",
};

export function LanguageSwitcher({
  showLabel = false,
}: {
  showLabel?: boolean;
}) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { locale, t } = useI18n();
  const [pending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const options = useRef<Record<Locale, HTMLButtonElement | null>>({
    en: null,
    ru: null,
    pl: null,
  });

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target))
        setIsOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const choose = (next: Locale) => {
    setIsOpen(false);
    trigger.current?.focus();
    if (next === locale) return;
    startTransition(async () => {
      await setLocaleAction(next);
      document.cookie = `${localeCookie}=${next}; Max-Age=31536000; Path=/; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
      router.replace(
        `${localizePath(next, pathname)}${window.location.search}${window.location.hash}`,
      );
    });
  };

  return (
    <div
      ref={root}
      className={clsx("language-switcher", isOpen && "language-switcher--open")}
      onBlur={(event) => {
        if (
          !(event.relatedTarget instanceof Node) ||
          !event.currentTarget.contains(event.relatedTarget)
        )
          setIsOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && isOpen) {
          event.preventDefault();
          setIsOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="language-trigger"
        aria-label={`${t("common.language")}: ${names[locale]}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        disabled={pending}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setIsOpen(true);
            requestAnimationFrame(() => options.current[locale]?.focus());
          }
        }}
      >
        <span className="dock-icon">
          <Globe2 aria-hidden="true" />
        </span>
        {showLabel ? (
          <span className="language-label">{t("common.language")}</span>
        ) : null}
        <span className="language-code" aria-hidden="true">
          {locale.toUpperCase()}
        </span>
        <ChevronDown className="language-chevron" aria-hidden="true" />
      </button>
      {isOpen ? (
        <div
          className="language-menu"
          role="menu"
          aria-label={t("common.language")}
        >
          {locales.map((item, index) => (
            <button
              key={item}
              ref={(element) => {
                options.current[item] = element;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={item === locale}
              onClick={() => choose(item)}
              onKeyDown={(event) => {
                let next = index;
                if (event.key === "ArrowDown")
                  next = (index + 1) % locales.length;
                else if (event.key === "ArrowUp")
                  next = (index - 1 + locales.length) % locales.length;
                else if (event.key === "Home") next = 0;
                else if (event.key === "End") next = locales.length - 1;
                else return;
                event.preventDefault();
                options.current[locales[next]]?.focus();
              }}
            >
              <span className="language-option-code">{item.toUpperCase()}</span>
              <span>{names[item]}</span>
              {item === locale ? <Check size={16} aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
