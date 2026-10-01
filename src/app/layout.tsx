import type { Metadata } from "next";
import { headers } from "next/headers";
import localFont from "next/font/local";

import { Providers } from "@/app/providers";
import { GlassEffects } from "@/components/shared/glass-effects";
import { getI18n } from "@/lib/i18n/server";

import "./globals.css";
import "./catalog.css";
import "./social.css";
import "./navigation.css";
import "./toasts.css";
import "./social-actions.css";
import "./verification.css";

const sans = localFont({
  src: "./fonts/dm-sans.ttf",
  variable: "--font-cookly-sans",
  weight: "100 1000",
  display: "swap",
});

const display = localFont({
  src: [
    { path: "./fonts/lora.ttf", weight: "400 700", style: "normal" },
    { path: "./fonts/lora-italic.ttf", weight: "400 700", style: "italic" },
  ],
  variable: "--font-cookly-display",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  const pathname = (await headers()).get("x-cookly-pathname");
  const unprefixed = pathname?.replace(/^\/(?:en|ru|pl)(?=\/|$)/, "") || "/";
  const metadataBase = new URL(
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000",
  );
  return {
    metadataBase,
    title: { default: `Cookly — ${t("home.title")}`, template: "%s | Cookly" },
    description: t("home.description"),
    alternates: pathname
      ? {
          canonical: `/${locale}${unprefixed}`,
          languages: {
            en: `/en${unprefixed}`,
            ru: `/ru${unprefixed}`,
            pl: `/pl${unprefixed}`,
            "x-default": `/en${unprefixed}`,
          },
        }
      : undefined,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, messages } = await getI18n();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${sans.variable} ${display.variable} font-sans antialiased`}
      >
        <Providers locale={locale} messages={messages}>
          {children}
        </Providers>
        <GlassEffects />
      </body>
    </html>
  );
}
