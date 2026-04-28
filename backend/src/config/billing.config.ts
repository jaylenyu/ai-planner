/**
 * 구독 요금 기본값 (원).
 * 환경변수 SUBSCRIPTION_MONTHLY_AMOUNT로 언제든지 덮어쓸 수 있습니다.
 */
export const DEFAULT_MONTHLY_AMOUNT = 3900;

export const PLAN_CODE = 'couple_monthly';

export function resolveMonthlyAmount(): number {
  const raw = process.env.SUBSCRIPTION_MONTHLY_AMOUNT?.trim();
  const parsed = raw ? Number(raw) : DEFAULT_MONTHLY_AMOUNT;
  return Number.isFinite(parsed) && parsed > 0
    ? Math.round(parsed)
    : DEFAULT_MONTHLY_AMOUNT;
}
