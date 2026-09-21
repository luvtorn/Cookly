"use server";
import { headers } from "next/headers";
import { register } from "./service";
import { clientAddress } from "@/lib/auth/rate-limit";

export async function registerAction(input: unknown) {
  try {
    // Next.js enforces Origin/Host agreement for Server Action requests.
    const requestHeaders = await headers();
    return await register(
      input,
      clientAddress(Object.fromEntries(requestHeaders)),
    );
  } catch {
    return {
      success: false as const,
      message:
        "Unable to create an account with these details. Try signing in or try again later.",
    };
  }
}
