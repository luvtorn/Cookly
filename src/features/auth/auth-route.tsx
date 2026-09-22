import { AuthModal } from "./auth-modal";
import { safeCallback } from "./schema";
import { getRequestLocale } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";

export type AuthSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

export async function AuthRoute({
  mode,
  searchParams,
  intercepted = false,
}: {
  mode: "sign-in" | "sign-up";
  searchParams: AuthSearchParams;
  intercepted?: boolean;
}) {
  const params = await searchParams;
  const locale = await getRequestLocale();
  return (
    <AuthModal
      mode={mode}
      callbackUrl={localizePath(locale, safeCallback(params.callbackUrl))}
      intercepted={intercepted}
    />
  );
}
