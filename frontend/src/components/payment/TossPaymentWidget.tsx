"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PrimaryButton } from "../ui/primary-button";

interface TossWidgetsInstance {
  setAmount: (amount: {
    currency: "KRW";
    value: number;
  }) => Promise<void> | void;
  renderPaymentMethods: (options: {
    selector: string;
    variantKey?: string;
  }) => Promise<void> | void;
  renderAgreement: (options: {
    selector: string;
    variantKey?: string;
  }) => Promise<void> | void;
  requestPayment: (options: {
    orderId: string;
    orderName: string;
    successUrl: string;
    failUrl: string;
  }) => Promise<void> | void;
}

type Props = {
  clientKey: string;
  customerKey: string;
  amount: number;
  orderId: string;
  orderName: string;
};

const SCRIPT_ID = "tosspayments-sdk";

function loadTossScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    if (window.TossPayments) return resolve();

    const existing = document.getElementById(
      SCRIPT_ID,
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Toss SDK 로드 실패")),
        {
          once: true,
        },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://js.tosspayments.com/v2/standard";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Toss SDK 로드 실패"));
    document.body.appendChild(script);
  });
}

export function TossPaymentWidget({
  clientKey,
  customerKey,
  amount,
  orderId,
  orderName,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const widgetsRef = useRef<TossWidgetsInstance | null>(null);

  const successUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/subscribe/success`;
  }, []);

  const failUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/subscribe/fail`;
  }, []);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        setLoading(true);
        setError(null);
        await loadTossScript();
        if (!mounted) return;
        const tossPayments = window.TossPayments?.(clientKey);
        if (!tossPayments) {
          throw new Error("Toss 결제창을 초기화할 수 없습니다.");
        }
        const widgets = tossPayments.widgets({ customerKey });
        widgetsRef.current = widgets;
        await widgets.setAmount({ currency: "KRW", value: amount });
        await widgets.renderPaymentMethods({
          selector: "#toss-payment-methods",
          variantKey: "DEFAULT",
        });
        await widgets.renderAgreement({
          selector: "#toss-payment-agreement",
          variantKey: "AGREEMENT",
        });
        if (!mounted) return;
        setReady(true);
      } catch (err) {
        if (!mounted) return;
        setError(
          err instanceof Error ? err.message : "결제창을 불러오지 못했습니다.",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, [amount, clientKey, customerKey]);

  const startPayment = async () => {
    try {
      setError(null);
      const widgets = widgetsRef.current;
      if (!widgets) {
        throw new Error("결제 위젯이 아직 준비되지 않았습니다.");
      }

      await widgets.requestPayment({
        orderId,
        orderName,
        successUrl,
        failUrl,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "결제를 시작하지 못했습니다.",
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-stone-900">결제 수단</p>
            <p className="text-xs text-stone-500">
              카드, 토스페이, 카카오페이, 네이버페이를 지원합니다.
            </p>
          </div>
          <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-600">
            {amount.toLocaleString()}원 / 월
          </span>
        </div>
        <div id="toss-payment-methods" className="min-h-[220px]" />
        <div id="toss-payment-agreement" className="mt-4" />
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <PrimaryButton
        type="button"
        variant="brand"
        className="w-full"
        disabled={!ready || loading}
        onClick={() => void startPayment()}
      >
        {loading ? "결제창 준비 중..." : "결제하기"}
      </PrimaryButton>
    </div>
  );
}
