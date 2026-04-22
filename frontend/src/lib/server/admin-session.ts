import { verify } from 'jsonwebtoken';
export const ADMIN_ACCESS_COOKIE_MAX_AGE = 60 * 15;
export const ADMIN_REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export type VerifiedAdminPayload = {
  sub: string;
  email: string;
  role: 'ADMIN';
  adminReadOnly?: boolean;
  exp?: number;
};

export function getAdminCookieOptions(maxAge: number) {
  return {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge,
  };
}

export function verifyAdminAccessToken(
  token: string | undefined,
): VerifiedAdminPayload | null {
  if (!token) return null;

  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    return null;
  }

  try {
    const payload = verify(token, secret) as Partial<VerifiedAdminPayload>;
    if (payload.role !== 'ADMIN') {
      return null;
    }
    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
      return null;
    }
    return {
      sub: payload.sub,
      email: payload.email,
      role: 'ADMIN',
      adminReadOnly: payload.adminReadOnly === true,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}
