import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Top-level path segments that require authentication.
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/admin",
  "/board",
  "/media",
  "/settings",
  "/change-password",
];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname === "/login" || pathname === "/register") return true;
  // /board/<slug> may be publicly accessible if the board is public; the
  // page redirects to /<slug> for public boards or /login otherwise.
  if (pathname.startsWith("/board/")) return true;
  // Protected app routes require auth
  for (const p of PROTECTED_PREFIXES) {
    if (pathname === p || pathname.startsWith(p + "/")) return false;
  }
  // Anything else (single-segment URLs etc.) is treated as a potential
  // public board slug; the page will 404 if the slug does not match a
  // public board.
  return true;
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
