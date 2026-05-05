'use client';

import Link from 'next/link';
import { useState } from 'react';
import { LegalPolicyDialog } from '@/components/legal/LegalPolicyDialog';

type PolicyType = 'terms' | 'privacy' | null;

export function Footer() {
  const [policyType, setPolicyType] = useState<PolicyType>(null);

  return (
    <>
      <footer className="mt-auto border-t border-stone-800/80 bg-[#1f1916] text-stone-300">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.15fr_0.85fr_0.9fr] lg:gap-12">
          <div className="space-y-3">
            <p className="text-lg font-bold tracking-tight text-stone-50">
              DatePlanner
            </p>
            <p className="text-sm font-medium text-stone-200">
              AI 일정 플래너
            </p>
            <p className="max-w-md text-sm leading-6 text-stone-400">
              자연어 한마디로 데이트 코스와 당일 여행 일정을 더 빠르고
              자연스럽게 만드는 플래너입니다.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">
              Policy
            </p>
            <div className="flex flex-col items-start gap-2 text-sm">
              <button
                type="button"
                onClick={() => setPolicyType('terms')}
                className="text-stone-300 transition-colors hover:text-white"
              >
                이용약관
              </button>
              <button
                type="button"
                onClick={() => setPolicyType('privacy')}
                className="text-stone-300 transition-colors hover:text-white"
              >
                개인정보 처리방침
              </button>
              <Link
                href="/subscribe"
                className="text-stone-300 transition-colors hover:text-white"
              >
                구독 안내
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">
              Support
            </p>
            <div className="space-y-2 text-sm leading-6 text-stone-400">
              <p>
                문의:{' '}
                <a
                  href="mailto:jaylenyu96@gmail.com"
                  className="text-stone-200 transition-colors hover:text-white"
                >
                  jaylenyu96@gmail.com
                </a>
              </p>
              <p>개인정보 보호책임자: 유정인</p>
              <p>직책: CTO / 기술 총괄</p>
            </div>
          </div>
        </div>

        <div className="border-t border-stone-800 px-4 py-4 text-center text-xs text-stone-500 sm:px-6">
          © 2026 DatePlanner. All rights reserved.
        </div>
      </footer>

      <LegalPolicyDialog
        open={policyType !== null}
        type={policyType}
        onOpenChange={(open) => {
          if (!open) {
            setPolicyType(null);
          }
        }}
      />
    </>
  );
}
