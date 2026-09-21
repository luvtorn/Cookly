import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { getAuthConfig } from "@/lib/auth/config";

export const runtime = "nodejs";
async function handler(
  request: NextRequest,
  context: { params: Promise<{ nextauth: string[] }> },
) {
  try {
    return await NextAuth(getAuthConfig())(request, context);
  } catch {
    return Response.json(
      { error: "Authentication is temporarily unavailable." },
      { status: 503 },
    );
  }
}
export { handler as GET, handler as POST };
