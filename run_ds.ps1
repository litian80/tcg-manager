$prompt = @"
You are an expert UX designer focusing on extreme usability and efficiency for tournament organizers.

Context: 
We are building a Pokemon TCG tournament management application. Organizers currently have a multi-step form to create a tournament:
1. Basics (Tournament Type, Name, Date, Start Time, City, Country, Sanction ID / TOM UID, Organizer Play! Pokemon ID).
2. Registration & Capacity (Online Reg Toggle, Roster Visibility, Decklist Requirement & Cutoff, Overall Capacity, Division Capacities, Age Division Date-of-Birth cutoffs).
3. Advanced (Payment processing, custom Webhooks).
There is also a 'Template Selector' (e.g. standard League Cup, League Challenge, Prerelease) which pre-fills some fields.

The user's goal: "I want to further interrogate the organiser UX, think really extra hard, go to extreme lengths, and see if there is anything else we can do to make the tournament setup easier, and more accurate. Squeeze every redundant button click, scrolling, and even user's visual checking out of the process."

Let's brainstorm. Identify every possible microscopic or macroscopic friction point in the data entry or configuration and propose radical yet realistic ways to eliminate it. Focus on eliminating redundant typing, automated data retrieval, zero-click defaults, and predictive text.

Give me your top 5 most extreme but brilliant ways to squeeze friction out of this tournament creation UX. Explain the mechanics of how each would work.
"@

$bodyObj = @{
  model = "deepseek-reasoner"
  messages = @(
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
  $finalOutput | Set-Content -Path "C:\Users\litia\.gemini\antigravity\tcg-manager\deepseek_run1.txt" -Encoding utf8
  Write-Host "Success! Response saved."
} catch {
  Write-Host "Error: $($_.Exception.Message)"
}
