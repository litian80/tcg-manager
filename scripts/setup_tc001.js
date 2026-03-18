const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Constants for TC-001
const TEST_USER_EMAIL = 'uat-test@example.com';
const TEST_PLAYER_ID = 'UAT-999999';
const TOURNAMENT_NAME = 'TC-001 UAT Deck Submission Test';

async function setup() {
  console.log('--- TC-001 Phase 1 Setup Started ---');

  // 0. Get the user ID
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const user = users.find(u => u.email === TEST_USER_EMAIL);
  if (!user) {
    console.error('Test user not found');
    return;
  }
  const TEST_USER_ID = user.id;
  console.log(`Using Test User ID: ${TEST_USER_ID}`);

  // 1. Ensure tournament exists with correct flags
  console.log('Step 1: Setting up tournament...');
  const { data: existingTournaments, error: findError } = await supabase
    .from('tournaments')
    .select('id')
    .eq('name', TOURNAMENT_NAME)
    .limit(1);

  if (findError) {
    console.error('Error finding tournament:', findError);
    return;
  }

  const tournamentData = {
    name: TOURNAMENT_NAME,
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
    status: 'running',
    registration_open: true,
    requires_deck_list: true,
    deck_list_submission_deadline: new Date(Date.now() + 172800000).toISOString(), // 2 days from now
    is_published: true,
    capacity_masters: 64,
    total_rounds: 6
  };

  let tournamentId;
  if (existingTournaments.length > 0) {
    tournamentId = existingTournaments[0].id;
    console.log(`Tournament exists (ID: ${tournamentId}), updating...`);
    const { error: uError } = await supabase
      .from('tournaments')
      .update(tournamentData)
      .eq('id', tournamentId);
    if (uError) {
      console.error('Error updating tournament:', uError);
      return;
    }
  } else {
    console.log('Creating new tournament...');
    const { data: newTournament, error: iError } = await supabase
      .from('tournaments')
      .insert(tournamentData)
      .select()
      .single();
    if (iError) {
      console.error('Error inserting tournament:', iError);
      return;
    }
    tournamentId = newTournament.id;
  }
  console.log(`Tournament ready: ${TOURNAMENT_NAME} (ID: ${tournamentId})`);

  // 2. Ensure test user profile is correct
  console.log('Step 2: Checking test user profile...');
  const { error: pError } = await supabase
    .from('profiles')
    .update({ pokemon_player_id: TEST_PLAYER_ID })
    .eq('id', TEST_USER_ID);

  if (pError) {
    console.error('Error updating profile:', pError);
    return;
  }
  console.log(`User profile updated (POPID: ${TEST_PLAYER_ID})`);

  // 3. Clear existing registration and deck list for this tournament
  console.log('Step 3: Cleaning up existing state...');
  await supabase
    .from('tournament_players')
    .delete()
    .eq('tournament_id', tournamentId)
    .eq('player_id', TEST_PLAYER_ID);

  await supabase
    .from('deck_lists')
    .delete()
    .eq('tournament_id', tournamentId)
    .eq('player_id', TEST_PLAYER_ID);

  console.log(`Previous registrations and decks cleared for ${TEST_PLAYER_ID}`);
  console.log(`--- TC-001 Phase 1 Setup Complete ---`);
  console.log(`TOURNAMENT_ID=${tournamentId}`);
}

setup();
