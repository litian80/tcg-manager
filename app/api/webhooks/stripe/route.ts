import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { tryDispatchNotification } from '@/utils/webhook-helpers';

// Use service-role client — this endpoint is called by Stripe, not authed users
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_unused', {
  apiVersion: '2026-03-25.dahlia',
});

/**
 * Stripe Webhook Handler for Payment Links
 * 
 * Handles `checkout.session.completed` events from Stripe.
 * Matches payments to registrations via the `client_reference_id` field
 * (which contains the payment_callback_token) passed through the Payment Link URL.
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const stripeSignature = request.headers.get('stripe-signature');

    if (!stripeSignature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    // 1. Pre-parse the payload to extract the callback_token before signature verification
    //    (We need it to look up which tournament's whsec_ secret to use)
    let callbackToken: string | null = null;

    try {
      const rawEvent = JSON.parse(rawBody);
      if (rawEvent.type === 'checkout.session.completed') {
        // client_reference_id is passed via the Payment Link URL parameter
        callbackToken = rawEvent.data?.object?.client_reference_id || null;
        // Fallback: check metadata
        if (!callbackToken) {
          callbackToken = rawEvent.data?.object?.metadata?.callback_token || null;
        }
      }
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!callbackToken) {
      // Not a payment we track — acknowledge to stop Stripe retries
      return NextResponse.json({ received: true, note: 'No callback_token, skipping' });
    }

    const supabase = getServiceClient();

    // 2. Look up the tournament_player by callback_token
    const { data: registration, error: lookupError } = await supabase
      .from('tournament_players')
      .select('tournament_id, player_id, division, registration_status, payment_callback_token')
      .eq('payment_callback_token', callbackToken)
      .single();

    if (lookupError || !registration) {
      return NextResponse.json({ error: 'Invalid or expired callback token' }, { status: 404 });
    }

    // 3. Replay protection
    if (registration.registration_status !== 'pending_payment') {
      return NextResponse.json({ status: 'already_processed' });
    }

    // 4. Fetch tournament's Stripe webhook secret
    const { data: secrets, error: secretsError } = await supabase
      .from('tournament_secrets')
      .select('payment_webhook_secret')
      .eq('tournament_id', registration.tournament_id)
      .single();

    if (secretsError || !secrets?.payment_webhook_secret) {
      console.error(`Stripe webhook rejected: tournament ${registration.tournament_id} has no payment_webhook_secret`);
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 });
    }

    // 5. Verify Stripe signature with the tournament's whsec_ secret
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, stripeSignature, secrets.payment_webhook_secret);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Stripe signature verification failed:', message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 6. Only process checkout.session.completed
    if (event.type !== 'checkout.session.completed') {
      return NextResponse.json({ received: true });
    }

    // 7. Idempotency check using Stripe session ID
    const session = event.data.object as Stripe.Checkout.Session;

    const { error: idempotencyError } = await supabase
      .from('processed_payment_webhooks')
      .insert({
        webhook_id: session.id,
        tournament_id: registration.tournament_id,
        player_id: registration.player_id,
      });

    if (idempotencyError) {
      if (idempotencyError.code === '23505') {
        return NextResponse.json({ status: 'ignored', reason: 'already_processed' });
      }
      console.error('Idempotency insert error:', idempotencyError);
      return NextResponse.json({ error: 'Idempotency lock failed' }, { status: 500 });
    }

    // 8. Payment confirmed — determine final registration status
    const division = registration.division || 'master';
    const capacityColumn = `capacity_${division}s`;

    const { data: tournamentCap } = await supabase
      .from('tournaments')
      .select(capacityColumn)
      .eq('id', registration.tournament_id)
      .single();

    const capacity = (tournamentCap as any)?.[capacityColumn] || 0;
    let newStatus = 'registered';

    if (capacity > 0) {
      const { count } = await supabase
        .from('tournament_players')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', registration.tournament_id)
        .eq('division', division)
        .in('registration_status', ['registered', 'checked_in']);

      if ((count || 0) >= capacity) {
        newStatus = 'waitlisted';
      }
    }

    const { error: updateError } = await supabase
      .from('tournament_players')
      .update({
        registration_status: newStatus,
        payment_callback_token: null,
        payment_pending_since: null,
      })
      .eq('tournament_id', registration.tournament_id)
      .eq('player_id', registration.player_id);

    if (updateError) {
      console.error('Stripe webhook update error:', updateError);
      return NextResponse.json({ error: 'Failed to update registration' }, { status: 500 });
    }

    // Fire notification webhooks (fire-and-forget)
    tryDispatchNotification(supabase, registration.tournament_id, 'payment.confirmed', registration.player_id, { division })
      .catch(() => {});

    if (newStatus === 'waitlisted') {
      tryDispatchNotification(supabase, registration.tournament_id, 'registration.waitlisted', registration.player_id, { division })
        .catch(() => {});
    }

    return NextResponse.json({ status: newStatus });

  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
