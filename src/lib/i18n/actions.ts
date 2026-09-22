"use server";

import { cookies } from "next/headers";

import { isLocale, localeCookie } from "./config";

export async function setLocaleAction(value: string) {
  if (!isLocale(value)) return;
  (await cookies()).set(localeCookie, value, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
