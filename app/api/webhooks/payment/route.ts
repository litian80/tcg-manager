import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyWebhookSignature } from '@/utils/payment';

// Use service-role client — this endpoint is called by external systems, not authed users
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey);
}

interface WebhookBody {
  callback_token: string;
  status: 'success' | 'failed';
  reference?: string;
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    let body: WebhookBody;

    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!body.callback_token || !body.status) {
      return NextResponse.json(
        { error: 'Missing required fields: callback_token, status' },
        { status: 400 }
      );
    }

    if (!['success', 'failed'].includes(body.status)) {
      return NextResponse.json(
        { error: 'status must be "success" or "failed"' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // 1. Look up the tournament_player by callback_token
    const { data: registration, error: lookupError } = await supabase
      .from('tournament_players')
      .select('tournament_id, player_id, division, registration_status, payment_callback_token')
      .eq('payment_callback_token', body.callback_token)
      .single();

    if (lookupError || !registration) {
      return NextResponse.json({ error: 'Invalid or expired callback token' }, { status: 404 });
    }

    // 2. Replay protection — if token is already consumed (status != pending_payment)
    if (registration.registration_status !== 'pending_payment') {
      return NextResponse.json(
        { error: 'Payment already processed for this registration' },
        { status: 409 }
      );
    }

    // 3. Fetch tournament to verify webhook signature
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('payment_webhook_secret')
      .eq('id', registration.tournament_id)
      .single();

    if (tournamentError || !tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // 4. Verify HMAC signature
    const signature = request.headers.get('X-Webhook-Signature') || '';
    if (tournament.payment_webhook_secret) {
      const isValid = verifyWebhookSignature(rawBody, signature, tournament.payment_webhook_secret);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
    }

    // 5. Process based on status
    if (body.status === 'success') {
      // Check capacity to determine if registered or waitlisted
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
        console.error('Payment webhook update error:', updateError);
        return NextResponse.json({ error: 'Failed to update registration' }, { status: 500 });
      }

      return NextResponse.json({ status: newStatus });

    } else {
      // Payment failed — cancel registration
      const { error: cancelError } = await supabase
        .from('tournament_players')
        .update({
          registration_status: 'cancelled',
          payment_callback_token: null,
          payment_pending_since: null,
        })
        .eq('tournament_id', registration.tournament_id)
        .eq('player_id', registration.player_id);

      if (cancelError) {
        console.error('Payment webhook cancel error:', cancelError);
        return NextResponse.json({ error: 'Failed to cancel registration' }, { status: 500 });
      }

      return NextResponse.json({ status: 'cancelled' });
    }
  } catch (error) {
    console.error('Payment webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
