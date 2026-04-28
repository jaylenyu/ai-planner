/**
 * 구독 월 요금 (원).
 * 백엔드 src/config/billing.config.ts의 DEFAULT_MONTHLY_AMOUNT와 동기화 필요.
 */
export const MONTHLY_AMOUNT = 3900;

export const MONTHLY_AMOUNT_DISPLAY = MONTHLY_AMOUNT.toLocaleString('ko-KR') + '원';
