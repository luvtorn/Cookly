import type { Metadata } from "next";
import { HomeContent } from "@/features/discovery/home-content";
export const metadata: Metadata = {
  title: "Your account · Cookly",
  robots: { index: false, follow: false },
};
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <HomeContent searchParams={Promise.resolve({})} />
      {children}
    </>
  );
}
