$prompt = @"
Round 3 of brainstorming. 
We love the concepts:
1. "Magic Paste": Instead of a 4-step wizard, the first thing they see is a giant text box: "Paste your tournament approval email or website details here".
2. "Invisible Age Divisions": Hide the junior/senior/master birth year cutoffs behind a standard "✓ Standard Divisions Applied" label, with a "Customize" button to reveal them.

Let's dig into the extreme details:
For "Magic Paste": Organizers typically get an email or copy from the official pokemon.com portal. The text usually contains "Sanction ID: XX-XX-XXXXXX", name, date, etc.
If we want to avoid the latency and cost of an LLM call for every paste (so we can give instant sub-100ms feedback), how can we build a robust, pure client-side deterministic parsing engine (using TypeScript) that catches 95% of pastes accurately? What regex patterns, heuristics, or fuzzy matching techniques are bulletproof? Can we "live-preview" a tournament card building itself visually as they paste?

For "Invisible Age Divisions" and capacity: How do we visually communicate to the organizer that we did the right thing without cluttering the screen? Should we just say "Standard Divisions (Jr: 2013+, Sr: 2009-2012, Ma: 2008-)" in a tiny badge? Give me the exact UI text, layout, and interaction flow for the "Review" page that replaces the current bulky division inputs.

Are there any other microscopic UX frictions we can squeeze out? For example, setting default decklist cutoffs based on the start time and the type of tournament?
"@

$bodyObj = @{
  model = "deepseek-reasoner"
  messages = @(
    @{ role = "user"; content = "You are an expert UX designer focusing on extreme usability and efficiency for tournament organizers. We are replacing a wizard with a Magic Paste + Review flow." },
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
  $finalOutput | Set-Content -Path "C:\Users\litia\.gemini\antigravity\tcg-manager\deepseek_run3.txt" -Encoding utf8
  Write-Host "Success! Response saved."
} catch {
  Write-Host "Error: $($_.Exception.Message)"
}
