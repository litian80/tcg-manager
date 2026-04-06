$apiKey = $ENV:DEEPSEEK_API_KEY

$prompts = @(
    "We are analyzing the 'Magic Paste' feature for a Next.js pokemon tournament manager app. We already concluded a hybrid approach (Regex first, LLM fallback) is best. ROUND 2: Discuss Data Flow & Architecture. Detail exactly how the data flows from the React component (where they paste) through Zod validation. How do we structure the Zod schema to handle partial parses, and how does the UI surface these partial states or validation errors to the user gracefully?",
    "ROUND 3: Discuss LLM Fallback Integration regarding 'Magic Paste'. If the regex fails, how exactly do we securely call an LLM from our Next.js App Router without leaking API keys? Detail the API route architecture, the exact system prompt to guarantee clean JSON output matching our Zod schema, and how we mitigate costs/abuse.",
    "ROUND 4: Discuss Edge Cases & UI Fidelity for 'Magic Paste'. Organizers might paste junk, raw HTML from the portal, or multiple tournaments at once. How do we protect the app? How do we handle international date formats (e.g. DD/MM vs MM/DD) predictably given we use date-fns? Describe the micro-interactions in the UI when the paste happens.",
    "ROUND 5: Final Synthesis & Action Plan. Summarize the complete technical design for the hybrid Magic Paste feature. Give a step-by-step implementation roadmap for the developer, starting from the Zod schemas up to the UI components."
)

$results = ""

foreach ($p in $prompts) {
    Write-Host "Running: $p"
    $messages = @(
        @{ role = "user"; content = "You are an expert UX engineer and Systems Architect." },
        @{ role = "user"; content = $p }
    )
    
    $bodyObj = @{
        model = "deepseek-reasoner"
        messages = $messages
        max_tokens = 8000
        stream = $false
    }
    $body = $bodyObj | ConvertTo-Json -Depth 5
    $headers = @{ "Content-Type" = "application/json; charset=utf-8"; "Authorization" = "Bearer $apiKey" }
    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
    
    try {
        $resp = Invoke-RestMethod -Uri "https://api.deepseek.com/chat/completions" -Method POST -Headers $headers -Body $bodyBytes -TimeoutSec 300
        $reasoning = $resp.choices[0].message.reasoning_content
        $content = $resp.choices[0].message.content
        
        $results += "=== $p ===`nREASONING:`n$reasoning`n`nCONTENT:`n$content`n`n"
    } catch {
        $results += "Error on $p : $($_.Exception.Message)`n"
    }
}

$results | Set-Content -Path "C:\Users\litia\.gemini\antigravity\tcg-manager\deepseek_magic_paste_full.txt" -Encoding utf8
Write-Host "All rounds complete."
