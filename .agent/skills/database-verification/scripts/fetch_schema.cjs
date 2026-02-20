const https = require('https');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const options = {
    hostname: 'gtngekazgdqhexqxjyna.supabase.co',
    port: 443,
    path: '/rest/v1/',
    method: 'GET',
    headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    }
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            fs.writeFileSync('schema.json', JSON.stringify(parsed, null, 2));
            console.log('Schema saved to schema.json');
        } catch (e) {
            console.error("Error parsing JSON:", e);
            fs.writeFileSync('schema.json', data);
        }
    });
});

req.on('error', (e) => {
    console.error(e);
});
req.end();
