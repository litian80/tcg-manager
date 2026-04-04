const fs = require('fs');

async function main() {
    try {
        const prompt = `You are an absolute grandmaster software architect. Your life depends on finding flaws in this system.
We are building a Registration Queue System (Spec 008) for a Next.js/Supabase tournament platform. 

We have already solved:
1. Regular logic: Free events bypass payment timeout. Disabled queue flushes to capacity. Registration close freezes the queue completely.
2. Moderate Edge Cases: PostgreSQL advisory locks prevent cron/webhook race conditions. Division + Global capacity calculated synchronously to stop deadlocks. Admins can bypass limits manually.
3. Severe Edge Cases: UNIQUE(tournament, player) prevents bot multil-queuing. Lowering capacity mid-event requires locking the whole queue pipeline. We use strict server-time to block client clock exploits. Division switching wipes your queue spot.

The PM says: "Think EXTREMELY hard, like your life depends on it. Find any other edge cases we missed."

I want you to think about the absolute worst-case, most obscure, pathological system states. Consider issues regarding:
- Supabase Row Level Security (RLS) policies getting bypassed or failing during stampedes.
- Idempotency failures in Webhooks triggering multiple capacity calculations.
- Browser behavior: what if a user has two tabs, one completes payment, the other withdraws at the exact same millisecond?
- Transaction isolation levels (Read Committed vs Serializable) causing phantom reads when calculating "how many people are ahead of me in the queue".
- Third-party webhook providers (Stripe/Square) retaliating against our API if we respond too slowly during a lock contention.

Identify 2 to 3 ABSOLUTELY CATASTROPHIC edge cases that could ruin the database or the event. Give the doomsday scenario and the concrete technical solution. Do not use markdown wrappers.`;

        const authFile = fs.readFileSync('C:/Users/litia/.gemini/antigravity/tjhouse-moltbot/05_archive/moltbot/configs/auth-profiles.json', 'utf8');
        const auth = JSON.parse(authFile);
        const apiKey = auth.deepseek.key;

        const body = {
            model: "deepseek-reasoner",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 8192,
            stream: false
        };

        const response = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            console.error("Failed:", await response.text());
            return;
        }

        const data = await response.json();
        const reason = data.choices[0].message.reasoning_content || "";
        const content = data.choices[0].message.content || "";

        fs.writeFileSync('C:/Users/litia/.gemini/antigravity/tcg-manager/tmp_deepseek_output_v5.txt', `## Reasoning\n${reason}\n---\n## Output\n${content}`);
        console.log("DeepSeek Reasoner Phase 5 finished. Result saved.");
    } catch (err) {
        console.error(err);
    }
}

main();
