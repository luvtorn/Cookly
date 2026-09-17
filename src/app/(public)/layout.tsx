import { SiteFooter } from "@/components/shared/site-footer";
import { SiteHeader } from "@/components/shared/site-header";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="public-shell">
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
