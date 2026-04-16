export {};

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => TossPaymentsInstance;
  }
}

interface TossPaymentsInstance {
  widgets: (options: { customerKey: string }) => TossWidgetsInstance;
}

interface TossWidgetsInstance {
  setAmount: (amount: { currency: 'KRW'; value: number }) => Promise<void> | void;
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

