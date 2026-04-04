const fs = require('fs');

async function main() {
    try {
        const spec = fs.readFileSync('c:/Users/litia/.gemini/antigravity/tcg-manager/docs/specs/008-registration-queue.md', 'utf8');
        const reg = fs.readFileSync('c:/Users/litia/.gemini/antigravity/tcg-manager/actions/registration.ts', 'utf8');
        const sql = fs.readFileSync('c:/Users/litia/.gemini/antigravity/tcg-manager/supabase/migrations/20260404000000_payment_portal.sql', 'utf8');

        const prompt = `You are an expert full-stack developer working on a Next.js (App Router) + Supabase application.
Here is the specification for 'Spec 008 - Registration Queue System':
${spec}

Here is our current implementation of actions/registration.ts:
${reg}

Here is our recently added payment module from 20260404000000_payment_portal.sql:
${sql}

Draft an implementation plan that addresses all requirements in Spec 008, specifically paying attention to the corner cases of combining the new 'queued' status with the 'pending_payment' and 'registered' states. Please formulate specific questions for any technical ambiguities you spot. Keep your output concise but precise. Do NOT output markdown code block wrappers around your entire response.`;

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

        fs.writeFileSync('C:/Users/litia/.gemini/antigravity/tcg-manager/tmp_deepseek_output.txt', `## Reasoning\n${reason}\n---\n## Output\n${content}`);
        console.log("DeepSeek Reasoner finished. Result saved.");
    } catch (err) {
        console.error(err);
    }
}

main();
