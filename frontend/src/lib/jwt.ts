export type JwtPayload = {
  sub?: string;
  email?: string;
  role?: 'USER' | 'ADMIN';
  adminReadOnly?: boolean;
  exp?: number;
};

function decodeBase64Url(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(padded, 'base64').toString('utf8');
  }

  return atob(padded);
}

export function decodeJwtPayload<T extends JwtPayload = JwtPayload>(
  token: string,
): T | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    return JSON.parse(decodeBase64Url(payload)) as T;
  } catch {
    return null;
  }
}

export function isJwtExpired(payload: JwtPayload | null | undefined): boolean {
  if (!payload?.exp) return false;
  return payload.exp * 1000 <= Date.now();
}
