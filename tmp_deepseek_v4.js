const fs = require('fs');

async function main() {
    try {
        const prompt = `You are an elite Staff Engineer architecting a bulletproof Next.js + Supabase application.
We are iterating on a Registration Queue System (Spec 008) for high-demand tournament sign-ups.

We have already solved the following edge cases in previous versions:
1. Free events bypass pending_payment windows.
2. Disabling the queue triggers an "accept up to capacity, waitlist the rest" flush.
3. When registration_closes_at hits, the queue freezes and players (including pending_payment) are cancelled.
4. We are using 5-second adaptive polling over REST to avoid WebSocket storming.
5. Strict PostgreSQL advisory locks (pg_advisory_xact_lock) prevent concurrent capacity overallocations (cron + webhook race conditions).
6. Divisional capacity + Global capacity double-checks are done synchronously in one transaction to avoid deadlocks.
7. VIP/Admin manual additions get an bypass_capacity flag to inject players without logic crashing.
8. Client polling invalidates aggressively to avoid stale reconnect states.

YOUR TASK: The PM has asked to think "super hard" and dig EVEN DEEPER for incredibly obscure, malicious, or complex edge cases we haven't thought of. 

Consider things like:
- Malicious actors trying to exploit the queue or payment windows (e.g. queue jumping, holding slots hostage, script botting).
- Infrastructure limits (e.g. Supabase connection limits during the stampede even with polling, Vercel function timeouts).
- Real-world Organizer errors (what if the organizer updates event capacity WHILST the queue is active? e.g. reducing capacity from 100 to 50 when there are already 80 people registered or queued).
- Division adjustments (What if a player in the queue realizes they selected "Juniors" but meant to select "Masters"? Can they change it, and does that reset their queue position?).
- Timezone or Clock Sync issues on edge devices affecting the 10-minute payment countdown.
- Database scaling - querying chronological position across 50,000 pending players efficiently.

Identify 3 to 5 absolutely critical, next-level edge cases that would happen in a real-world chaotic stampede event.
Provide the edge case, the "Doomsday Scenario" it causes, and the concrete technical solution to mitigate it. Do not use markdown code block wrappers around your entire response.`;

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

        fs.writeFileSync('C:/Users/litia/.gemini/antigravity/tcg-manager/tmp_deepseek_output_v4.txt', `## Reasoning\n${reason}\n---\n## Output\n${content}`);
        console.log("DeepSeek Reasoner Phase 4 finished. Result saved.");
    } catch (err) {
        console.error(err);
    }
}

main();
