$prompt = @"
You are an expert full-stack developer working on a Next.js (App Router) + Supabase application.
Here is the specification for 'Spec 008 - Registration Queue System':
$(Get-Content 'c:\Users\litia\.gemini\antigravity\tcg-manager\docs\specs\008-registration-queue.md' -Raw)

Here is our current implementation of actions/registration.ts:
$(Get-Content 'c:\Users\litia\.gemini\antigravity\tcg-manager\actions\registration.ts' -Raw)

Here is our recently added payment module from 20260404000000_payment_portal.sql:
$(Get-Content 'c:\Users\litia\.gemini\antigravity\tcg-manager\supabase\migrations\20260404000000_payment_portal.sql' -Raw)

Draft an implementation plan that addresses all requirements in Spec 008, specifically paying attention to the corner cases of combining the new 'queued' status with the 'pending_payment' and 'registered' states. Please formulate specific questions for any technical ambiguities you spot. Do NOT output markdown code block wrappers around your entire response.
"@

$body = @{
  model = "deepseek-reasoner"
  messages = @(
    @{ role = "user"; content = $prompt }
  )
  max_tokens = 8192
  stream = $false
} | ConvertTo-Json -Depth 5

$keys = Get-Content 'C:\Users\litia\.gemini\antigravity\tjhouse-moltbot\05_archive\moltbot\configs\auth-profiles.json' | ConvertFrom-Json
$apiKey = $keys.deepseek.key

$headers = @{
  "Content-Type"="application/json"
  "Authorization"="Bearer $apiKey"
}

$resp = Invoke-RestMethod -Uri "https://api.deepseek.com/chat/completions" -Method POST -Headers $headers -Body $body -TimeoutSec 300

$output = "## Reasoning`n" + $resp.choices[0].message.reasoning_content + "`n---`n## Output`n" + $resp.choices[0].message.content
$output | Set-Content -Path "C:\Users\litia\.gemini\antigravity\tcg-manager\tmp_deepseek_output.txt" -Encoding utf8
Write-Output "DeepSeek Reasoner finished. Result saved to tmp_deepseek_output.txt"
