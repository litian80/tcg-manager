$prompt = @"
Round 2 of brainstorming. The organizer loves the idea of shifting from 'data entry' to 'review and confirm'. Let's focus on the absolute extremes of input methods.

Currently, Pokemon Tournament Organizers receive their Sanction IDs and event details from the official pokemon.com portal or via email. 

1. Can we design an input method that requires absolutely zero manual typing of fields? E.g. 'Magic Paste', email forwarding parsing, or a browser bookmarklet/extension?
2. Looking closely at the existing wizard steps (Basics, Registration, Advanced), what if we remove the wizard entirely and just have a dashboard widget: 'Upcoming Approved Tournaments' that auto-syncs? If we don't have access to an official private Pokemon API to auto-sync, what's the absolute best 0-click or 1-click alternative?
3. How do we completely remove the mental burden of 'Age Division Cutoffs'? Right now we have UI to 'Apply current season' which auto-fills the birth year limits. Can this be 100% invisible and never shown to the user unless they actively want to run a non-standard custom age division tournament?

Give me specific conceptual UX designs, explain the technical integration, and do not hold back on 'extreme' but realistic engineering solutions. Squeeze out EVERY click and scroll.
"@

$bodyObj = @{
  model = "deepseek-reasoner"
  messages = @(
    @{ role = "user"; content = "You are an expert UX designer focusing on extreme usability and efficiency for tournament organizers. In our previous discussion, you proposed shifting from 'data entry' to 'review and confirm' using adaptive defaults and adaptive templating." },
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
  $finalOutput | Set-Content -Path "C:\Users\litia\.gemini\antigravity\tcg-manager\deepseek_run2.txt" -Encoding utf8
  Write-Host "Success! Response saved."
} catch {
  Write-Host "Error: $($_.Exception.Message)"
}
