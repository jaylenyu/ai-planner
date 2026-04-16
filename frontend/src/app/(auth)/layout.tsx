import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: {
    default: '계정 | DatePlanner',
    template: '%s | DatePlanner',
  },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}

