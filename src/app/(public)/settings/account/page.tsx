import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { SignOutButton } from "@/features/auth/account-menu";
import { getI18n } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";
export const metadata: Metadata = {
  title: "Your account · Cookly",
  robots: { index: false, follow: false },
};
export default async function AccountPage() {
  const { locale, t } = await getI18n();
  const user = await requireUser(localizePath(locale, "/settings/account"));
  return (
    <main id="main-content" className="account-page glass">
      <span className="auth-eyebrow">Cookly</span>
      <h1>{t("account.yourAccount")}</h1>
      <p>{t("nav.yourSpace")}</p>
      <dl>
        <dt>{t("auth.displayName")}</dt>
        <dd>{user.profile?.displayName ?? t("common.cooklyMember")}</dd>
        <dt>{t("auth.username")}</dt>
        <dd>{user.profile?.username ?? "—"}</dd>
        <dt>{t("auth.email")}</dt>
        <dd>{user.email}</dd>
      </dl>
      <SignOutButton />
    </main>
  );
}
