'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { AdminSidebar } from './AdminSidebar';
import { AdminSessionProvider } from './AdminSessionContext';
import { AdminTopBar } from './AdminTopBar';

export function AdminShell({
  adminEmail,
  adminReadOnly,
  children,
}: {
  adminEmail: string;
  adminReadOnly: boolean;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <AdminSessionProvider value={{ adminEmail, adminReadOnly }}>
      <div className="min-h-screen bg-[var(--background)]">
        <AdminTopBar
          adminEmail={adminEmail}
          adminReadOnly={adminReadOnly}
          onMenuClick={() => setMobileOpen(true)}
        />

        <div className="mx-auto flex w-full max-w-[1600px] gap-6 px-4 py-4 lg:min-h-[calc(100vh-56px)] lg:items-start lg:px-6 lg:py-6">
          <aside className="hidden lg:block lg:w-[220px] lg:shrink-0">
            <div className="sticky top-[72px] overflow-hidden rounded-xl border border-stone-100 bg-white shadow-sm">
              <AdminSidebar />
            </div>
          </aside>

          <main className="min-w-0 flex-1 py-2 lg:py-4">
            {children}
          </main>
        </div>

        <Dialog
          open={mobileOpen}
          onOpenChange={setMobileOpen}
          title="관리 메뉴"
          description="읽기 전용 모바일 탐색"
          containerClassName="items-start justify-start px-0 py-0"
          panelClassName="max-w-none w-full h-full rounded-none"
          bodyClassName="px-0 py-0"
        >
          <AdminSidebar onNavigate={() => setMobileOpen(false)} />
        </Dialog>
      </div>
    </AdminSessionProvider>
  );
}
