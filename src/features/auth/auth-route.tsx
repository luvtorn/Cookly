import { AuthModal } from "./auth-modal";
import { safeCallback } from "./schema";

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
  return (
    <AuthModal
      mode={mode}
      callbackUrl={safeCallback(params.callbackUrl)}
      intercepted={intercepted}
    />
  );
}
