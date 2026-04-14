import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '비밀번호 재설정 링크 요청 | DatePlanner',
  alternates: { canonical: '/forgot-password' },
};

export default function ForgotLayout({ children }: { children: React.ReactNode }) {
  return children;
}

