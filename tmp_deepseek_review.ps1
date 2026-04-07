$planContent = Get-Content -Raw -Path "C:\Users\litia\.gemini\antigravity\brain\b5c3c4c4-7224-4720-9625-e9de801896b4\implementation_plan.md"

$prompt = @"
You are an expert software architect and security reviewer.
Review the following implementation plan for adding an 'Apply to Become Organiser' feature to a Next.js / Supabase application.
Identify any potential risks, security vulnerabilities, edge cases, UX issues, or missing dependencies in the plan.
Provide your feedback as a structured markdown document.

--- IMPLEMENTATION PLAN ---
$planContent
--- END PLAN ---
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
  Write-Host "Calling DeepSeek API..."
  $resp = Invoke-RestMethod -Uri "https://api.deepseek.com/chat/completions" -Method POST -Headers $headers -Body $bodyBytes -TimeoutSec 300
  
  $reasoning = $resp.choices[0].message.reasoning_content
  $content = $resp.choices[0].message.content
  
  $finalOutput = "REASONING:`n$reasoning`n`nCONTENT:`n$content"
  $finalOutput | Set-Content -Path "C:\Users\litia\.gemini\antigravity\tcg-manager\deepseek_review_organiser.txt" -Encoding utf8
  Write-Host "Success! Response saved to deepseek_review_organiser.txt"
} catch {
  Write-Host "Error: $($_.Exception.Message)"
  if ($_.ErrorDetails) {
    Write-Host "Details: $($_.ErrorDetails.Message)"
  }
}
