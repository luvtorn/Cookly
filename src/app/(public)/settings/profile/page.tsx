import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { ProfileForm } from "@/features/users/profile-form";
import { getI18n } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";

export const metadata: Metadata = {
  title: "Edit profile",
  robots: { index: false, follow: false },
};

export default async function ProfileSettingsPage() {
  const { locale, t } = await getI18n();
  const user = await requireUser(localizePath(locale, "/settings/profile"));
  const profile = await getDb().profile.findUnique({
    where: { userId: user.id },
    select: {
      displayName: true,
      username: true,
      bio: true,
      location: true,
      avatarUrl: true,
    },
  });
  if (!profile) throw new Error("Profile unavailable.");
  return (
    <main className="profile-settings home-container" id="main-content">
      <header>
        <p className="eyebrow">{t("profile.identity")}</p>
        <h1>{t("profile.edit")}</h1>
        <p>{t("profile.description")}</p>
        <Link
          className="text-link"
          href={localizePath(locale, `/u/${profile.username}`)}
        >
          {t("account.publicProfile")} →
        </Link>
      </header>
      <ProfileForm
        avatarUrl={profile.avatarUrl}
        initial={{
          displayName: profile.displayName,
          username: profile.username,
          bio: profile.bio ?? "",
          location: profile.location ?? "",
        }}
      />
    </main>
  );
}
