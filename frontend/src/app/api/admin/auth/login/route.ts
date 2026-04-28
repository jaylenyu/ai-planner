import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_ACCESS_COOKIE, ADMIN_REFRESH_COOKIE } from '@/lib/admin-cookie';
import {
  ADMIN_ACCESS_COOKIE_MAX_AGE,
  ADMIN_REFRESH_COOKIE_MAX_AGE,
  getAdminCookieOptions,
  verifyAdminAccessToken,
} from '@/lib/server/admin-session';
import { BACKEND_INTERNAL_URL } from '@/lib/server/api-url';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { email?: string; password?: string };
  const response = await fetch(`${BACKEND_INTERNAL_URL}/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const text = await response.text();
  if (!response.ok) {
    return new NextResponse(text, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') ?? 'application/json',
      },
    });
  }

  const data = JSON.parse(text) as {
    access_token: string;
    refresh_token: string;
  };
  const payload = verifyAdminAccessToken(data.access_token);
  if (!payload) {
    return NextResponse.json(
      { message: '유효한 관리자 토큰을 발급하지 못했습니다.' },
      { status: 401 },
    );
  }

  const nextResponse = NextResponse.json({
    ok: true,
    user: {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      adminReadOnly: payload.adminReadOnly === true,
    },
  });
  nextResponse.cookies.set(
    ADMIN_ACCESS_COOKIE,
    data.access_token,
    getAdminCookieOptions(ADMIN_ACCESS_COOKIE_MAX_AGE),
  );
  nextResponse.cookies.set(
    ADMIN_REFRESH_COOKIE,
    data.refresh_token,
    getAdminCookieOptions(ADMIN_REFRESH_COOKIE_MAX_AGE),
  );
  return nextResponse;
}
