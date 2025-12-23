# ============================================
# PHASE 1.3 - EXECUTE-LITE SMOKE TEST
# Lead In → Evaluate → Decision → Audit (NO Monday)
# ============================================

$API_BASE = "http://localhost:3000"
$ErrorActionPreference = "Continue"

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "PHASE 1.3 - Execute-Lite Smoke Test" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Pre-check: Server running on port 3000?
Write-Host "`n--- PRE-CHECK: Server on port 3000 ---" -ForegroundColor Yellow
try {
    $response = curl.exe -s -X GET "$API_BASE/health" 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($response)) {
        Write-Host "❌ FAIL: Server not responding on port 3000" -ForegroundColor Red
        Write-Host "`nTo check what's using port 3000:" -ForegroundColor Yellow
        Write-Host "  Get-NetTCPConnection -LocalPort 3000 | Select-Object OwningProcess" -ForegroundColor DarkGray
        Write-Host "`nTo kill process on port 3000:" -ForegroundColor Yellow
        Write-Host "  `$pid = (Get-NetTCPConnection -LocalPort 3000).OwningProcess" -ForegroundColor DarkGray
        Write-Host "  Stop-Process -Id `$pid -Force" -ForegroundColor DarkGray
        Write-Host "`nStart server with: npm run dev" -ForegroundColor Yellow
        exit 1
    }
    $json = $response | ConvertFrom-Json
    if ($json.ok -eq $true) {
        Write-Host "✅ Server is running on port 3000" -ForegroundColor Green
    } else {
        Write-Host "❌ FAIL: Server responded but health check failed" -ForegroundColor Red
        Write-Host "Response: $response" -ForegroundColor DarkGray
        exit 1
    }
} catch {
    Write-Host "❌ FAIL: Cannot connect to server or parse response" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
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

# ===== STEP A: POST Schema =====
$schemaResult = Test-Step -StepName "STEP A: POST /admin/schema" -Action {
    $response = curl.exe -s -X POST "$API_BASE/admin/schema" -H "Content-Type: application/json" --data-binary "@schema.json" 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($response)) {
        Write-Host "curl failed or returned empty response" -ForegroundColor Red
        Write-Host "Response: $response" -ForegroundColor DarkGray
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
    if ($json.ok -eq $true -and $json.version -ge 1) {
        Write-Host "  Schema version: $($json.version)" -ForegroundColor DarkGray
        return @{ Pass = $true; Message = "Schema created v$($json.version)" }
    }
    return @{ Pass = $false; Expected = "ok:true, version>=1"; Actual = "ok:$($json.ok), version:$($json.version)"; Message = "Schema creation failed" }
}

# ===== STEP B: POST Mapping =====
$mappingResult = Test-Step -StepName "STEP B: POST /admin/mapping" -Action {
    $response = curl.exe -s -X POST "$API_BASE/admin/mapping" -H "Content-Type: application/json" --data-binary "@mapping.json" 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($response)) {
        Write-Host "curl failed or returned empty response" -ForegroundColor Red
        Write-Host "Response: $response" -ForegroundColor DarkGray
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
    if ($json.ok -eq $true -and $json.version -ge 1) {
        Write-Host "  Mapping version: $($json.version)" -ForegroundColor DarkGray
        return @{ Pass = $true; Message = "Mapping created v$($json.version)" }
    }
    return @{ Pass = $false; Expected = "ok:true, version>=1"; Actual = "ok:$($json.ok), version:$($json.version)"; Message = "Mapping creation failed" }
}

# ===== STEP C: POST Rules =====
$rulesPayload = @'
{
  "version": 1,
  "updatedAt": "2025-12-22T00:00:00.000Z",
  "rules": [{
    "id": "rule_1",
    "name": "Test Rule",
    "priority": 100,
    "enabled": true,
    "when": [],
    "then": {"type": "assign_agent_id", "value": "agent_123"}
  }]
}
'@

$rulesResult = Test-Step -StepName "STEP C: POST /admin/rules" -Action {
    $response = curl.exe -s -X POST "$API_BASE/admin/rules" -H "Content-Type: application/json" --data-binary "@rules.json" 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($response)) {
        Write-Host "curl failed or returned empty response" -ForegroundColor Red
        Write-Host "Response: $response" -ForegroundColor DarkGray
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
    if ($json.ok -eq $true -and $json.version -ge 1) {
        Write-Host "  Rules version: $($json.version)" -ForegroundColor DarkGray
        return @{ Pass = $true; Message = "Rules created v$($json.version)" }
    }
    return @{ Pass = $false; Expected = "ok:true, version>=1"; Actual = "ok:$($json.ok), version:$($json.version)"; Message = "Rules creation failed" }
}

# ===== STEP D: Enable Routing =====
$enableResult = Test-Step -StepName "STEP D: POST /admin/routing/enable" -Action {
    $response = curl.exe -s -X POST "$API_BASE/admin/routing/enable" 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($response)) {
        Write-Host "curl failed or returned empty response" -ForegroundColor Red
        Write-Host "Response: $response" -ForegroundColor DarkGray
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
    if ($json.enabled -eq $true -and $json.state.schemaVersion -ne $null -and $json.state.mappingVersion -ne $null -and $json.state.rulesVersion -ne $null) {
        Write-Host "  Snapshot: schema=$($json.state.schemaVersion), mapping=$($json.state.mappingVersion), rules=$($json.state.rulesVersion)" -ForegroundColor DarkGray
        return @{ Pass = $true; Message = "Routing enabled with snapshot" }
    }
    return @{ Pass = $false; Expected = "enabled:true with all versions"; Actual = "enabled:$($json.enabled)"; Message = "Routing enable failed" }
}

$pinnedSchema = if ($enableResult) { $enableResult.state.schemaVersion } else { $null }
$pinnedMapping = if ($enableResult) { $enableResult.state.mappingVersion } else { $null }
$pinnedRules = if ($enableResult) { $enableResult.state.rulesVersion } else { $null }

# ===== STEP E: Execute (Enabled - Pinned) =====
$executeEnabledResult = Test-Step -StepName "STEP E: POST /routing/execute (ENABLED)" -Action {
    $response = curl.exe -s -X POST "$API_BASE/routing/execute" -H "Content-Type: application/json" --data-binary "@mock-preview.json" 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($response)) {
        Write-Host "curl failed or returned empty response" -ForegroundColor Red
        Write-Host "Response: $response" -ForegroundColor DarkGray
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
    $pass = $json.ok -eq $true -and $json.mode -eq "execute_lite" -and $json.matchedRuleId -eq "rule_1" -and $json.assignedTo -eq "agent_123" -and $json.effectiveVersions.source -eq "pinned" -and $json.input.source -eq "mock_item"
    
    Write-Host "  ok: $($json.ok)" -ForegroundColor DarkGray
    Write-Host "  mode: $($json.mode)" -ForegroundColor DarkGray
    Write-Host "  matchedRuleId: $($json.matchedRuleId)" -ForegroundColor DarkGray
    Write-Host "  assignedTo: $($json.assignedTo)" -ForegroundColor DarkGray
    Write-Host "  effectiveVersions.source: $($json.effectiveVersions.source)" -ForegroundColor DarkGray
    Write-Host "  input.source: $($json.input.source)" -ForegroundColor DarkGray
    
    if ($pass) {
        return @{ Pass = $true; Message = "Execute-lite with pinned versions" }
    }
    return @{ Pass = $false; Expected = "ok:true, mode:'execute_lite', matchedRuleId:'rule_1', assignedTo:'agent_123', source:'pinned', input:'mock_item'"; Actual = "ok:$($json.ok), mode:'$($json.mode)', matchedRuleId:'$($json.matchedRuleId)', assignedTo:'$($json.assignedTo)', source:'$($json.effectiveVersions.source)', input:'$($json.input.source)'"; Message = "Execute response mismatch" }
}

# ===== STEP F: Disable Routing =====
$disableResult = Test-Step -StepName "STEP F: POST /admin/routing/disable" -Action {
    $response = curl.exe -s -X POST "$API_BASE/admin/routing/disable" 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($response)) {
        Write-Host "curl failed or returned empty response" -ForegroundColor Red
        Write-Host "Response: $response" -ForegroundColor DarkGray
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
    if ($json.enabled -eq $false) {
        Write-Host "  Routing disabled" -ForegroundColor DarkGray
        return @{ Pass = $true; Message = "Routing disabled" }
    }
    return @{ Pass = $false; Expected = "enabled:false"; Actual = "enabled:$($json.enabled)"; Message = "Disable failed" }
}

# ===== STEP G: Execute (Disabled - Latest) =====
$executeDisabledResult = Test-Step -StepName "STEP G: POST /routing/execute (DISABLED)" -Action {
    $response = curl.exe -s -X POST "$API_BASE/routing/execute" -H "Content-Type: application/json" --data-binary "@mock-preview.json" 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($response)) {
        Write-Host "curl failed or returned empty response" -ForegroundColor Red
        Write-Host "Response: $response" -ForegroundColor DarkGray
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
    $pass = $json.ok -eq $true -and $json.mode -eq "execute_lite" -and $json.matchedRuleId -eq "rule_1" -and $json.assignedTo -eq "agent_123" -and $json.effectiveVersions.source -eq "latest"
    
    Write-Host "  ok: $($json.ok)" -ForegroundColor DarkGray
    Write-Host "  mode: $($json.mode)" -ForegroundColor DarkGray
    Write-Host "  matchedRuleId: $($json.matchedRuleId)" -ForegroundColor DarkGray
    Write-Host "  assignedTo: $($json.assignedTo)" -ForegroundColor DarkGray
    Write-Host "  effectiveVersions.source: $($json.effectiveVersions.source)" -ForegroundColor DarkGray
    
    if ($pass) {
        return @{ Pass = $true; Message = "Execute-lite with latest versions" }
    }
    return @{ Pass = $false; Expected = "ok:true, mode:'execute_lite', matchedRuleId:'rule_1', assignedTo:'agent_123', source:'latest'"; Actual = "ok:$($json.ok), mode:'$($json.mode)', matchedRuleId:'$($json.matchedRuleId)', assignedTo:'$($json.assignedTo)', source:'$($json.effectiveVersions.source)'"; Message = "Execute response mismatch" }
}

# ===== STEP H: Execute (Direct Lead) =====
$directLeadPayload = '{ "lead": { "industry": "Healthcare" } }'

$executeDirectResult = Test-Step -StepName "STEP H: POST /routing/execute (Direct Lead)" -Action {
    $response = curl.exe -s -X POST "$API_BASE/routing/execute" -H "Content-Type: application/json" --data-binary "@direct-lead.json" 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($response)) {
        Write-Host "curl failed or returned empty response" -ForegroundColor Red
        Write-Host "Response: $response" -ForegroundColor DarkGray
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
    $pass = $json.ok -eq $true -and $json.mode -eq "execute_lite" -and $json.input.source -eq "direct_lead"
    
    Write-Host "  ok: $($json.ok)" -ForegroundColor DarkGray
    Write-Host "  mode: $($json.mode)" -ForegroundColor DarkGray
    Write-Host "  input.source: $($json.input.source)" -ForegroundColor DarkGray
    
    if ($pass) {
        return @{ Pass = $true; Message = "Direct lead format accepted" }
    }
    return @{ Pass = $false; Expected = "ok:true, mode:'execute_lite', input.source:'direct_lead'"; Actual = "ok:$($json.ok), mode:'$($json.mode)', input.source:'$($json.input.source)'"; Message = "Direct lead response mismatch" }
}

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
    Write-Host "`n✅ ALL TESTS PASSED - Phase 1.3 Execute-Lite VERIFIED" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n❌ SOME TESTS FAILED - Review output above" -ForegroundColor Red
    exit 1
}

