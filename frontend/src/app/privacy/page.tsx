import type { Metadata } from 'next';
import { PrivacyContent } from '@/components/legal/PrivacyContent';

export const metadata: Metadata = {
  title: '개인정보 처리방침 | DatePlanner',
  description: 'DatePlanner 개인정보 처리방침',
  alternates: { canonical: '/privacy' },
  openGraph: {
    title: '개인정보 처리방침 | DatePlanner',
    description: 'DatePlanner 개인정보 처리방침',
    url: '/privacy',
    type: 'article',
  },
  twitter: {
    card: 'summary',
    title: '개인정보 처리방침 | DatePlanner',
    description: 'DatePlanner 개인정보 처리방침',
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-stone-50 py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <PrivacyContent />
      </div>
    </div>
  );
}
