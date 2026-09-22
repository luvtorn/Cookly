"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { I18nProvider } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages";

type ProvidersProps = Readonly<{
  children: React.ReactNode;
  locale: Locale;
  messages: Messages;
}>;

export function Providers({ children, locale, messages }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <I18nProvider locale={locale} messages={messages}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
