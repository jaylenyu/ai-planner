import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '회원가입 | DatePlanner',
  alternates: { canonical: '/register' },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}

