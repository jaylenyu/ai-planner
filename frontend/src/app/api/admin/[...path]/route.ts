import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_ACCESS_COOKIE, ADMIN_REFRESH_COOKIE } from "@/lib/admin-cookie";
import {
  ADMIN_ACCESS_COOKIE_MAX_AGE,
  ADMIN_REFRESH_COOKIE_MAX_AGE,
  getAdminCookieOptions,
  verifyAdminAccessToken,
} from "@/lib/server/admin-session";
import { BACKEND_INTERNAL_URL } from "@/lib/server/api-url";

export const runtime = "nodejs";

async function refreshAdminSession(refreshToken: string | undefined) {
  if (!refreshToken) {
    return null;
  }

  const response = await fetch(`${BACKEND_INTERNAL_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token: string;
  };
  const payload = verifyAdminAccessToken(data.access_token);
  if (!payload) {
    return null;
  }

  return data;
}

async function forwardAdminRequest(
  request: NextRequest,
  path: string[],
  accessToken: string,
  body: string | undefined,
) {
  const target = new URL(`${BACKEND_INTERNAL_URL}/admin/${path.join("/")}`);
  target.search = request.nextUrl.search;

  return fetch(target, {
    method: request.method,
    headers: {
      "Content-Type": request.headers.get("content-type") ?? "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    ...(body !== undefined ? { body } : {}),
    cache: "no-store",
  });
}

async function handle(request: NextRequest, params: { path: string[] }) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ADMIN_ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(ADMIN_REFRESH_COOKIE)?.value;

  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.text();

  let refreshedTokens: { access_token: string; refresh_token: string } | null =
    null;
  let tokenForRequest = accessToken;

  if (!tokenForRequest) {
    refreshedTokens = await refreshAdminSession(refreshToken);
    tokenForRequest = refreshedTokens?.access_token;
  }

  if (!tokenForRequest) {
    const unauthorized = NextResponse.json(
      { message: "관리자 인증이 필요합니다." },
      { status: 401 },
    );
    unauthorized.cookies.set(ADMIN_ACCESS_COOKIE, "", getAdminCookieOptions(0));
    unauthorized.cookies.set(
      ADMIN_REFRESH_COOKIE,
      "",
      getAdminCookieOptions(0),
    );
    return unauthorized;
  }

  let response = await forwardAdminRequest(
    request,
    params.path,
    tokenForRequest,
    body,
  );

  if (response.status === 401) {
    refreshedTokens = await refreshAdminSession(refreshToken);
    if (!refreshedTokens) {
      const unauthorized = NextResponse.json(
        { message: "관리자 인증이 만료되었습니다." },
        { status: 401 },
      );
      unauthorized.cookies.set(
        ADMIN_ACCESS_COOKIE,
        "",
        getAdminCookieOptions(0),
      );
      unauthorized.cookies.set(
        ADMIN_REFRESH_COOKIE,
        "",
        getAdminCookieOptions(0),
      );
      return unauthorized;
    }

    response = await forwardAdminRequest(
      request,
      params.path,
      refreshedTokens.access_token,
      body,
    );
  }

  const text = await response.text();
  const nextResponse = new NextResponse(text, {
    status: response.status,
    headers: {
      "Content-Type":
        response.headers.get("content-type") ?? "application/json",
    },
  });

  if (refreshedTokens) {
    nextResponse.cookies.set(
      ADMIN_ACCESS_COOKIE,
      refreshedTokens.access_token,
      getAdminCookieOptions(ADMIN_ACCESS_COOKIE_MAX_AGE),
    );
    nextResponse.cookies.set(
      ADMIN_REFRESH_COOKIE,
      refreshedTokens.refresh_token,
      getAdminCookieOptions(ADMIN_REFRESH_COOKIE_MAX_AGE),
    );
  }

  return nextResponse;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return handle(request, await params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return handle(request, await params);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return handle(request, await params);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return handle(request, await params);
}
