import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '비밀번호 재설정 | DatePlanner',
  alternates: { canonical: '/reset-password' },
};

export default function ResetLayout({ children }: { children: React.ReactNode }) {
  return children;
}

