"use client";

import { useEffect, useRef, useState } from "react";
import { PrimaryButton } from "../ui/primary-button";

interface TossPaymentInstance {
  requestPayment: (options: {
    method: "CARD" | "TRANSFER" | "MOBILE_PHONE";
    amount: { value: number; currency: "KRW" };
    orderId: string;
    orderName: string;
    customerName?: string;
    customerEmail?: string;
    successUrl: string;
    failUrl: string;
    card?: {
      flowMode?: "DEFAULT" | "DIRECT";
      easyPay?: "TOSSPAY" | "KAKAOPAY";
    };
  }) => Promise<void>;
}

type PaymentMethod =
  | { method: "CARD"; card?: { flowMode?: "DEFAULT" | "DIRECT"; easyPay?: "TOSSPAY" | "KAKAOPAY" } }
  | { method: "TRANSFER" }
  | { method: "MOBILE_PHONE" }
  | { method: "CARD"; card: { flowMode: "DIRECT"; easyPay: "TOSSPAY" } }
  | { method: "CARD"; card: { flowMode: "DIRECT"; easyPay: "KAKAOPAY" } };

type MethodKey = "CARD" | "TRANSFER" | "MOBILE_PHONE" | "TOSSPAY" | "KAKAOPAY";

const PAYMENT_METHODS: {
  key: MethodKey;
  label: string;
  icon: string;
  config: PaymentMethod;
  requiresLive?: boolean;
}[] = [
  { key: "CARD", label: "카드", icon: "💳", config: { method: "CARD" } },
  {
    key: "TOSSPAY",
    label: "토스페이",
    icon: "🔵",
    config: { method: "CARD", card: { flowMode: "DIRECT", easyPay: "TOSSPAY" } },
    requiresLive: true,
  },
  {
    key: "KAKAOPAY",
    label: "카카오페이",
    icon: "🟡",
    config: { method: "CARD", card: { flowMode: "DIRECT", easyPay: "KAKAOPAY" } },
    requiresLive: true,
  },
  {
    key: "TRANSFER",
    label: "계좌이체",
    icon: "🏦",
    config: { method: "TRANSFER" },
  },
  {
    key: "MOBILE_PHONE",
    label: "휴대폰",
    icon: "📱",
    config: { method: "MOBILE_PHONE" },
  },
];

const SCRIPT_ID = "tosspayments-sdk";

function loadTossScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    const tossFactory = (
      window as Window & {
        TossPayments?: unknown;
      }
    ).TossPayments as
      | undefined
      | ((clientKey: string) => {
          payment: (options: { customerKey: string }) => TossPaymentInstance;
        });
    if (tossFactory) return resolve();

    const existing = document.getElementById(
      SCRIPT_ID,
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Toss SDK 로드 실패")),
        { once: true },
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

type Props = {
  clientKey: string;
  customerKey: string;
  amount: number;
  orderId: string;
  orderName: string;
};

export function TossPaymentWidget({
  clientKey,
  customerKey,
  amount,
  orderId,
  orderName,
}: Props) {
  const isTestClientKey = clientKey.startsWith("test_");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [method, setMethod] = useState<MethodKey>("CARD");
  const paymentRef = useRef<TossPaymentInstance | null>(null);

  useEffect(() => {
    let mounted = true;
    loadTossScript()
      .then(() => {
        const tossFactory = (
          window as Window & {
            TossPayments?: unknown;
          }
        ).TossPayments as
          | undefined
          | ((clientKey: string) => {
              payment: (options: {
                customerKey: string;
              }) => TossPaymentInstance;
            });
        if (!mounted || !tossFactory) return;
        const tossPayments = tossFactory(clientKey);
        paymentRef.current = tossPayments.payment({ customerKey });
        if (mounted) setReady(true);
      })
      .catch((err: unknown) => {
        if (mounted)
          setError(err instanceof Error ? err.message : "SDK 로드 실패");
      });
    return () => {
      mounted = false;
    };
  }, [clientKey, customerKey]);

  const handlePay = async () => {
    if (!paymentRef.current) return;
    const selected = PAYMENT_METHODS.find((m) => m.key === method);
    if (!selected) return;
    if (selected.requiresLive && isTestClientKey) {
      setError("테스트 환경에서는 토스페이/카카오페이 직접 결제를 지원하지 않습니다. 카드 결제로 테스트해주세요.");
      return;
    }
    try {
      setPaying(true);
      setError(null);
      await paymentRef.current.requestPayment({
        ...selected.config,
        amount: { value: amount, currency: "KRW" },
        orderId,
        orderName,
        successUrl: `${window.location.origin}/subscribe/success`,
        failUrl: `${window.location.origin}/subscribe/fail`,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "결제를 시작하지 못했습니다.",
      );
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 결제 수단 선택 */}
      <div className="grid grid-cols-4 gap-2">
        {PAYMENT_METHODS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => {
              if (m.requiresLive && isTestClientKey) {
                setError("테스트 환경에서는 토스페이/카카오페이 직접 결제를 지원하지 않습니다. 카드 결제로 테스트해주세요.");
                return;
              }
              setMethod(m.key);
              setError(null);
            }}
            disabled={m.requiresLive && isTestClientKey}
            className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-xs font-medium transition-colors ${
              method === m.key
                ? "border-orange-300 bg-orange-50 text-orange-700"
                : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
            } ${
              m.requiresLive && isTestClientKey
                ? "cursor-not-allowed opacity-45 hover:border-stone-200"
                : ""
            }`}
          >
            <span className="text-xl">{m.icon}</span>
            {m.label}
          </button>
        ))}
      </div>

      {/* 금액 */}
      <div className="flex items-center justify-between rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm">
        <span className="text-stone-600">월 구독료</span>
        <span className="font-bold text-stone-900">
          {amount.toLocaleString()}원
        </span>
      </div>

      <div className="relative pt-2 pb-6">
        {error && (
          <div className="pointer-events-none absolute inset-x-0 -top-3 flex items-center justify-center text-center text-sm text-red-600">
            <span>{error}</span>
          </div>
        )}

        <PrimaryButton
          type="button"
          variant="brand"
          className="w-full"
          disabled={!ready || paying}
          onClick={() => void handlePay()}
        >
          {paying
            ? "결제 중..."
            : !ready
              ? "준비 중..."
              : `${PAYMENT_METHODS.find((m) => m.key === method)?.label}로 결제하기`}
        </PrimaryButton>
      </div>
    </div>
  );
}
