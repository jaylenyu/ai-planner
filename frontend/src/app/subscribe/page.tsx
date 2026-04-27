"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppCard } from "@/components/ui/app-card";
import { PrimaryButton } from "@/components/ui/primary-button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TossPaymentWidget } from "@/components/payment/TossPaymentWidget";
import { billingApi } from "@/lib/api";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import type {
  PaymentPrepareResponse,
} from "@/lib/types";
import { getToken } from "@/lib/auth";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

function SubscribePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, loading, error: statusError, refetch } = useSubscriptionStatus();
  const [prepare, setPrepare] = useState<PaymentPrepareResponse | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [widgetError, setWidgetError] = useState<string | null>(null);
  const [autoOpenAfterFail, setAutoOpenAfterFail] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login?redirect=/subscribe");
    }
  }, [router]);

  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "";
  const redirectedPaymentError = useMemo(() => {
    const hasFailFlag =
      searchParams.get("paymentError") === "1" ||
      Boolean(searchParams.get("message")) ||
      Boolean(searchParams.get("code"));

    if (!hasFailFlag) return null;

    const message =
      searchParams.get("message") ??
      "결제가 완료되지 않았습니다. 다른 결제 수단을 선택해 다시 시도해주세요.";

    return message;
  }, [searchParams]);

  const currentState = useMemo(
    () => status?.subscription.status ?? "inactive",
    [status],
  );

  const handleCancelSubscription = async () => {
    setCancelLoading(true);
    try {
      await billingApi.cancel();
      await refetch();
      setCancelOpen(false);
    } finally {
      setCancelLoading(false);
    }
  };

  const preparePayment = useCallback(async () => {
    try {
      setPreparing(true);
      setPageError(null);
      const next = await billingApi.prepare();
      setPrepare(next);
    } catch (err) {
      setPageError(
        err instanceof Error ? err.message : "결제 준비에 실패했습니다.",
      );
    } finally {
      setPreparing(false);
    }
  }, []);

  useEffect(() => {
    if (!redirectedPaymentError) return;

    setWidgetError(redirectedPaymentError);
    setAutoOpenAfterFail(true);
    router.replace("/subscribe", { scroll: false });
  }, [redirectedPaymentError, router]);

  useEffect(() => {
    if (!autoOpenAfterFail || prepare || preparing || !clientKey) return;

    void preparePayment();
    setAutoOpenAfterFail(false);
  }, [autoOpenAfterFail, clientKey, prepare, preparePayment, preparing]);

  return (
    <div className="bg-[var(--background)]">
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
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
            {statusError && !pageError && !widgetError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {statusError}
              </div>
            )}
            {pageError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {pageError}
              </div>
            )}

            {status?.hasAccess ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-800">
                  <p className="font-semibold text-green-900">구독 중</p>
                  {status.subscription.currentPeriodEnd && (
                    <p className="mt-1">
                      다음 결제일: {formatDate(status.subscription.currentPeriodEnd)}
                    </p>
                  )}
                  <p className="mt-1 text-green-700">
                    월 {status.monthlyAmount.toLocaleString()}원
                  </p>
                </div>

                {currentState === "grace" && status.subscription.graceEndsAt && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    결제에 실패하여 유예 기간 중입니다.{" "}
                    {formatDate(status.subscription.graceEndsAt)}까지 서비스를 이용할 수 있습니다.
                  </div>
                )}

                <PrimaryButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCancelOpen(true)}
                >
                  구독 취소
                </PrimaryButton>
              </div>
            ) : (
              <>
                {status && (
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm text-stone-700">
                    <p className="mt-1">
                      아직 유료 기능이 비활성 상태입니다.
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
                    externalError={widgetError}
                    onExternalErrorClear={() => setWidgetError(null)}
                  />
                )}
              </>
            )}
          </AppCard>

          <AppCard padding="lg" className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-stone-900">
                {status?.hasAccess ? "이용 중인 기능" : "포함 기능"}
              </p>
              <ul className="mt-3 space-y-2 text-sm text-stone-600">
                <li>공유 일정 열람과 편집</li>
                <li>일정에 메모 추가</li>
                <li>항목 수정, 추가, 삭제</li>
                <li>무료 기능인 보관함, 카테고리, 지도 검색 유지</li>
              </ul>
            </div>
          </AppCard>
        </div>
      </main>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="구독을 취소할까요?"
        description="취소 후에도 현재 결제 기간이 끝날 때까지 서비스를 이용할 수 있습니다."
        confirmLabel="구독 취소"
        cancelLabel="돌아가기"
        destructive
        loading={cancelLoading}
        onConfirm={() => void handleCancelSubscription()}
      />
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense fallback={null}>
      <SubscribePageContent />
    </Suspense>
  );
}
