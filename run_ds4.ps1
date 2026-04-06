$prompt = @"
We are going to do a deep dive into the 'Magic Paste' UX concept for tournament setup. 

The idea: A single large text area where the organizer pastes their tournament approval text (from email or the Pokemon organizer portal), and the app instantly parses it using client-side TypeScript to pre-fill a "Review & Confirm" tournament card.

Please conduct a rigorous analysis of this feature. What are the pros, cons, risks, and benefits of adopting this approach?
Take into consideration:
1. Current codebase architecture (Next.js React app, Tailwind, Radix UI, Zod schema validation, Supabase backend).
2. External resources we might have or need (Do we realistically need a lightweight LLM API like DeepSeek to parse unstructured text, or is a pure client-side regex/heuristic engine truly bulletproof? What happens if Pokemon.com silently changes their email format?).

Let's start Round 1 of 5. Give me a detailed breakdown of the pros/cons and risk/benefits, specifically debating the Client-Side Regex vs Backend LLM Parsing approaches.
"@

$bodyObj = @{
  model = "deepseek-reasoner"
  messages = @(
    @{ role = "user"; content = "You are an expert UX engineer and Systems Architect discussing the implementation of a 'Magic Paste' feature." },
    @{ role = "user"; content = $prompt }
  )
  max_tokens = 8000
  stream = $false
}
$body = $bodyObj | ConvertTo-Json -Depth 5

$headers = @{
  "Content-Type" = "application/json; charset=utf-8"
  "Authorization" = "Bearer $($ENV:DEEPSEEK_API_KEY)"
}

$bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)

try {
  $resp = Invoke-RestMethod -Uri "https://api.deepseek.com/chat/completions" -Method POST -Headers $headers -Body $bodyBytes -TimeoutSec 300
  
  $reasoning = $resp.choices[0].message.reasoning_content
  $content = $resp.choices[0].message.content
  
  $finalOutput = "REASONING:`n$reasoning`n`nCONTENT:`n$content"
  $finalOutput | Set-Content -Path "C:\Users\litia\.gemini\antigravity\tcg-manager\deepseek_run4.txt" -Encoding utf8
  Write-Host "Success! Response saved."
} catch {
  Write-Host "Error: $($_.Exception.Message)"
}
