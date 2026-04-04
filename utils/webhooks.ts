import { createHmac } from 'crypto';

/**
 * Supported outbound notification webhook event types.
 * registration.promoted is deferred to Spec 008 (queue system).
 */
export type WebhookEvent =
  | 'registration.confirmed'
  | 'registration.waitlisted'
  | 'registration.withdrawn'
  | 'payment.pending'
  | 'payment.confirmed'
  | 'payment.expired'
  | 'deck.submitted'
  | 'deck.reminder'
  | 'ping';

export interface WebhookResult {
  ok: boolean;
  status?: number;
  error?: string;
}

/**
 * Dispatch an outbound notification webhook to the organiser's endpoint.
 *
 * - HMAC-SHA256 signed with replay protection (timestamp in signature payload).
 * - 10-second timeout via AbortSignal.
 * - Fire-and-forget: failures are logged, never surfaced to users.
 */
export async function dispatchWebhook(
  webhookUrl: string,
  secret: string,
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<WebhookResult> {
  try {
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const body = JSON.stringify({
      id,
      event,
      timestamp,
      data: payload,
    });

    // Include timestamp in HMAC for replay protection
    // Consumers verify: HMAC(timestamp + '.' + body) === signature
    const signaturePayload = `${timestamp}.${body}`;
    const signature = createHmac('sha256', secret)
      .update(signaturePayload)
      .digest('hex');

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': event,
        'X-Webhook-Id': id,
        'X-Webhook-Timestamp': timestamp,
      },
      body,
      signal: AbortSignal.timeout(10_000), // 10s hard timeout
    });

    if (!res.ok) {
      console.error(
        `[webhook] ${event} → ${webhookUrl} returned ${res.status}`
      );
    }

    return { ok: res.ok, status: res.status };
  } catch (err: any) {
    console.error(`[webhook] dispatch failed for ${event}:`, err.message);
    return { ok: false, error: err.message };
  }
}
