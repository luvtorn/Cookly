import "server-only";

import { headers } from "next/headers";

import { defaultLocale, isLocale } from "./config";
import { getMessages } from "./messages";

export async function getRequestLocale() {
  try {
    const value = (await headers()).get("x-cookly-locale");
    return isLocale(value) ? value : defaultLocale;
  } catch {
    // Direct component tests do not create a Next.js request store.
    return defaultLocale;
  }
}

export async function getI18n() {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  return {
    locale,
    messages,
    t: (key: keyof typeof messages) => messages[key],
  };
}
