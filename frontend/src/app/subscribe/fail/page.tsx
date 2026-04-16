"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppCard } from "@/components/ui/app-card";
import { PrimaryButton } from "@/components/ui/primary-button";

function SubscribeFailContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const message = searchParams.get("message");

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-10">
      <div className="mx-auto max-w-xl">
        <AppCard padding="lg" className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-red-600">결제 실패</p>
            <h1 className="mt-1 text-2xl font-bold text-stone-900">
              결제가 완료되지 않았습니다
            </h1>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
            <p>{message ?? "결제 과정이 중단되었거나 실패했습니다."}</p>
            {code && <p className="mt-1 text-red-600">code: {code}</p>}
          </div>
          <div className="flex gap-2">
            <PrimaryButton asChild variant="brand" size="sm">
              <Link href="/subscribe">다시 시도</Link>
            </PrimaryButton>
            <PrimaryButton asChild variant="outline" size="sm">
              <Link href="/plan">일정으로 돌아가기</Link>
            </PrimaryButton>
          </div>
        </AppCard>
      </div>
    </main>
  );
}

export default function SubscribeFailPage() {
  return (
    <Suspense fallback={null}>
      <SubscribeFailContent />
    </Suspense>
  );
}
