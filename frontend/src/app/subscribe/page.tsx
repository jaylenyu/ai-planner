"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppCard } from "@/components/ui/app-card";
import { PrimaryButton } from "@/components/ui/primary-button";
import { TossPaymentWidget } from "@/components/payment/TossPaymentWidget";
import { billingApi } from "@/lib/api";
import type {
  PaymentPrepareResponse,
  SubscriptionStatusResponse,
} from "@/lib/types";
import { getToken } from "@/lib/auth";

export default function SubscribePage() {
  const router = useRouter();
  const [status, setStatus] = useState<SubscriptionStatusResponse | null>(null);
  const [prepare, setPrepare] = useState<PaymentPrepareResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login?redirect=/subscribe");
    }
  }, [router]);

  useEffect(() => {
    if (!getToken()) {
      return;
    }

    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        const current = await billingApi.status();
        if (!mounted) return;
        setStatus(current);
      } catch (err) {
        if (!mounted) return;
        setError(
          err instanceof Error
            ? err.message
            : "구독 정보를 불러오지 못했습니다.",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "";
  const currentState = useMemo(
    () => status?.subscription.status ?? "inactive",
    [status],
  );

  const preparePayment = async () => {
    try {
      setPreparing(true);
      setError(null);
      const next = await billingApi.prepare();
      setPrepare(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "결제 준비에 실패했습니다.");
    } finally {
      setPreparing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/plan"
            className="text-sm font-semibold text-stone-700 hover:text-stone-900"
          >
            ← 일정으로 돌아가기
          </Link>
          <p className="text-sm text-stone-500">커플 공유 플랜</p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <AppCard padding="lg" className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-orange-600">유료 플랜</p>
              <h1 className="text-3xl font-bold text-stone-900">
                커플 공유 일정
              </h1>
              <p className="text-sm leading-6 text-stone-600">
                한 명이 결제하면 상대를 초대해 일정 공유, 메모, 수정, 삭제
                기능을 함께 쓸 수 있습니다.
              </p>
            </div>

            {loading && (
              <p className="text-sm text-stone-500">
                구독 상태를 확인하는 중...
              </p>
            )}
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {status && (
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm text-stone-700">
                <p className="font-semibold text-stone-900">
                  현재 상태: {currentState}
                </p>
                <p className="mt-1">
                  {status.hasAccess
                    ? "유료 기능을 사용할 수 있습니다."
                    : "아직 유료 기능이 비활성 상태입니다."}
                </p>
                <p className="mt-1 text-stone-500">
                  월 구독료: {status.monthlyAmount.toLocaleString()}원
                </p>
              </div>
            )}

            {!clientKey && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                NEXT_PUBLIC_TOSS_CLIENT_KEY가 설정되어 있지 않습니다.
              </div>
            )}

            {!prepare && clientKey && (
              <PrimaryButton
                type="button"
                variant="brand"
                size="sm"
                loading={preparing}
                onClick={() => void preparePayment()}
              >
                결제창 불러오기
              </PrimaryButton>
            )}

            {prepare && clientKey && (
              <TossPaymentWidget
                clientKey={clientKey}
                customerKey={prepare.customerKey}
                amount={prepare.payment.amount}
                orderId={prepare.orderId}
                orderName={prepare.orderName}
              />
            )}

            <div className="flex gap-2">
              <PrimaryButton asChild variant="outline" size="sm">
                <Link href="/library">보관함 보기</Link>
              </PrimaryButton>
              <PrimaryButton asChild variant="outline" size="sm">
                <Link href="/plan">일정 만들기</Link>
              </PrimaryButton>
            </div>
          </AppCard>

          <AppCard padding="lg" className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-stone-900">포함 기능</p>
              <ul className="mt-3 space-y-2 text-sm text-stone-600">
                <li>공유 일정 열람과 편집</li>
                <li>일정에 메모 추가</li>
                <li>항목 수정, 추가, 삭제</li>
                <li>무료 기능인 보관함, 카테고리, 지도 검색 유지</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-4 text-sm text-orange-800">
              결제 성공 후에는 `/subscribe/success`에서 승인 확인을 거쳐 바로
              활성화됩니다.
            </div>
          </AppCard>
        </div>
      </main>
    </div>
  );
}
