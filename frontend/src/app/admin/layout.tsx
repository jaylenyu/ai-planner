export const runtime = 'nodejs';

import { cookies } from 'next/headers';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AdminShell } from './_components/AdminShell';
import { ADMIN_ACCESS_COOKIE, ADMIN_REFRESH_COOKIE } from '@/lib/admin-cookie';
import {
  verifyAdminAccessToken,
} from '@/lib/server/admin-session';

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const pathname = headerStore.get('x-pathname') ?? '/admin';
  const payload = verifyAdminAccessToken(
    cookieStore.get(ADMIN_ACCESS_COOKIE)?.value,
  );
  const hasRefresh = !!cookieStore.get(ADMIN_REFRESH_COOKIE)?.value;
  const isAdminToken = !!payload;
  const adminReadOnly = payload?.adminReadOnly === true;

  if (pathname === '/admin' || pathname === '/admin/') {
    if (isAdminToken) {
      redirect('/admin/board');
    }
    redirect('/admin/login?redirect=/admin/board');
  }

  if (pathname.startsWith('/admin/login')) {
    if (isAdminToken) {
      redirect('/admin/board');
    }
    return <>{children}</>;
  }

  if (!isAdminToken && !hasRefresh) {
    redirect(`/admin/login?redirect=${encodeURIComponent(pathname)}`);
  }

  return (
    <AdminShell adminEmail={payload?.email ?? 'admin'} adminReadOnly={adminReadOnly}>
      {children}
    </AdminShell>
  );
}
