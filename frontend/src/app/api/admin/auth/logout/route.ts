import { NextResponse } from 'next/server';
import { ADMIN_ACCESS_COOKIE, ADMIN_REFRESH_COOKIE } from '@/lib/admin-cookie';
import {
  getAdminCookieOptions,
} from '@/lib/server/admin-session';
import { SERVER_API_BASE_URL } from '@/lib/server/api-url';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(ADMIN_REFRESH_COOKIE)?.value;

  if (refreshToken) {
    await fetch(`${SERVER_API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: 'no-store',
    }).catch(() => undefined);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_ACCESS_COOKIE, '', getAdminCookieOptions(0));
  response.cookies.set(ADMIN_REFRESH_COOKIE, '', getAdminCookieOptions(0));
  return response;
}
