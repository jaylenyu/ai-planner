import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PATHS = ['/dashboard', '/plan', '/library', '/workspace', '/plans'];
const AUTH_PATHS = ['/login', '/register'];

export function proxy(request: NextRequest) {
  const token = request.cookies.get('ai_planner_token')?.value;
  const { pathname } = request.nextUrl;

  const isWorkspaceJoin = pathname.startsWith('/workspace/join/');
  const isProtected =
    !isWorkspaceJoin &&
    PROTECTED_PATHS.some((path) => pathname.startsWith(path));
  const isAuthPage = AUTH_PATHS.some((path) => pathname.startsWith(path));

  if (isProtected && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/plan', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/plan/:path*',
    '/library/:path*',
    '/workspace/:path*',
    '/plans/:path*',
    '/login',
    '/register',
  ],
};
