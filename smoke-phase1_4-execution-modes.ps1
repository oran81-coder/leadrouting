# ============================================
# PHASE 1.4 - EXECUTION MODES SMOKE TEST
# AUTO + MANUAL_APPROVAL routing modes
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

# ===== STEP 0: Enable routing (required for mode branching) =====
$enableResult = Test-Step -StepName "STEP 0: POST /admin/routing/enable" -Action {
    $response = curl.exe -s -X POST "$API_BASE/admin/routing/enable" 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($response)) {
        Write-Host "curl failed or returned empty response" -ForegroundColor Red
        return $null
    }
    try {
        return $response | ConvertFrom-Json
    } catch {
        Write-Host "Failed to parse JSON response" -ForegroundColor Red
        return $null
    }
} -Validate {
    param($json)
    if ($json.ok -eq $true -and $json.enabled -eq $true) {
        Write-Host "  Routing enabled" -ForegroundColor DarkGray
        return @{ Pass = $true; Message = "Routing enabled" }
    }
    return @{ Pass = $false; Expected = "ok:true, enabled:true"; Actual = "ok:$($json.ok), enabled:$($json.enabled)"; Message = "Enable failed" }
}

# ===== STEP A: GET routing mode (current state) =====
$settingsResult = Test-Step -StepName "STEP A: GET /admin/routing/settings" -Action {
    $response = curl.exe -s -X GET "$API_BASE/admin/routing/settings" 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($response)) {
        Write-Host "curl failed or returned empty response" -ForegroundColor Red
        return $null
    }
    try {
        return $response | ConvertFrom-Json
    } catch {
        Write-Host "Failed to parse JSON response" -ForegroundColor Red
        Write-Host "Raw response: $response" -ForegroundColor DarkGray
        return $null
    }
} -Validate {
    param($json)
    if ($json.ok -eq $true -and ($json.mode -eq "MANUAL_APPROVAL" -or $json.mode -eq "AUTO")) {
        Write-Host "  Mode: $($json.mode)" -ForegroundColor DarkGray
        return @{ Pass = $true; Message = "Settings endpoint works, mode=$($json.mode)" }
    }
    return @{ Pass = $false; Expected = "ok:true, mode: AUTO or MANUAL_APPROVAL"; Actual = "ok:$($json.ok), mode:$($json.mode)"; Message = "Settings endpoint failed" }
}

# ===== STEP 1: Re-enable routing (ensure it's on) =====
$reEnableResult = Test-Step -StepName "STEP 1: POST /admin/routing/enable (re-enable)" -Action {
    $response = curl.exe -s -X POST "$API_BASE/admin/routing/enable" 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($response)) {
        Write-Host "curl failed or returned empty response" -ForegroundColor Red
        return $null
    }
    try {
        return $response | ConvertFrom-Json
    } catch {
        Write-Host "Failed to parse JSON response" -ForegroundColor Red
        return $null
    }
} -Validate {
    param($json)
    if ($json.ok -eq $true -and $json.enabled -eq $true) {
        Write-Host "  Routing re-enabled" -ForegroundColor DarkGray
        return @{ Pass = $true; Message = "Routing re-enabled" }
    }
    return @{ Pass = $false; Expected = "ok:true, enabled:true"; Actual = "ok:$($json.ok), enabled:$($json.enabled)"; Message = "Re-enable failed" }
}

# ===== STEP B: POST routing mode to MANUAL_APPROVAL (explicit) =====
$setManualResult = Test-Step -StepName "STEP B: POST /admin/routing/settings (MANUAL)" -Action {
    $response = curl.exe -s -X POST "$API_BASE/admin/routing/settings" -H "Content-Type: application/json" --data-binary "@mode-manual.json" 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($response)) {
        Write-Host "curl failed or returned empty response" -ForegroundColor Red
        return $null
    }
    try {
        return $response | ConvertFrom-Json
    } catch {
        Write-Host "Failed to parse JSON response" -ForegroundColor Red
        return $null
    }
} -Validate {
    param($json)
    if ($json.ok -eq $true -and $json.mode -eq "MANUAL_APPROVAL") {
        Write-Host "  Mode set to: $($json.mode)" -ForegroundColor DarkGray
        return @{ Pass = $true; Message = "Mode set to MANUAL_APPROVAL" }
    }
    return @{ Pass = $false; Expected = "ok:true, mode:MANUAL_APPROVAL"; Actual = "ok:$($json.ok), mode:$($json.mode)"; Message = "Set mode failed" }
}

# ===== STEP C: Execute in MANUAL mode (first call) =====
$executeManualFirst = Test-Step -StepName "STEP C: POST /routing/execute (MANUAL - first)" -Action {
    $response = curl.exe -s -X POST "$API_BASE/routing/execute" -H "Content-Type: application/json" --data-binary "@mock-preview.json" 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($response)) {
        Write-Host "curl failed or returned empty response" -ForegroundColor Red
        return $null
    }
    try {
        return $response | ConvertFrom-Json
    } catch {
        Write-Host "Failed to parse JSON response" -ForegroundColor Red
        return $null
    }
} -Validate {
    param($json)
    if ($json.ok -eq $true -and $json.mode -eq "manual_approval" -and $json.proposalId -and $json.proposalStatus -eq "PROPOSED") {
        Write-Host "  ProposalId: $($json.proposalId)" -ForegroundColor DarkGray
        Write-Host "  Status: $($json.proposalStatus)" -ForegroundColor DarkGray
        Write-Host "  MatchedRuleId: $($json.matchedRuleId)" -ForegroundColor DarkGray
        Write-Host "  AssignedTo: $($json.assignedTo)" -ForegroundColor DarkGray
        return @{ Pass = $true; Message = "Proposal created in MANUAL mode" }
    }
    return @{ Pass = $false; Expected = "ok:true, mode:manual_approval, proposalId present, proposalStatus:PROPOSED"; Actual = "ok:$($json.ok), mode:$($json.mode), proposalId:$($json.proposalId), status:$($json.proposalStatus)"; Message = "Manual execute failed" }
}

# Store proposalId for later
$proposalId = if ($executeManualFirst) { $executeManualFirst.proposalId } else { $null }
Write-Host "[DEBUG] Stored proposalId: $proposalId" -ForegroundColor Magenta

# ===== STEP D: Execute in MANUAL mode (repeat - idempotency) =====
$executeManualRepeat = Test-Step -StepName "STEP D: POST /routing/execute (MANUAL - repeat)" -Action {
    $response = curl.exe -s -X POST "$API_BASE/routing/execute" -H "Content-Type: application/json" --data-binary "@mock-preview.json" 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($response)) {
        Write-Host "curl failed or returned empty response" -ForegroundColor Red
        return $null
    }
    try {
        return $response | ConvertFrom-Json
    } catch {
        Write-Host "Failed to parse JSON response" -ForegroundColor Red
        return $null
    }
} -Validate {
    param($json)
    if ($json.ok -eq $true -and $json.proposalId -eq $proposalId) {
        Write-Host "  Same ProposalId: $($json.proposalId)" -ForegroundColor DarkGray
        return @{ Pass = $true; Message = "Idempotent - same proposal returned" }
    }
    return @{ Pass = $false; Expected = "Same proposalId as first call"; Actual = "proposalId:$($json.proposalId)"; Message = "Idempotency check failed" }
}

# ===== STEP E: Verify proposal exists via GET /manager/proposals =====
$proposalsResult = Test-Step -StepName "STEP E: GET /manager/proposals" -Action {
    $response = curl.exe -s -X GET "$API_BASE/manager/proposals?status=PROPOSED" 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($response)) {
        Write-Host "curl failed or returned empty response" -ForegroundColor Red
        return $null
    }
    try {
        return $response | ConvertFrom-Json
    } catch {
        Write-Host "Failed to parse JSON response" -ForegroundColor Red
        return $null
    }
} -Validate {
    param($json)
    if ($json.ok -eq $true -and $json.items -and $json.items.Count -gt 0) {
        $found = $json.items | Where-Object { $_.id -eq $proposalId }
        if ($found) {
            Write-Host "  Found proposal: $($found.id)" -ForegroundColor DarkGray
            return @{ Pass = $true; Message = "Proposal found in list" }
        }
    }
    return @{ Pass = $false; Expected = "Proposal $proposalId in list"; Actual = "Not found or list empty"; Message = "Proposal not found" }
}

# ===== STEP F: Set AUTO mode =====
$setAutoResult = Test-Step -StepName "STEP F: POST /admin/routing/settings (AUTO)" -Action {
    $response = curl.exe -s -X POST "$API_BASE/admin/routing/settings" -H "Content-Type: application/json" --data-binary "@mode-auto.json" 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($response)) {
        Write-Host "curl failed or returned empty response" -ForegroundColor Red
        return $null
    }
    try {
        return $response | ConvertFrom-Json
    } catch {
        Write-Host "Failed to parse JSON response" -ForegroundColor Red
        return $null
    }
} -Validate {
    param($json)
    if ($json.ok -eq $true -and $json.mode -eq "AUTO") {
        Write-Host "  Mode set to: $($json.mode)" -ForegroundColor DarkGray
        return @{ Pass = $true; Message = "Mode set to AUTO" }
    }
    return @{ Pass = $false; Expected = "ok:true, mode:AUTO"; Actual = "ok:$($json.ok), mode:$($json.mode)"; Message = "Set AUTO mode failed" }
}

# ===== STEP G: Execute in AUTO mode (first call) =====
$executeAutoFirst = Test-Step -StepName "STEP G: POST /routing/execute (AUTO - first)" -Action {
    $response = curl.exe -s -X POST "$API_BASE/routing/execute" -H "Content-Type: application/json" --data-binary "@mock-preview.json" 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($response)) {
        Write-Host "curl failed or returned empty response" -ForegroundColor Red
        return $null
    }
    try {
        return $response | ConvertFrom-Json
    } catch {
        Write-Host "Failed to parse JSON response" -ForegroundColor Red
        return $null
    }
} -Validate {
    param($json)
    if ($json.ok -eq $true -and $json.mode -eq "auto" -and $json.applied -eq $true -and $json.writeback.attempted -eq $false -and $json.writeback.reason -eq "disabled_in_phase1_4") {
        Write-Host "  Mode: $($json.mode)" -ForegroundColor DarkGray
        Write-Host "  Applied: $($json.applied)" -ForegroundColor DarkGray
        Write-Host "  Writeback attempted: $($json.writeback.attempted)" -ForegroundColor DarkGray
        Write-Host "  Writeback reason: $($json.writeback.reason)" -ForegroundColor DarkGray
        Write-Host "  MatchedRuleId: $($json.matchedRuleId)" -ForegroundColor DarkGray
        Write-Host "  AssignedTo: $($json.assignedTo)" -ForegroundColor DarkGray
        return @{ Pass = $true; Message = "AUTO mode applied (writeback disabled)" }
    }
    return @{ Pass = $false; Expected = "ok:true, mode:auto, applied:true, writeback.attempted:false"; Actual = "ok:$($json.ok), mode:$($json.mode), applied:$($json.applied), writeback.attempted:$($json.writeback.attempted)"; Message = "AUTO execute failed" }
}

# ===== STEP H: Execute in AUTO mode (repeat - idempotency) =====
$executeAutoRepeat = Test-Step -StepName "STEP H: POST /routing/execute (AUTO - repeat)" -Action {
    $response = curl.exe -s -X POST "$API_BASE/routing/execute" -H "Content-Type: application/json" --data-binary "@mock-preview.json" 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($response)) {
        Write-Host "curl failed or returned empty response" -ForegroundColor Red
        return $null
    }
    try {
        return $response | ConvertFrom-Json
    } catch {
        Write-Host "Failed to parse JSON response" -ForegroundColor Red
        return $null
    }
} -Validate {
    param($json)
    if ($json.ok -eq $true -and $json.mode -eq "auto" -and $json.idempotent -eq $true) {
        Write-Host "  Idempotent: $($json.idempotent)" -ForegroundColor DarkGray
        return @{ Pass = $true; Message = "AUTO mode idempotent" }
    }
    return @{ Pass = $false; Expected = "ok:true, mode:auto, idempotent:true"; Actual = "ok:$($json.ok), mode:$($json.mode), idempotent:$($json.idempotent)"; Message = "AUTO idempotency failed" }
}

# ===== STEP I: Validation - AUTO rejects direct lead format =====
$validateAutoReject = Test-Step -StepName "STEP I: Validation - AUTO rejects direct lead" -Action {
    $response = curl.exe -s -X POST "$API_BASE/routing/execute" -H "Content-Type: application/json" --data-binary "@direct-lead.json" 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($response)) {
        Write-Host "curl failed or returned empty response" -ForegroundColor Red
        return $null
    }
    try {
        return $response | ConvertFrom-Json
    } catch {
        Write-Host "Failed to parse JSON response" -ForegroundColor Red
        return $null
    }
} -Validate {
    param($json)
    if ($json.ok -eq $false -and $json.error -like "*AUTO mode requires*") {
        Write-Host "  Error (expected): $($json.error)" -ForegroundColor DarkGray
        return @{ Pass = $true; Message = "AUTO mode correctly rejected direct lead format" }
    }
    return @{ Pass = $false; Expected = "ok:false with error about AUTO mode requiring item format"; Actual = "ok:$($json.ok), error:$($json.error)"; Message = "Validation failed" }
}

# ===== STEP J: Validation - Invalid mode rejected =====
$validateInvalidMode = Test-Step -StepName "STEP J: Validation - Invalid mode rejected" -Action {
    $response = curl.exe -s -X POST "$API_BASE/admin/routing/settings" -H "Content-Type: application/json" --data-binary "@mode-invalid.json" 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($response)) {
        Write-Host "curl failed or returned empty response" -ForegroundColor Red
        return $null
    }
    try {
        return $response | ConvertFrom-Json
    } catch {
        Write-Host "Failed to parse JSON response" -ForegroundColor Red
        return $null
    }
} -Validate {
    param($json)
    if ($json.ok -eq $false -and $json.error -like "*Invalid mode*") {
        Write-Host "  Error (expected): $($json.error)" -ForegroundColor DarkGray
        return @{ Pass = $true; Message = "Invalid mode correctly rejected" }
    }
    return @{ Pass = $false; Expected = "ok:false with error about invalid mode"; Actual = "ok:$($json.ok), error:$($json.error)"; Message = "Invalid mode validation failed" }
}

# ===== STEP K: Phase 1.3 backward compatibility - disable routing =====
$disableResult = Test-Step -StepName "STEP K: POST /admin/routing/disable" -Action {
    $response = curl.exe -s -X POST "$API_BASE/admin/routing/disable" 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($response)) {
        Write-Host "curl failed or returned empty response" -ForegroundColor Red
        return $null
    }
    try {
        return $response | ConvertFrom-Json
    } catch {
        Write-Host "Failed to parse JSON response" -ForegroundColor Red
        return $null
    }
} -Validate {
    param($json)
    if ($json.ok -eq $true -and $json.enabled -eq $false) {
        Write-Host "  Routing disabled" -ForegroundColor DarkGray
        return @{ Pass = $true; Message = "Routing disabled" }
    }
    return @{ Pass = $false; Expected = "ok:true, enabled:false"; Actual = "ok:$($json.ok), enabled:$($json.enabled)"; Message = "Disable failed" }
}

# ===== STEP L: Phase 1.3 backward compatibility - execute with direct lead =====
$executeLiteResult = Test-Step -StepName "STEP L: POST /routing/execute (execute-lite)" -Action {
    $response = curl.exe -s -X POST "$API_BASE/routing/execute" -H "Content-Type: application/json" --data-binary "@direct-lead.json" 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($response)) {
        Write-Host "curl failed or returned empty response" -ForegroundColor Red
        return $null
    }
    try {
        return $response | ConvertFrom-Json
    } catch {
        Write-Host "Failed to parse JSON response" -ForegroundColor Red
        return $null
    }
} -Validate {
    param($json)
    if ($json.ok -eq $true -and $json.mode -eq "execute_lite") {
        Write-Host "  Mode: $($json.mode)" -ForegroundColor DarkGray
        Write-Host "  Direct lead format accepted" -ForegroundColor DarkGray
        return @{ Pass = $true; Message = "Phase 1.3 execute-lite behavior preserved" }
    }
    return @{ Pass = $false; Expected = "ok:true, mode:execute_lite"; Actual = "ok:$($json.ok), mode:$($json.mode)"; Message = "Execute-lite failed" }
}

# ===== CLEANUP: Reset mode to MANUAL_APPROVAL for Phase 1.3 compat =====
Write-Host "`n--- CLEANUP: Resetting mode to MANUAL_APPROVAL ---" -ForegroundColor Yellow
curl.exe -s -X POST "$API_BASE/admin/routing/settings" -H "Content-Type: application/json" --data-binary "@mode-manual.json" | Out-Null

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

