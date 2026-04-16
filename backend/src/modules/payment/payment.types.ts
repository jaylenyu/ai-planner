export type SubscriptionState =
  | 'inactive'
  | 'active'
  | 'grace'
  | 'expired'
  | 'cancelled';
export type PaymentState = 'READY' | 'DONE' | 'FAILED' | 'CANCELED';

export interface SubscriptionStatusResponse {
  subscription: {
    id: string;
    userId: string;
    planCode: string;
    status: SubscriptionState;
    currentPeriodEnd: string | null;
    graceEndsAt: string | null;
    cancelledAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  hasAccess: boolean;
  monthlyAmount: number;
}

export interface PreparePaymentResponse extends SubscriptionStatusResponse {
  orderId: string;
  customerKey: string;
  orderName: string;
  payment: {
    id: string;
    amount: number;
    status: PaymentState;
    method: string;
  };
}
