import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_ACCESS_COOKIE } from '@/lib/admin-cookie';
import {
  verifyAdminAccessToken,
} from '@/lib/server/admin-session';

export const runtime = 'nodejs';

export async function GET() {
  const cookieStore = await cookies();
  const payload = verifyAdminAccessToken(
    cookieStore.get(ADMIN_ACCESS_COOKIE)?.value,
  );

  if (!payload) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      adminReadOnly: payload.adminReadOnly === true,
    },
  });
}
