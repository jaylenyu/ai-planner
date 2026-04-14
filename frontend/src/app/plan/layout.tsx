import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI 일정 생성 | DatePlanner',
  description: '자연어 한 문장으로 최적의 데이트·여행 일정을 생성하고 동선을 자동 계산하세요.',
  alternates: { canonical: '/plan' },
  openGraph: {
    title: 'AI 일정 생성 | DatePlanner',
    description: '자연어 한 문장으로 최적의 데이트·여행 일정을 생성하고 동선을 자동 계산하세요.',
    url: '/plan',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI 일정 생성 | DatePlanner',
    description: '자연어 한 문장으로 최적의 데이트·여행 일정을 생성하고 동선을 자동 계산하세요.',
  },
};

export default function PlanLayout({ children }: { children: React.ReactNode }) {
  return children;
}

