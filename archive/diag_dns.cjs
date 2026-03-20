const dns = require('dns');

const host = 'db.gtngekazgdqhexqxjyna.supabase.co';

console.log(`Resolving ${host}...`);

dns.resolve4(host, (err, addresses) => {
    if (err) console.log(`IPv4 Resolution Error: ${err.message}`);
    else console.log(`IPv4 Addresses: ${addresses.join(', ')}`);
});

dns.resolve6(host, (err, addresses) => {
    if (err) console.log(`IPv6 Resolution Error: ${err.message}`);
    else console.log(`IPv6 Addresses: ${addresses.join(', ')}`);
});
