import { AuthRoute, type AuthSearchParams } from "@/features/auth/auth-route";
export default function Page({
  searchParams,
}: {
  searchParams: AuthSearchParams;
}) {
  return <AuthRoute mode="sign-in" searchParams={searchParams} />;
}
