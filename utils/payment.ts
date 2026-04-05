import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

/**
 * Build the payment redirect URL by appending player/tournament details as query params
 * to the organiser's base payment URL.
 */
export function buildPaymentRedirectUrl(
  baseUrl: string,
  params: Record<string, string | undefined>
): string {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

/**
 * Verify an inbound webhook signature using HMAC-SHA256.
 * Returns true if the signature matches.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    return timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Generate a cryptographically secure webhook secret.
 */
export function generateWebhookSecret(): string {
  return randomBytes(32).toString('hex');
}
