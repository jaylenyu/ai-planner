export function getAdminAuthUser():
  | {
      userId?: string;
      email?: string;
      role?: 'USER' | 'ADMIN';
      adminReadOnly?: boolean;
    }
  | null {
  return null;
}
