# ============================================
# PHASE 1.4 - EXECUTION MODES SMOKE TEST
# Tests AUTO and MANUAL_APPROVAL routing modes
# ============================================

$API_BASE = "http://localhost:3000"
$ErrorActionPreference = "Continue"

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "PHASE 1.4 - Execution Modes Smoke Test" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Pre-check: Server running on port 3000?
Write-Host "`n--- PRE-CHECK: Server on port 3000 ---" -ForegroundColor Yellow
try {
    $response = curl.exe -s -X GET "$API_BASE/health" 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($response)) {
        Write-Host "❌ FAIL: Server not responding on port 3000" -ForegroundColor Red
        exit 1
    }
    $json = $response | ConvertFrom-Json
    if ($json.ok -eq $true) {
        Write-Host "✅ Server is running on port 3000" -ForegroundColor Green
    } else {
        Write-Host "❌ FAIL: Server responded but health check failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ FAIL: Cannot connect to server or parse response" -ForegroundColor Red
    exit 1
}

# Test result tracking
$testResults = @()

function Test-Step {
    param(
        [string]$StepName,
        [scriptblock]$Action,
        [scriptblock]$Validate
    )
    
    Write-Host "`n--- $StepName ---" -ForegroundColor Yellow
    try {
        $result = & $Action
        if ($null -eq $result) {
            Write-Host "❌ ERROR: $StepName - Action returned null" -ForegroundColor Red
            $script:testResults += [PSCustomObject]@{
                Step = $StepName
                Status = "ERROR"
                Details = "Action returned null"
            }
            return $null
        }
        
        $validation = & $Validate $result
        
        if ($validation.Pass) {
            Write-Host "✅ PASS: $StepName" -ForegroundColor Green
            $script:testResults += [PSCustomObject]@{
                Step = $StepName
                Status = "PASS"
                Details = $validation.Message
            }
        } else {
            Write-Host "❌ FAIL: $StepName" -ForegroundColor Red
            Write-Host "  Expected: $($validation.Expected)" -ForegroundColor Yellow
            Write-Host "  Actual: $($validation.Actual)" -ForegroundColor Yellow
            $script:testResults += [PSCustomObject]@{
                Step = $StepName
                Status = "FAIL"
                Details = $validation.Message
            }
        }
        return $result
    } catch {
        Write-Host "❌ ERROR: $StepName - $($_.Exception.Message)" -ForegroundColor Red
        $script:testResults += [PSCustomObject]@{
            Step = $StepName
            Status = "ERROR"
            Details = $_.Exception.Message
        }
        return $null
    }
}

# ===== SETUP: Schema, Mapping, Rules, Enable =====
Write-Host "`n--- SETUP: Configuring routing ---" -ForegroundColor Yellow

curl.exe -s -X POST "$API_BASE/admin/schema" -H "Content-Type: application/json" --data-binary "@schema.json" | Out-Null
curl.exe -s -X POST "$API_BASE/admin/mapping" -H "Content-Type: application/json" --data-binary "@mapping.json" | Out-Null
curl.exe -s -X POST "$API_BASE/admin/rules" -H "Content-Type: application/json" --data-binary "@rules.json" | Out-Null
curl.exe -s -X POST "$API_BASE/admin/routing/enable" | Out-Null

Write-Host "Routing configured (schema, mapping, rules, enabled)" -ForegroundColor Green

# ===== STEP 1: GET routing settings (default) =====
$getSettingsDefault = Test-Step -StepName "STEP 1: GET /admin/routing/settings (default)" -Action {
    $response = curl.exe -s -X GET "$API_BASE/admin/routing/settings" 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($response)) {
        return $null
    }
    try {
        return $response | ConvertFrom-Json
    } catch {
        return $null
    }
} -Validate {
    param($json)
    if ($json.ok -eq $true -and $json.mode -eq "MANUAL_APPROVAL") {
        Write-Host "  Mode: $($json.mode)" -ForegroundColor DarkGray
        return @{ Pass = $true; Message = "Default mode is MANUAL_APPROVAL" }
    }
    return @{ Pass = $false; Expected = "ok:true, mode:'MANUAL_APPROVAL'"; Actual = "ok:$($json.ok), mode:$($json.mode)"; Message = "Unexpected default mode" }
}

# ===== STEP 2: POST routing settings (set AUTO) =====
$setAutoPayload = '{"mode":"AUTO"}'
$setAuto = Test-Step -StepName "STEP 2: POST /admin/routing/settings (AUTO)" -Action {
    $response = curl.exe -s -X POST "$API_BASE/admin/routing/settings" -H "Content-Type: application/json" -d $setAutoPayload 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($response)) {
        return $null
    }
    try {
        return $response | ConvertFrom-Json
    } catch {
        return $null
    }
} -Validate {
    param($json)
    if ($json.ok -eq $true -and $json.mode -eq "AUTO") {
        Write-Host "  Mode: $($json.mode)" -ForegroundColor DarkGray
        return @{ Pass = $true; Message = "Mode set to AUTO" }
    }
    return @{ Pass = $false; Expected = "ok:true, mode:'AUTO'"; Actual = "ok:$($json.ok), mode:$($json.mode)"; Message = "Failed to set AUTO mode" }
}

# ===== STEP 3: POST routing settings (set MANUAL_APPROVAL) =====
$setManualPayload = '{"mode":"MANUAL_APPROVAL"}'
$setManual = Test-Step -StepName "STEP 3: POST /admin/routing/settings (MANUAL_APPROVAL)" -Action {
    $response = curl.exe -s -X POST "$API_BASE/admin/routing/settings" -H "Content-Type: application/json" -d $setManualPayload 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($response)) {
        return $null
    }
    try {
        return $response | ConvertFrom-Json
    } catch {
        return $null
    }
} -Validate {
    param($json)
    if ($json.ok -eq $true -and $json.mode -eq "MANUAL_APPROVAL") {
        Write-Host "  Mode: $($json.mode)" -ForegroundColor DarkGray
        return @{ Pass = $true; Message = "Mode set to MANUAL_APPROVAL" }
    }
    return @{ Pass = $false; Expected = "ok:true, mode:'MANUAL_APPROVAL'"; Actual = "ok:$($json.ok), mode:$($json.mode)"; Message = "Failed to set MANUAL_APPROVAL mode" }
}

# ===== STEP 4: Execute in MANUAL_APPROVAL mode =====
$executeManual = Test-Step -StepName "STEP 4: POST /routing/execute (MANUAL_APPROVAL)" -Action {
    $response = curl.exe -s -X POST "$API_BASE/routing/execute" -H "Content-Type: application/json" --data-binary "@mock-preview.json" 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($response)) {
        return $null
    }
    try {
        return $response | ConvertFrom-Json
    } catch {
        return $null
    }
} -Validate {
    param($json)
    if ($json.ok -eq $true -and $json.mode -eq "manual_approval" -and $json.proposalId -ne $null -and $json.proposalStatus -eq "PROPOSED") {
        Write-Host "  Mode: $($json.mode)" -ForegroundColor DarkGray
        Write-Host "  ProposalId: $($json.proposalId)" -ForegroundColor DarkGray
        Write-Host "  ProposalStatus: $($json.proposalStatus)" -ForegroundColor DarkGray
        Write-Host "  MatchedRuleId: $($json.matchedRuleId)" -ForegroundColor DarkGray
        Write-Host "  AssignedTo: $($json.assignedTo)" -ForegroundColor DarkGray
        $script:Global_ProposalId = $json.proposalId
        return @{ Pass = $true; Message = "Proposal created in MANUAL_APPROVAL mode" }
    }
    return @{ Pass = $false; Expected = "ok:true, mode:'manual_approval', proposalStatus:'PROPOSED'"; Actual = "ok:$($json.ok), mode:$($json.mode), proposalStatus:$($json.proposalStatus)"; Message = "MANUAL_APPROVAL execute failed" }
}

# ===== STEP 5: GET proposals (verify proposal exists) =====
$getProposals = Test-Step -StepName "STEP 5: GET /manager/proposals" -Action {
    $response = curl.exe -s -X GET "$API_BASE/manager/proposals" 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($response)) {
        return $null
    }
    try {
        return $response | ConvertFrom-Json
    } catch {
        return $null
    }
} -Validate {
    param($json)
    if ($json.ok -eq $true -and $json.items -ne $null -and $json.items.Count -gt 0) {
        $proposal = $json.items | Where-Object { $_.id -eq $script:Global_ProposalId } | Select-Object -First 1
        if ($proposal -ne $null) {
            Write-Host "  Found proposal: $($proposal.id)" -ForegroundColor DarkGray
            Write-Host "  Status: $($proposal.status)" -ForegroundColor DarkGray
            return @{ Pass = $true; Message = "Proposal found in manager queue" }
        }
    }
    return @{ Pass = $false; Expected = "ok:true, items containing proposalId"; Actual = "items:$($json.items.Count)"; Message = "Proposal not found" }
}

# ===== STEP 6: Approve proposal (NOTE: May fail if Monday not connected - non-fatal) =====
$approveProposal = Test-Step -StepName "STEP 6: POST /manager/proposals/:id/approve (optional)" -Action {
    $response = curl.exe -s -X POST "$API_BASE/manager/proposals/$script:Global_ProposalId/approve" 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($response)) {
        return $null
    }
    try {
        return $response | ConvertFrom-Json
    } catch {
        return $null
    }
} -Validate {
    param($json)
    # Approval may fail if Monday not connected - we just verify the endpoint works
    if ($json.ok -eq $true) {
        Write-Host "  Approval succeeded (Monday connected)" -ForegroundColor DarkGray
        return @{ Pass = $true; Message = "Proposal approved successfully" }
    } elseif ($json.error -ne $null) {
        Write-Host "  Approval failed (expected if Monday not connected): $($json.error)" -ForegroundColor Yellow
        return @{ Pass = $true; Message = "Approval endpoint reachable (Monday writeback failed gracefully)" }
    }
    return @{ Pass = $false; Expected = "ok:true or graceful error"; Actual = "ok:$($json.ok)"; Message = "Unexpected approval response" }
}

# ===== STEP 7: Idempotency - repeat execute in MANUAL_APPROVAL mode =====
$executeManualRepeat = Test-Step -StepName "STEP 7: POST /routing/execute (MANUAL_APPROVAL - repeat)" -Action {
    $response = curl.exe -s -X POST "$API_BASE/routing/execute" -H "Content-Type: application/json" --data-binary "@mock-preview.json" 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($response)) {
        return $null
    }
    try {
        return $response | ConvertFrom-Json
    } catch {
        return $null
    }
} -Validate {
    param($json)
    if ($json.ok -eq $true -and $json.mode -eq "manual_approval" -and $json.proposalId -eq $script:Global_ProposalId) {
        Write-Host "  ProposalId: $($json.proposalId) (same as before)" -ForegroundColor DarkGray
        return @{ Pass = $true; Message = "Idempotent - same proposal returned" }
    }
    return @{ Pass = $false; Expected = "same proposalId"; Actual = "proposalId:$($json.proposalId)"; Message = "Idempotency check failed" }
}

# ===== STEP 8: Switch to AUTO mode =====
$setAutoForExecute = Test-Step -StepName "STEP 8: POST /admin/routing/settings (AUTO)" -Action {
    $response = curl.exe -s -X POST "$API_BASE/admin/routing/settings" -H "Content-Type: application/json" -d $setAutoPayload 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($response)) {
        return $null
    }
    try {
        return $response | ConvertFrom-Json
    } catch {
        return $null
    }
} -Validate {
    param($json)
    if ($json.ok -eq $true -and $json.mode -eq "AUTO") {
        return @{ Pass = $true; Message = "Mode set to AUTO" }
    }
    return @{ Pass = $false; Expected = "mode:AUTO"; Actual = "mode:$($json.mode)"; Message = "Failed to set AUTO mode" }
}

# ===== STEP 9: Execute in AUTO mode (may fail if Monday not connected - check response) =====
$executeAuto = Test-Step -StepName "STEP 9: POST /routing/execute (AUTO)" -Action {
    $response = curl.exe -s -X POST "$API_BASE/routing/execute" -H "Content-Type: application/json" --data-binary "@mock-preview.json" 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($response)) {
        return $null
    }
    try {
        return $response | ConvertFrom-Json
    } catch {
        return $null
    }
} -Validate {
    param($json)
    if ($json.ok -eq $true -and $json.mode -eq "auto" -and $json.writeback.attempted -eq $true) {
        Write-Host "  Mode: $($json.mode)" -ForegroundColor DarkGray
        Write-Host "  Writeback attempted: $($json.writeback.attempted)" -ForegroundColor DarkGray
        Write-Host "  Writeback success: $($json.writeback.success)" -ForegroundColor DarkGray
        if ($json.writeback.error) {
            Write-Host "  Writeback error: $($json.writeback.error)" -ForegroundColor Yellow
        }
        # Pass if writeback was attempted (success or graceful failure)
        return @{ Pass = $true; Message = "AUTO mode executed with writeback attempt" }
    }
    return @{ Pass = $false; Expected = "ok:true, mode:auto, writeback.attempted:true"; Actual = "ok:$($json.ok), mode:$($json.mode), writeback.attempted:$($json.writeback.attempted)"; Message = "AUTO execute failed" }
}

# ===== STEP 10: Verify no proposal created in AUTO mode =====
$getProposalsAuto = Test-Step -StepName "STEP 10: GET /manager/proposals (verify count unchanged)" -Action {
    $response = curl.exe -s -X GET "$API_BASE/manager/proposals" 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($response)) {
        return $null
    }
    try {
        return $response | ConvertFrom-Json
    } catch {
        return $null
    }
} -Validate {
    param($json)
    # Should have 1 proposal from MANUAL_APPROVAL mode, not more
    if ($json.ok -eq $true -and $json.items.Count -le 1) {
        Write-Host "  Proposals count: $($json.items.Count)" -ForegroundColor DarkGray
        return @{ Pass = $true; Message = "No new proposals created in AUTO mode" }
    }
    return @{ Pass = $false; Expected = "items count unchanged (<=1)"; Actual = "items:$($json.items.Count)"; Message = "Unexpected proposals in AUTO mode" }
}

# ===== STEP 11: Idempotency - repeat execute in AUTO mode =====
$executeAutoRepeat = Test-Step -StepName "STEP 11: POST /routing/execute (AUTO - repeat)" -Action {
    $response = curl.exe -s -X POST "$API_BASE/routing/execute" -H "Content-Type: application/json" --data-binary "@mock-preview.json" 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($response)) {
        return $null
    }
    try {
        return $response | ConvertFrom-Json
    } catch {
        return $null
    }
} -Validate {
    param($json)
    if ($json.ok -eq $true -and $json.mode -eq "auto" -and $json.idempotent -eq $true) {
        Write-Host "  Idempotent: $($json.idempotent)" -ForegroundColor DarkGray
        Write-Host "  Writeback attempted: $($json.writeback.attempted)" -ForegroundColor DarkGray
        return @{ Pass = $true; Message = "AUTO mode idempotency preserved" }
    }
    return @{ Pass = $false; Expected = "ok:true, mode:auto, idempotent:true"; Actual = "ok:$($json.ok), idempotent:$($json.idempotent)"; Message = "AUTO idempotency check failed" }
}

# ===== STEP 12: Validation - direct lead format in AUTO mode (should reject) =====
$executeAutoDirectLead = Test-Step -StepName "STEP 12: POST /routing/execute (AUTO + direct lead - expect 400)" -Action {
    $response = curl.exe -s -w "`nHTTP_CODE:%{http_code}" -X POST "$API_BASE/routing/execute" -H "Content-Type: application/json" --data-binary "@direct-lead.json" 2>&1
    $httpCode = 0
    $body = ""
    if ($response -match "HTTP_CODE:(\d+)") {
        $httpCode = [int]$Matches[1]
        $body = $response -replace "HTTP_CODE:\d+", ""
    }
    try {
        return @{ StatusCode = $httpCode; Body = ($body | ConvertFrom-Json) }
    } catch {
        return @{ StatusCode = $httpCode; Body = $null }
    }
} -Validate {
    param($result)
    if ($result.StatusCode -eq 400 -and $result.Body.ok -eq $false -and $result.Body.error -match "AUTO.*requires.*boardId") {
        Write-Host "  Validation error: $($result.Body.error)" -ForegroundColor DarkGray
        return @{ Pass = $true; Message = "Direct lead rejected in AUTO mode as expected" }
    }
    return @{ Pass = $false; Expected = "HTTP 400 with boardId error"; Actual = "HTTP $($result.StatusCode), error:$($result.Body.error)"; Message = "Validation check failed" }
}

# ===== CLEANUP: Reset mode to MANUAL_APPROVAL =====
Write-Host "`n--- CLEANUP: Resetting mode to MANUAL_APPROVAL ---" -ForegroundColor Yellow
curl.exe -s -X POST "$API_BASE/admin/routing/settings" -H "Content-Type: application/json" -d $setManualPayload | Out-Null

# ===== SUMMARY =====
Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "SMOKE TEST RESULTS" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$testResults | Format-Table -AutoSize

$passCount = ($testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failCount = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count
$errorCount = ($testResults | Where-Object { $_.Status -eq "ERROR" }).Count
$totalCount = $testResults.Count

Write-Host "`nSummary: $passCount PASS, $failCount FAIL, $errorCount ERROR (Total: $totalCount)" -ForegroundColor $(if ($failCount -eq 0 -and $errorCount -eq 0) { "Green" } else { "Red" })

if ($failCount -eq 0 -and $errorCount -eq 0) {
    Write-Host "`n✅ ALL TESTS PASSED - Phase 1.4 Execution Modes VERIFIED" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n❌ SOME TESTS FAILED - Review output above" -ForegroundColor Red
    exit 1
}

