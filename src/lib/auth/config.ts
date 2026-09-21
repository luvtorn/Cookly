import "server-only";

import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authenticate } from "@/features/auth/service";
import { safeCallback } from "@/features/auth/schema";
import { clientAddress } from "./rate-limit";
import { requireAuthSecret } from "@/lib/validation/environment";

export function getAuthConfig(): NextAuthOptions {
  return {
    secret: requireAuthSecret(process.env),
    session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
    pages: { signIn: "/auth/sign-in", error: "/auth/sign-in" },
    providers: [
      Credentials({
        name: "Email and password",
        credentials: {
          email: { type: "email" },
          password: { type: "password" },
        },
        async authorize(credentials, request) {
          try {
            return await authenticate(
              credentials,
              clientAddress(request.headers ?? {}),
            );
          } catch {
            return null;
          }
        },
      }),
    ],
    callbacks: {
      async session({ session, token }) {
        if (session.user && token.sub) session.user.id = token.sub;
        return session;
      },
      async redirect({ url, baseUrl }) {
        const relative = url.startsWith(`${baseUrl}/`)
          ? url.slice(baseUrl.length)
          : url;
        return baseUrl + safeCallback(relative);
      },
    },
    logger: {
      error() {
        console.error("Authentication request failed.");
      },
      warn() {},
      debug() {},
    },
  };
}
