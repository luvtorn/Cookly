import { SiteFooter } from "@/components/shared/site-footer";
import { SiteHeader } from "@/components/shared/site-header";

export default function PublicLayout({
  children,
  auth,
}: {
  children: React.ReactNode;
  auth: React.ReactNode;
}) {
  return (
    <div className="public-shell">
      <SiteHeader />
      {children}
      <SiteFooter />
      {auth}
    </div>
  );
}
