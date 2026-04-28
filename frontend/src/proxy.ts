import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_ACCESS_COOKIE, ADMIN_REFRESH_COOKIE } from "@/lib/admin-cookie";

const PROTECTED_PATHS = [
  "/dashboard",
  "/plan",
  "/library",
  "/workspace",
  "/plans",
  "/admin",
  "/mypage",
  "/settings",
];
const AUTH_PATHS = ["/login", "/register"];

function setPathHeader(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  return requestHeaders;
}

export function proxy(request: NextRequest) {
  const token = request.cookies.get("ai_planner_token")?.value;
  const adminToken = request.cookies.get(ADMIN_ACCESS_COOKIE)?.value;
  const adminRefreshToken = request.cookies.get(ADMIN_REFRESH_COOKIE)?.value;
  const { pathname } = request.nextUrl;

  const isWorkspaceJoin = pathname.startsWith("/workspace/join/");
  const isProtected =
    !isWorkspaceJoin &&
    PROTECTED_PATHS.some((path) => pathname.startsWith(path));
  const isAuthPage = AUTH_PATHS.some((path) => pathname.startsWith(path));
  const isAdminLogin = pathname.startsWith("/admin/login");
  const hasAdminCookie = !!adminToken || !!adminRefreshToken;

  if (pathname.startsWith("/admin")) {
    if (isAdminLogin) {
      return NextResponse.next({
        request: { headers: setPathHeader(request) },
      });
    }

    if (!hasAdminCookie) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set(
        "redirect",
        pathname === "/admin" || pathname === "/admin/"
          ? "/admin/board"
          : pathname,
      );
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next({ request: { headers: setPathHeader(request) } });
  }

  if (isProtected && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/plan", request.url));
  }

  return NextResponse.next({ request: { headers: setPathHeader(request) } });
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/plan/:path*",
    "/library/:path*",
    "/workspace/:path*",
    "/plans/:path*",
    "/admin",
    "/admin/:path*",
    "/mypage",
    "/mypage/:path*",
    "/settings",
    "/settings/:path*",
    "/login",
    "/register",
  ],
};
