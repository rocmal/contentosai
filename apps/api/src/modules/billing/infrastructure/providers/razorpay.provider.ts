import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import {
  CreateOrderRequest,
  CreatePlanRequest,
  CreateSubscriptionRequest,
  IPaymentProvider,
  PaymentDetails,
  PaymentOrder,
  PaymentPlan,
  PaymentSubscription,
} from '../../domain/interfaces/payment-provider.interface';

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';

interface RazorpayOrderResponse {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

interface RazorpayPlanResponse {
  id: string;
}

interface RazorpaySubscriptionResponse {
  id: string;
  status: string;
  current_end: number | null;
}

interface RazorpayPaymentResponse {
  id: string;
  order_id: string | null;
  status: string;
  amount: number;
  currency: string;
}

/**
 * Razorpay adapter - speaks Razorpay's plain REST API over the platform's
 * built-in `fetch`, mirroring how the AI/video/voice providers avoid pulling
 * in a vendor SDK (see infrastructure/providers/base-ai-provider.ts).
 */
@Injectable()
export class RazorpayProvider implements IPaymentProvider {
  readonly name = 'razorpay';

  constructor(private readonly configService: ConfigService) {}

  async createOrder(request: CreateOrderRequest): Promise<PaymentOrder> {
    const response = await this.request<RazorpayOrderResponse>('POST', '/orders', {
      amount: request.amount,
      currency: request.currency,
      receipt: request.receipt,
      notes: request.notes,
    });

    return {
      id: response.id,
      amount: response.amount,
      currency: response.currency,
      status: response.status,
    };
  }

  async ensurePlan(request: CreatePlanRequest): Promise<PaymentPlan> {
    const isYearly = request.intervalMonths % 12 === 0;
    const response = await this.request<RazorpayPlanResponse>('POST', '/plans', {
      period: isYearly ? 'yearly' : 'monthly',
      interval: isYearly ? request.intervalMonths / 12 : request.intervalMonths,
      item: {
        name: request.name,
        amount: request.amount,
        currency: request.currency,
      },
      notes: { planCode: request.planCode },
    });

    return { id: response.id, planCode: request.planCode };
  }

  async createSubscription(request: CreateSubscriptionRequest): Promise<PaymentSubscription> {
    const response = await this.request<RazorpaySubscriptionResponse>('POST', '/subscriptions', {
      plan_id: request.gatewayPlanId,
      total_count: request.totalCount,
      customer_notify: 1,
      notes: request.notes,
    });

    return {
      id: response.id,
      status: response.status,
      currentPeriodEnd: response.current_end ? new Date(response.current_end * 1000) : null,
    };
  }

  async cancelSubscription(gatewaySubscriptionId: string): Promise<void> {
    await this.request('POST', `/subscriptions/${gatewaySubscriptionId}/cancel`, {});
  }

  async fetchPayment(paymentId: string): Promise<PaymentDetails> {
    const response = await this.request<RazorpayPaymentResponse>('GET', `/payments/${paymentId}`);
    return {
      id: response.id,
      orderId: response.order_id,
      status: response.status,
      amount: response.amount,
      currency: response.currency,
    };
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const webhookSecret = this.configService.get<string>('razorpay.webhookSecret') ?? '';
    if (!webhookSecret || !signature) {
      return false;
    }

    const expected = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    const signatureBuffer = Buffer.from(signature, 'hex');
    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, signatureBuffer);
  }

  async healthCheck(): Promise<boolean> {
    return !!this.configService.get<string>('razorpay.keyId') && !!this.configService.get<string>('razorpay.keySecret');
  }

  private async request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const keyId = this.configService.get<string>('razorpay.keyId') ?? '';
    const keySecret = this.configService.get<string>('razorpay.keySecret') ?? '';
    if (!keyId || !keySecret) {
      throw new ServiceUnavailableException(
        'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the environment.',
      );
    }

    const authorization = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;

    let response: Response;
    try {
      response = await fetch(`${RAZORPAY_API_BASE}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: authorization },
        body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
      });
    } catch (error) {
      throw new ServiceUnavailableException(`Failed to reach Razorpay: ${(error as Error).message}`);
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new ServiceUnavailableException(`Razorpay request failed (${response.status}): ${errorBody}`);
    }

    return response.json() as Promise<T>;
  }
}
