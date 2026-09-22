"use client";

import { createContext, useContext, useEffect } from "react";

import type { Locale } from "./config";
import { localizePath } from "./config";
import { getMessages, type MessageKey, type Messages } from "./messages";

const I18nContext = createContext<{
  locale: Locale;
  messages: Messages;
}>({ locale: "en", messages: getMessages("en") });

export function I18nProvider({
  children,
  locale,
  messages,
}: {
  children: React.ReactNode;
  locale: Locale;
  messages: Messages;
}) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, messages }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  return {
    ...context,
    t: (key: MessageKey) => context.messages[key],
    href: (path: string) => localizePath(context.locale, path),
  };
}
