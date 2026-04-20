import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isPublicPath(pathname: string): boolean {
  if (pathname === "/" || pathname === "/b" || pathname.startsWith("/b/"))
    return true;
  // /board/<slug> may be publicly accessible if the board is public; let the
  // page decide (it redirects to /b/<slug> for public boards or /login otherwise).
  if (pathname.startsWith("/board/")) return true;
  if (pathname === "/login" || pathname === "/register") return true;
  return false;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("selfstack-session");

  // Public paths are always accessible (auth & public boards)
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Protected paths: redirect to login if no session cookie
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
