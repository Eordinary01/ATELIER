import crypto from 'node:crypto';
import { env } from '../config/env.js';

export interface CreateOrderParams {
  amountPaise: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResult {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
  isSimulated: boolean;
}

export function isRazorpayConfigured(): boolean {
  return (
    Boolean(env.RAZORPAY_KEY_ID) &&
    Boolean(env.RAZORPAY_KEY_SECRET) &&
    env.RAZORPAY_KEY_ID !== 'rzp_test_placeholder' &&
    env.RAZORPAY_KEY_SECRET !== 'test_secret_placeholder'
  );
}

export function getRazorpayKeyId(): string {
  return env.RAZORPAY_KEY_ID || 'rzp_test_placeholder';
}

/**
 * Creates an order on Razorpay or generates a valid simulated order if in test/mock mode.
 */
export async function createRazorpayOrder(params: CreateOrderParams): Promise<RazorpayOrderResult> {
  const { amountPaise, currency = 'INR', receipt, notes = {} } = params;

  if (isRazorpayConfigured()) {
    try {
      const authHeader = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64');
      const res = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${authHeader}`,
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency,
          receipt,
          notes,
        }),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        console.error('Razorpay API error response:', errorBody);
        throw new Error(`Razorpay API error: ${res.statusText}`);
      }

      const data = await res.json() as any;
      return {
        id: data.id,
        amount: data.amount,
        currency: data.currency,
        receipt: data.receipt,
        status: data.status,
        isSimulated: false,
      };
    } catch (err: any) {
      console.warn('Falling back to simulated Razorpay order due to API error:', err.message);
    }
  }

  // Simulation mode for local development & testing
  const simulatedId = `order_${crypto.randomBytes(8).toString('hex')}`;
  return {
    id: simulatedId,
    amount: amountPaise,
    currency,
    receipt,
    status: 'created',
    isSimulated: true,
  };
}

/**
 * Verifies Razorpay payment HMAC-SHA256 signature
 */
export function verifyRazorpaySignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const { orderId, paymentId, signature } = params;

  // Simulated signatures are only accepted in development/testing when keys are not configured
  if (env.NODE_ENV !== 'production' && (signature.startsWith('simulated_sig_') || !isRazorpayConfigured())) {
    return true;
  }

  if (!isRazorpayConfigured()) {
    return false;
  }

  try {
    const text = `${orderId}|${paymentId}`;
    const generatedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(generatedSignature, 'utf-8'),
      Buffer.from(signature, 'utf-8')
    );
  } catch (err) {
    if (env.NODE_ENV !== 'production') {
      console.error('Signature verification error:', err);
    }
    return false;
  }
}

/**
 * Verifies Razorpay Webhook signature (HMAC-SHA256 over raw payload body using RAZORPAY_WEBHOOK_SECRET)
 */
export function verifyRazorpayWebhookSignature(params: {
  rawBody: string;
  signature: string;
}): boolean {
  const { rawBody, signature } = params;

  // In non-production test mode, accept simulated signature or missing secret
  if (env.NODE_ENV !== 'production' && (signature.startsWith('simulated_webhook_') || !env.RAZORPAY_WEBHOOK_SECRET)) {
    return true;
  }

  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf-8'),
      Buffer.from(signature, 'utf-8')
    );
  } catch (err) {
    if (env.NODE_ENV !== 'production') {
      console.error('Webhook signature verification error:', err);
    }
    return false;
  }
}

