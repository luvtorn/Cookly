export const locales = ["en", "ru", "pl"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";
export const localeCookie = "cookly_locale";

export function isLocale(value: string | null | undefined): value is Locale {
  return locales.includes(value as Locale);
}

export function localeFromPathname(pathname: string): Locale | undefined {
  const segment = pathname.split("/")[1];
  return isLocale(segment) ? segment : undefined;
}

export function stripLocalePrefix(pathname: string) {
  const locale = localeFromPathname(pathname);
  if (!locale) return pathname || "/";
  const stripped = pathname.slice(locale.length + 1);
  return stripped || "/";
}

export function localizePath(locale: Locale, href: string) {
  if (
    !href.startsWith("/") ||
    href.startsWith("//") ||
    href.startsWith("/api/") ||
    href === "/admin" ||
    href.startsWith("/admin/")
  ) {
    return href;
  }

  const hashIndex = href.indexOf("#");
  const queryIndex = href.indexOf("?");
  const suffixIndex = [hashIndex, queryIndex]
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];
  const pathname =
    suffixIndex === undefined ? href : href.slice(0, suffixIndex);
  const suffix = suffixIndex === undefined ? "" : href.slice(suffixIndex);
  const stripped = stripLocalePrefix(pathname);
  return `/${locale}${stripped === "/" ? "" : stripped}${suffix}`;
}

export function detectLocale(
  cookieLocale: string | null | undefined,
  acceptLanguage: string | null | undefined,
): Locale {
  if (isLocale(cookieLocale)) return cookieLocale;
  if (!acceptLanguage) return defaultLocale;

  const preferences = acceptLanguage
    .split(",")
    .map((entry) => {
      const [tag, ...parameters] = entry.trim().toLowerCase().split(";");
      const quality = parameters
        .map((parameter) => parameter.trim())
        .find((parameter) => parameter.startsWith("q="));
      const parsedQuality = quality ? Number(quality.slice(2)) : 1;
      return {
        locale: tag.split("-")[0],
        quality: Number.isFinite(parsedQuality) ? parsedQuality : 0,
      };
    })
    .sort((a, b) => b.quality - a.quality);

  const matched = preferences.find((preference) =>
    isLocale(preference.locale),
  )?.locale;
  return isLocale(matched) ? matched : defaultLocale;
}
