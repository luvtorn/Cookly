import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
export default async function AccountPage() {
  const { locale } = await getI18n();
  const user = await requireUser(localizePath(locale, "/settings/account"));
  if (!user.profile) notFound();
  redirect(localizePath(locale, `/u/${user.profile.username}`));
}
