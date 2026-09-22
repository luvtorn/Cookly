import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/shared/site-footer";
import { SiteHeader } from "@/components/shared/site-header";
import { isLocale } from "@/lib/i18n/config";
import { I18nProvider } from "@/lib/i18n/context";
import { getMessages } from "@/lib/i18n/messages";

export default async function LocalizedPublicLayout({
  children,
  auth,
  params,
}: {
  children: React.ReactNode;
  auth: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = (await params).locale;
  if (!isLocale(locale)) notFound();
  return (
    <I18nProvider locale={locale} messages={getMessages(locale)}>
      <div className="public-shell">
        <SiteHeader />
        {children}
        <SiteFooter />
        {auth}
      </div>
    </I18nProvider>
  );
}

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ru" }, { locale: "pl" }];
}
