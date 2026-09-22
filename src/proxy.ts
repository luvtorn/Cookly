import { NextResponse, type NextRequest } from "next/server";

import {
  detectLocale,
  localeCookie,
  localeFromPathname,
} from "@/lib/i18n/config";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const pathLocale = localeFromPathname(pathname);

  if (!pathLocale) {
    const locale = detectLocale(
      request.cookies.get(localeCookie)?.value,
      request.headers.get("accept-language"),
    );
    const target = request.nextUrl.clone();
    target.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(target);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-cookly-locale", pathLocale);
  requestHeaders.set("x-cookly-pathname", pathname);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (request.cookies.get(localeCookie)?.value !== pathLocale) {
    response.cookies.set(localeCookie, pathLocale, {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|admin(?:/|$)|.*\\..*).*)"],
};
