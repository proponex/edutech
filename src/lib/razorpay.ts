import Razorpay from 'razorpay';
import crypto from 'crypto';

/**
 * Razorpay Payment Gateway Client & Cryptographic Utilities
 * Complies with official Razorpay documentation:
 * - https://razorpay.com/docs/payments/server-integration/nodejs/
 * - https://razorpay.com/docs/webhooks/
 */

export interface RazorpayConfigStatus {
  isConfigured: boolean;
  mode: 'test' | 'live' | 'unconfigured';
  hasKeyId: boolean;
  hasKeySecret: boolean;
  hasWebhookSecret: boolean;
  keyIdPrefix: string;
}

/**
 * Inspect server-side Razorpay configuration status safely without leaking secrets.
 */
export function getRazorpayConfigStatus(): RazorpayConfigStatus {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

  const hasKeyId = Boolean(keyId.trim());
  const hasKeySecret = Boolean(keySecret.trim());
  const hasWebhookSecret = Boolean(webhookSecret.trim());
  const isConfigured = hasKeyId && hasKeySecret;

  let mode: 'test' | 'live' | 'unconfigured' = 'unconfigured';
  if (isConfigured) {
    if (keyId.startsWith('rzp_live_')) {
      mode = 'live';
    } else if (keyId.startsWith('rzp_test_')) {
      mode = 'test';
    } else {
      mode = 'test'; // Default assumption for sandboxes
    }
  }

  return {
    isConfigured,
    mode,
    hasKeyId,
    hasKeySecret,
    hasWebhookSecret,
    keyIdPrefix: hasKeyId ? keyId.slice(0, 8) + '...' : 'none',
  };
}

/**
 * Returns an authenticated Razorpay instance or null if credentials are not supplied.
 */
export function getRazorpayClient(): Razorpay | null {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return null;
  }

  return new Razorpay({
    key_id: keyId.trim(),
    key_secret: keySecret.trim(),
  });
}

/**
 * Verify Razorpay payment signature according to official specification:
 * HMAC SHA256 of (order_id + '|' + payment_id) with key_secret
 */
export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    console.error('[Razorpay Security] Signature verification failed: RAZORPAY_KEY_SECRET is not configured.');
    return false;
  }

  if (!params.orderId || !params.paymentId || !params.signature) {
    return false;
  }

  try {
    const payload = `${params.orderId}|${params.paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret.trim())
      .update(payload)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const actualBuffer = Buffer.from(params.signature, 'utf8');

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  } catch (err) {
    console.error('[Razorpay Security] Error during payment signature check:', err);
    return false;
  }
}

/**
 * Verify Razorpay webhook signature according to official specification:
 * HMAC SHA256 of raw request body string using RAZORPAY_WEBHOOK_SECRET
 */
export function verifyWebhookSignature(params: {
  rawBody: string;
  signature: string;
}): boolean {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[Razorpay Security] Webhook signature verification failed: RAZORPAY_WEBHOOK_SECRET is not configured.');
    return false;
  }

  if (!params.rawBody || !params.signature) {
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret.trim())
      .update(params.rawBody)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const actualBuffer = Buffer.from(params.signature, 'utf8');

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  } catch (err) {
    console.error('[Razorpay Security] Error during webhook signature check:', err);
    return false;
  }
}
