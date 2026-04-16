"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import confetti from "canvas-confetti";
import { AppCard } from "@/components/ui/app-card";
import { PrimaryButton } from "@/components/ui/primary-button";
import { billingApi } from "@/lib/api";
import type { SubscriptionStatusResponse } from "@/lib/types";

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<SubscriptionStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const confettiFiredRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    async function confirm() {
      try {
        const paymentKey = searchParams.get("paymentKey");
        const orderId = searchParams.get("orderId");
        const amount = searchParams.get("amount");

        if (!paymentKey || !orderId || !amount) {
          throw new Error("결제 확인 정보가 부족합니다.");
        }

        const response = await billingApi.confirm({
          paymentKey,
          orderId,
          amount: Number(amount),
        });

        if (!mounted) return;
        setStatus(response);
      } catch (err) {
        if (!mounted) return;
        setError(
          err instanceof Error ? err.message : "결제 확인에 실패했습니다.",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void confirm();

    return () => {
      mounted = false;
    };
  }, [searchParams]);

  useEffect(() => {
    if (!status || confettiFiredRef.current) return;
    confettiFiredRef.current = true;
    void confetti({
      particleCount: 140,
      spread: 82,
      startVelocity: 36,
      origin: { y: 0.65 },
      colors: ["#f97316", "#fb7185", "#f59e0b", "#ffffff"],
    });
  }, [status]);

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-10">
      <div className="mx-auto max-w-xl">
        <AppCard padding="lg" className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-orange-600">결제 처리</p>
            <h1 className="mt-1 text-2xl font-bold text-stone-900">
              구독을 확인하는 중입니다
            </h1>
          </div>
          {loading && <p className="text-sm text-stone-500">승인 확인 중...</p>}
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {status && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
              <p className="font-semibold">결제가 완료되었습니다.</p>
              <p className="mt-1">현재 상태: {status.subscription.status}</p>
              <p className="mt-1">
                종료 예정일:{" "}
                {status.subscription.currentPeriodEnd
                  ? new Date(
                      status.subscription.currentPeriodEnd,
                    ).toLocaleString("ko-KR")
                  : "-"}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <PrimaryButton asChild variant="brand" size="sm">
              <Link href="/plan">일정으로 돌아가기</Link>
            </PrimaryButton>
            <PrimaryButton
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.replace("/subscribe")}
            >
              다시 보기
            </PrimaryButton>
          </div>
        </AppCard>
      </div>
    </main>
  );
}

export default function SubscribeSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessContent />
    </Suspense>
  );
}
