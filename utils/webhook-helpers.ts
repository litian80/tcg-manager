import { SupabaseClient } from '@supabase/supabase-js';
import { dispatchWebhook, WebhookEvent } from './webhooks';

/**
 * Attempts to dispatch a notification webhook for the given tournament.
 * No-ops silently if the tournament has no webhook configured.
 *
 * This is the primary entry point for all outbound notification webhooks.
 * It handles fetching the tournament webhook config, resolving the player
 * profile (name + email), building the payload, and dispatching.
 *
 * Always call this as fire-and-forget:
 *   tryDispatchNotification(...).catch(() => {});
 */
export async function tryDispatchNotification(
  supabase: SupabaseClient,
  tournamentId: string,
  event: WebhookEvent,
  playerPopId: string,
  extraPayload?: Record<string, unknown>
): Promise<void> {
  try {
    // 1. Fetch tournament name and date
    const { data: tournament, error: tError } = await supabase
      .from('tournaments')
      .select('name, date')
      .eq('id', tournamentId)
      .single();

    if (tError || !tournament) return;

    // 2. Fetch webhook secrets from restricted table
    const { data: secrets, error: sError } = await supabase
      .from('tournament_secrets' as any)
      .select('notification_webhook_url, notification_webhook_secret')
      .eq('tournament_id', tournamentId)
      .single();

    if (sError || !secrets) return;

    // No-op if no webhook URL or secret configured
    if (!secrets.notification_webhook_url || !secrets.notification_webhook_secret) {
      return;
    }

    // 2. Resolve player profile (name + email) via pokemon_player_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('pokemon_player_id', playerPopId)
      .maybeSingle();

    // Build payload with player info (may be null if profile not found)
    const payload: Record<string, unknown> = {
      tournament_id: tournamentId,
      tournament_name: tournament.name,
      tournament_date: tournament.date,
      player_id: playerPopId,
      player_name: profile ? `${profile.first_name} ${profile.last_name}` : null,
      player_email: profile?.email || null,
      ...extraPayload,
    };

    // 3. Fire webhook (fire-and-forget — errors are logged internally)
    await dispatchWebhook(
      secrets.notification_webhook_url,
      secrets.notification_webhook_secret,
      event,
      payload
    );
  } catch (err: any) {
    // Swallow all errors — webhook failures must never affect user flows
    console.error(`[webhook-helper] tryDispatchNotification failed:`, err.message);
  }
}

/**
 * Dispatch a webhook with pre-built payload and tournament config.
 * Used by the Edge Function where tournament config is already fetched.
 */
export async function dispatchWithConfig(
  webhookUrl: string,
  webhookSecret: string,
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    await dispatchWebhook(webhookUrl, webhookSecret, event, payload);
  } catch (err: any) {
    console.error(`[webhook-helper] dispatchWithConfig failed:`, err.message);
  }
}
