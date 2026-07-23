import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

interface Tournament {
  id: string;
  name: string;
  deck_list_submission_deadline: string;
}

interface TournamentSecrets {
  notification_webhook_url: string;
  notification_webhook_secret: string;
}

interface MissingDeckPlayer {
  player_id: string;
  division: string;
  tournament_id: string;
}

// ─── SSRF guard ────────────────────────────────────────────────────────────
// Deno-native port of utils/url-safety.ts (this runtime can't import the Node
// module). Blocks server-initiated requests to internal/reserved hosts —
// cloud metadata (169.254.169.254), loopback, RFC1918, etc.
function ipv4IsPrivateOrReserved(ip: string): boolean {
  const parts = ip.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return true;
  const [a, b, c] = parts;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // private
  if (a === 127) return true; // loopback
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 169 && b === 254) return true; // link-local incl. metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 0 && c === 0) return true; // 192.0.0.0/24
  if (a === 192 && b === 168) return true; // private
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a >= 224) return true; // multicast + reserved
  return false;
}

function ipv6IsPrivateOrReserved(ip: string): boolean {
  let addr = ip.toLowerCase();
  const zone = addr.indexOf('%');
  if (zone !== -1) addr = addr.slice(0, zone);
  if (addr === '::1' || addr === '::') return true;
  const mapped = addr.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped) return ipv4IsPrivateOrReserved(mapped[1]);
  const head = addr.split(':')[0];
  if (/^fe[89ab]/.test(head)) return true; // link-local
  if (/^f[cd]/.test(head)) return true; // unique local
  if (/^ff/.test(head)) return true; // multicast
  return false;
}

function isIPv4(s: string): boolean {
  const p = s.split('.');
  return p.length === 4 && p.every((o) => /^\d{1,3}$/.test(o) && Number(o) <= 255);
}

function ipIsPrivateOrReserved(ip: string): boolean {
  if (isIPv4(ip)) return ipv4IsPrivateOrReserved(ip);
  if (ip.includes(':')) return ipv6IsPrivateOrReserved(ip);
  return true; // fail-closed
}

async function assertSafeOutboundUrl(rawUrl: string): Promise<{ safe: true } | { safe: false; reason: string }> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { safe: false, reason: 'Invalid URL' };
  }
  if (url.protocol !== 'https:') return { safe: false, reason: 'URL must use HTTPS' };

  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (isIPv4(host) || host.includes(':')) {
    return ipIsPrivateOrReserved(host)
      ? { safe: false, reason: 'private or reserved IP' }
      : { safe: true };
  }

  const lower = host.toLowerCase();
  if (lower === 'localhost' || lower.endsWith('.localhost')) return { safe: false, reason: 'localhost' };

  // Resolve DNS when the runtime allows it; every resolved address must be public.
  const resolveDns = (Deno as unknown as { resolveDns?: (h: string, t: string) => Promise<string[]> }).resolveDns;
  if (typeof resolveDns === 'function') {
    let addrs: string[] = [];
    try {
      const [a, aaaa] = await Promise.all([
        resolveDns(host, 'A').catch(() => [] as string[]),
        resolveDns(host, 'AAAA').catch(() => [] as string[]),
      ]);
      addrs = [...a, ...aaaa];
    } catch {
      return { safe: false, reason: 'host could not be resolved' };
    }
    if (addrs.length === 0) return { safe: false, reason: 'host did not resolve' };
    for (const ip of addrs) {
      if (ipIsPrivateOrReserved(ip)) return { safe: false, reason: 'host resolves to a private or reserved IP' };
    }
  }
  // If DNS resolution is unavailable in this runtime we still enforced HTTPS +
  // literal-IP + localhost checks above; HTTPS cert validation mitigates the
  // residual DNS-rebinding vector.
  return { safe: true };
}

async function dispatchWebhook(
  webhookUrl: string,
  secret: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const safety = await assertSafeOutboundUrl(webhookUrl);
  if (!safety.safe) {
    console.error(`[deck-reminder] blocked ${event} → ${webhookUrl}: ${safety.reason}`);
    return;
  }

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
    const { data: tournaments, error: tError } = await supabase
      .from('tournaments')
      .select('id, name, deck_list_submission_deadline')
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
      // 2a. Fetch webhook secrets for this tournament
      const { data: secrets } = await supabase
        .from('tournament_secrets')
        .select('notification_webhook_url, notification_webhook_secret')
        .eq('tournament_id', tournament.id)
        .maybeSingle();

      // Skip if no webhook configured
      if (!secrets?.notification_webhook_url || !secrets?.notification_webhook_secret) continue;

      const webhookSecrets = secrets as TournamentSecrets;

      // 2b. Find registered/checked_in players who haven't submitted a deck
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
          webhookSecrets.notification_webhook_url,
          webhookSecrets.notification_webhook_secret,
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
