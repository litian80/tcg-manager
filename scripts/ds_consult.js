const fs = require('fs');
const https = require('https');

async function consultDeepSeek() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY not set in environment');

  const prompt = `I am designing the UX for a multi-role Pokemon TCG Tournament Management system.
  
There are 3 main user roles: 'player', 'organizer', and 'judge'. Users can have different roles, but they all start as players. A Judge is often also a Player (e.g., judging an event on Saturday, playing in one on Sunday).

Currently, the homepage provides a different view based on the user's role:
- Players see "Upcoming/Past Public Tournaments".
- Organizers see "My Tournaments" (events they are running).
- Judges see "My Assigned Events" (events they are staffing).

The problem is that if a Judge can only see "My Assigned Events" on their homepage, they are blocked from discovering and registering for regular public tournaments as a player. 

I need to decide how to implement event discovery for Judges (UX-002). I have drafted two main options:

Option A: The "Portal" approach
- Create a dedicated \`/judge\` dashboard page for their staff duties (My Assigned Events).
- Add a "My Assigned Events" link in the secondary navigation bar for Judges.
- Modify the homepage so Judges can see the public tournaments list alongside their staff duties, allowing them to participate as players.

Option B: Keep homepage restricted
- Keep the homepage exclusively showing "My Assigned Events" for Judges.
- Add a navigation link that just points to the homepage.
- (Implicitly, this forces them to log out or use a different account to register for events).

Which option is better for overall UX best practices, and why? Please provide a detailed analysis of the trade-offs and your final recommendation.`;

  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'deepseek-reasoner',
      messages: [{ role: 'user', content: prompt }]
    });

    const options = {
      hostname: 'api.deepseek.com',
      path: '/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let responseBody = '';

      res.on('data', (chunk) => {
        responseBody += chunk;
      });

      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`API Error: ${res.statusCode} - ${responseBody}`));
          return;
        }
        
        try {
          const parsed = JSON.parse(responseBody);
          console.log('--- REASONING ---');
          console.log(parsed.choices[0].message.reasoning_content);
          console.log('--- ANSWER ---');
          console.log(parsed.choices[0].message.content);
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(data);
    req.end();
  });
}

consultDeepSeek().catch(err => {
  console.error(err);
  process.exit(1);
});
