"use client";

import { Globe2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { setLocaleAction } from "@/lib/i18n/actions";
import {
  localeCookie,
  locales,
  localizePath,
  type Locale,
} from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/context";

const names: Record<Locale, string> = { en: "EN", ru: "RU", pl: "PL" };

export function LanguageSwitcher({
  showLabel = false,
}: {
  showLabel?: boolean;
}) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { locale, t } = useI18n();
  const [pending, startTransition] = useTransition();

  return (
    <label className="language-switcher">
      <span className="dock-icon">
        <Globe2 aria-hidden="true" />
      </span>
      {showLabel ? <span>{t("common.language")}</span> : null}
      <select
        aria-label={t("common.language")}
        value={locale}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value as Locale;
          startTransition(async () => {
            await setLocaleAction(next);
            document.cookie = `${localeCookie}=${next}; Max-Age=31536000; Path=/; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
            const suffix = `${window.location.search}${window.location.hash}`;
            router.replace(`${localizePath(next, pathname)}${suffix}`);
          });
        }}
      >
        {locales.map((item) => (
          <option value={item} key={item}>
            {names[item]}
          </option>
        ))}
      </select>
    </label>
  );
}
