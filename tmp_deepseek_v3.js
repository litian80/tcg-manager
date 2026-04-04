const fs = require('fs');

async function main() {
    try {
        const prompt = `You are an expert full-stack developer working on a Next.js (App Router) + Supabase application.
We are finalizing an implementation plan for Spec 008 - Registration Queue System.
Our current V2 plan addresses the following:
1. Free events bypass the pending_payment timeout when promoted from the queue.
2. If an organizer manually disables the queue, the system does an "Accept to Capacity" flush, pushing everyone else to waitlist.
3. If registration closes while people are queued, the queue freezes and users are cancelled.
4. We are using 5-second adaptive polling over REST instead of WebSockets.

Your task: Do another round of review and think EXTRA HARD about any other edge cases we might have neglected. 
Consider:
- Concurrency and Race conditions (e.g. cron job ticking at the same time as a webhook payment success).
- Division-specific vs global tournament capacities (e.g., Juniors fills up, but Masters still has room - how does the queue handle it?).
- Players who close their browser while waiting in queue.
- If a player's payment expires just as a batch is processed.
- VIPs or Admins manually adding a player (do they bypass the queue?).
- Waitlist capacity limits (if the event waitlist is also full, what happens to queued users when the queue is disabled?).

Please brainstorm 3 to 5 critical but missing edge cases or technical gotchas. Output a structured list of the edge cases and your recommended technical solutions for each. Do not use markdown code block wrappers around your entire response.`;

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

        fs.writeFileSync('C:/Users/litia/.gemini/antigravity/tcg-manager/tmp_deepseek_output_v3.txt', `## Reasoning\n${reason}\n---\n## Output\n${content}`);
        console.log("DeepSeek Reasoner Phase 3 finished. Result saved.");
    } catch (err) {
        console.error(err);
    }
}

main();
