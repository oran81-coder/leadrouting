Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "STEP 5: APPROVE PROPOSAL VIA MANAGER API" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Get all proposals
Write-Host "📋 Fetching proposals..." -ForegroundColor Yellow
$proposals = Invoke-RestMethod -Uri "http://localhost:3000/manager/proposals" -Method GET -Headers @{"X-API-Key"="dev_key_12345"}

Write-Host "Found $($proposals.proposals.Count) proposals" -ForegroundColor Gray
Write-Host ""

if ($proposals.proposals.Count -gt 0) {
  $proposal = $proposals.proposals[0]
  Write-Host "Latest Proposal:" -ForegroundColor Cyan
  Write-Host "  ID: $($proposal.id)" -ForegroundColor White
  Write-Host "  Status: $($proposal.status)" -ForegroundColor White
  Write-Host "  Board: $($proposal.boardId), Item: $($proposal.itemId)" -ForegroundColor Gray
  
  $action = $proposal.action | ConvertFrom-Json
  Write-Host "  Recommended Agent: $($action.agentName) ($($action.value))" -ForegroundColor Yellow
  Write-Host "  Score: $($action.score)/100" -ForegroundColor Yellow
  Write-Host ""
  
  # Approve it
  Write-Host "✅ Approving proposal..." -ForegroundColor Green
  $approveBody = @{
    decidedBy = "manager_test"
    notes = "Approved via test flow"
  } | ConvertTo-Json
  
  try {
    $approved = Invoke-RestMethod -Uri "http://localhost:3000/manager/proposals/$($proposal.id)/approve" -Method POST -Body $approveBody -ContentType "application/json" -Headers @{"X-API-Key"="dev_key_12345"}
    
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "✅ PROPOSAL APPROVED!" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "New Status: $($approved.proposal.status)" -ForegroundColor Yellow
    Write-Host "Approved By: $($approved.proposal.decidedBy)" -ForegroundColor Yellow
    Write-Host "Approved At: $($approved.proposal.decidedAt)" -ForegroundColor Yellow
    
  } catch {
    Write-Host "❌ Error approving: $($_.Exception.Message)" -ForegroundColor Red
  }
} else {
  Write-Host "❌ No proposals found" -ForegroundColor Red
}

