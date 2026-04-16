import type { Metadata } from 'next';
import { TermsContent } from '@/components/legal/TermsContent';

export const metadata: Metadata = {
  title: '이용약관 | DatePlanner',
  description: 'DatePlanner 서비스 이용약관',
  alternates: { canonical: '/terms' },
  openGraph: {
    title: '이용약관 | DatePlanner',
    description: 'DatePlanner 서비스 이용약관',
    url: '/terms',
    type: 'article',
  },
  twitter: {
    card: 'summary',
    title: '이용약관 | DatePlanner',
    description: 'DatePlanner 서비스 이용약관',
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-stone-50 py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <TermsContent />
      </div>
    </div>
  );
}
