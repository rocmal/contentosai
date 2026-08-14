export interface CreateOrderRequest {
  /** Smallest currency unit (e.g. paise for INR, cents for USD). */
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface PaymentOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

export interface CreatePlanRequest {
  planCode: string;
  name: string;
  amount: number;
  currency: string;
  intervalMonths: number;
}

export interface PaymentPlan {
  id: string;
  planCode: string;
}

export interface CreateSubscriptionRequest {
  gatewayPlanId: string;
  totalCount: number;
  notes?: Record<string, string>;
}

export interface PaymentSubscription {
  id: string;
  status: string;
  currentPeriodEnd: Date | null;
}

export interface PaymentDetails {
  id: string;
  orderId: string | null;
  status: string;
  amount: number;
  currency: string;
}

/**
 * Port every payment-gateway adapter implements. Application services depend
 * only on this interface (obtained through PaymentProviderFactory) and never
 * import a vendor SDK/HTTP client directly - see docs/adr/0003.
 */
export interface IPaymentProvider {
  readonly name: string;

  /** One-off charge (e.g. a credit top-up pack). */
  createOrder(request: CreateOrderRequest): Promise<PaymentOrder>;

  /** Recurring billing plan - idempotent per planCode where the gateway allows it. */
  ensurePlan(request: CreatePlanRequest): Promise<PaymentPlan>;

  createSubscription(request: CreateSubscriptionRequest): Promise<PaymentSubscription>;

  cancelSubscription(gatewaySubscriptionId: string): Promise<void>;

  fetchPayment(paymentId: string): Promise<PaymentDetails>;

  /** Verifies a webhook payload's HMAC signature - must run before any
   * webhook body is trusted or acted on. */
  verifyWebhookSignature(rawBody: string, signature: string): boolean;

  /** Cheap readiness check - true if the provider is configured. */
  healthCheck(): Promise<boolean>;
}
