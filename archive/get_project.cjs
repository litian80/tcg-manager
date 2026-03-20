const https = require('https');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const options = {
    hostname: 'api.supabase.com',
    port: 443,
    path: `/v1/projects/gtngekazgdqhexqxjyna`,
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    }
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        try {
            const parsed = JSON.parse(data);
            console.log(JSON.stringify(parsed, null, 2));
        } catch (e) {
            console.log(data);
        }
    });
});

req.on('error', (e) => {
    console.error(e);
});
req.end();
