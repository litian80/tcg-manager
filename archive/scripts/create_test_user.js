const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTestUser() {
  const email = 'uat-test@example.com';
  const password = 'Password123!';
  
  console.log(`Checking if ${email} exists...`);
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  const existingUser = users.find(u => u.email === email);
  
  let userId;
  if (existingUser) {
    console.log('User already exists, updating password...');
    userId = existingUser.id;
    await supabase.auth.admin.updateUserById(userId, { password });
  } else {
    console.log('Creating new user...');
    const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (createError) {
      console.error('Error creating user:', createError);
      return;
    }
    userId = user.id;
  }
  
  console.log(`Setting up profile for ${userId}...`);
  const { error: pError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email,
      pokemon_player_id: 'UAT-999999',
      role: 'user'
    }, { onConflict: 'id' });
    
  if (pError) {
    console.error('Error setting up profile:', pError);
  } else {
    console.log('Test user is ready!');
  }
}

createTestUser();
