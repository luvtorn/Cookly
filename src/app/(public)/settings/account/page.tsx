import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { SignOutButton } from "@/features/auth/account-menu";
export const metadata: Metadata = {
  title: "Your account · Cookly",
  robots: { index: false, follow: false },
};
export default async function AccountPage() {
  const user = await requireUser();
  return (
    <main id="main-content" className="account-page glass">
      <span className="auth-eyebrow">Your Cookly</span>
      <h1>Your account</h1>
      <p>Your own little corner of the kitchen.</p>
      <dl>
        <dt>Display name</dt>
        <dd>{user.profile?.displayName ?? "Cookly member"}</dd>
        <dt>Username</dt>
        <dd>{user.profile?.username ?? "—"}</dd>
        <dt>Email address</dt>
        <dd>{user.email}</dd>
      </dl>
      <SignOutButton />
    </main>
  );
}
