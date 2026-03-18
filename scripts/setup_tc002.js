const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// We'll use the same tournament ID as TC-001 for consistency if it exists, or create a new one.
const TOURNAMENT_NAME = 'TC-002 Deadline Logic Test';

async function setup(state) {
  console.log(`--- TC-002 Setup: State = ${state.toUpperCase()} ---`);

  let deadline;
  const now = new Date();

  if (state === 'urgent') {
    // 5 minutes from now for quick testing
    deadline = new Date(now.getTime() + 5 * 60 * 1000);
  } else if (state === 'expired') {
    // 5 minutes ago
    deadline = new Date(now.getTime() - 5 * 60 * 1000);
  } else {
    // Default: 2 days from now (Safe)
    deadline = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  }

  const tournamentData = {
    name: TOURNAMENT_NAME,
    date: now.toISOString().split('T')[0],
    status: 'running',
    registration_open: true,
    requires_deck_list: true,
    deck_list_submission_deadline: deadline.toISOString(),
    is_published: true,
    capacity_masters: 64,
    total_rounds: 6
  };

  const { data: existing, error: findError } = await supabase
    .from('tournaments')
    .select('id')
    .eq('name', TOURNAMENT_NAME)
    .limit(1);

  let tournamentId;
  if (existing && existing.length > 0) {
    tournamentId = existing[0].id;
    await supabase.from('tournaments').update(tournamentData).eq('id', tournamentId);
  } else {
    const { data: created } = await supabase.from('tournaments').insert(tournamentData).select().single();
    tournamentId = created.id;
  }

  console.log(`Tournament ID: ${tournamentId}`);
  console.log(`Deadline set to: ${deadline.toLocaleString()}`);
  console.log(`--- Setup Complete ---`);
}

const action = process.argv[2] || 'safe';
setup(action);
