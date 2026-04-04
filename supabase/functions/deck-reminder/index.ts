import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

interface Tournament {
  id: string;
  name: string;
  notification_webhook_url: string;
  notification_webhook_secret: string;
  deck_list_submission_deadline: string;
}

interface MissingDeckPlayer {
  player_id: string;
  division: string;
  tournament_id: string;
}

async function dispatchWebhook(
  webhookUrl: string,
  secret: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const body = JSON.stringify({ id, event, timestamp, data: payload });
  const signaturePayload = `${timestamp}.${body}`;
  const signature = createHmac('sha256', secret).update(signaturePayload).digest('hex');

  try {
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
      signal: AbortSignal.timeout(10_000),
    });
    console.log(`[deck-reminder] ${event} → ${res.status}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[deck-reminder] dispatch failed:`, message);
  }
}

Deno.serve(async (_req: Request) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // 1. Find tournaments with deck deadline within next 2 hours
    //    that have notification webhooks configured
    const { data: tournaments, error: tError } = await supabase
      .from('tournaments')
      .select('id, name, notification_webhook_url, notification_webhook_secret, deck_list_submission_deadline')
      .not('notification_webhook_url', 'is', null)
      .not('notification_webhook_secret', 'is', null)
      .not('deck_list_submission_deadline', 'is', null)
      .gte('deck_list_submission_deadline', now.toISOString())
      .lte('deck_list_submission_deadline', twoHoursFromNow.toISOString())
      .in('status', ['active', 'setup']);

    if (tError) {
      console.error('[deck-reminder] tournament query error:', tError);
      return new Response(JSON.stringify({ error: tError.message }), { status: 500 });
    }

    if (!tournaments || tournaments.length === 0) {
      return new Response(JSON.stringify({ message: 'No tournaments with upcoming deck deadlines' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let totalReminders = 0;

    for (const tournament of tournaments as Tournament[]) {
      // 2. Find registered/checked_in players who haven't submitted a deck
      //    and haven't been reminded yet
      const { data: allPlayers } = await supabase
        .from('tournament_players')
        .select('player_id, division')
        .eq('tournament_id', tournament.id)
        .in('registration_status', ['registered', 'checked_in'])
        .is('deck_reminder_sent_at', null);

      if (!allPlayers || allPlayers.length === 0) continue;

      // 3. Check which players have submitted deck lists
      const playerIds = allPlayers.map(p => p.player_id);
      const { data: submittedDecks } = await supabase
        .from('deck_lists')
        .select('player_id')
        .eq('tournament_id', tournament.id)
        .in('player_id', playerIds);

      const submittedPlayerIds = new Set((submittedDecks || []).map(d => d.player_id));

      // 4. Filter to players missing decks
      const missingDeckPlayers = allPlayers.filter(
        p => !submittedPlayerIds.has(p.player_id)
      ) as MissingDeckPlayer[];

      if (missingDeckPlayers.length === 0) continue;

      // 5. Dispatch reminders and mark as sent
      for (const player of missingDeckPlayers) {
        // Resolve player profile for email
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('pokemon_player_id', player.player_id)
          .maybeSingle();

        await dispatchWebhook(
          tournament.notification_webhook_url,
          tournament.notification_webhook_secret,
          'deck.reminder',
          {
            tournament_id: tournament.id,
            tournament_name: tournament.name,
            player_id: player.player_id,
            player_name: profile ? `${profile.first_name} ${profile.last_name}` : null,
            player_email: profile?.email || null,
            division: player.division,
            deck_deadline: tournament.deck_list_submission_deadline,
          }
        );

        // Mark reminder as sent
        await supabase
          .from('tournament_players')
          .update({ deck_reminder_sent_at: now.toISOString() })
          .eq('tournament_id', tournament.id)
          .eq('player_id', player.player_id);

        totalReminders++;
      }
    }

    return new Response(
      JSON.stringify({ message: `Sent ${totalReminders} deck reminders` }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[deck-reminder] unhandled error:', message);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});
