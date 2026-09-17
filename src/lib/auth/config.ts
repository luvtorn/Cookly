import "server-only";

import type { NextAuthOptions } from "next-auth";

export const authConfig = {
  providers: [],
  secret: process.env.AUTH_SECRET,
} satisfies NextAuthOptions;
