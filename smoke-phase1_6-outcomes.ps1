# Phase 1.6 Smoke Test - Outcomes Screen API
# Prerequisites: Server running on port 3000, metrics config set, recompute run

$ErrorActionPreference = "Stop"
$BASE = "http://localhost:3000"
$passCount = 0
$totalTests = 0

function Test-Step {
    param([string]$Name, [ScriptBlock]$Test)
    $script:totalTests++
    Write-Host "`n[$script:totalTests] $Name" -ForegroundColor Cyan
    try {
        & $Test
        $script:passCount++
        Write-Host "[PASS]" -ForegroundColor Green
    } catch {
        Write-Host "[FAIL]: $_" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "PHASE 1.6 SMOKE TEST - OUTCOMES API" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Yellow

# Test 1: GET /outcomes/summary (default params)
Test-Step "GET /outcomes/summary (default)" {
    $r = Invoke-RestMethod -Method GET -Uri "$BASE/outcomes/summary" -Headers @{"x-api-key"="test"}
    if (-not $r.ok) { throw "Expected ok:true" }
    if ($r.windowDays -ne 30) { throw "Expected windowDays=30, got $($r.windowDays)" }
    if ($null -eq $r.kpis) { throw "Expected kpis object" }
    if ($null -eq $r.perAgent) { throw "Expected perAgent array" }
    Write-Host "  OK: windowDays=$($r.windowDays), assigned=$($r.kpis.assigned), closedWon=$($r.kpis.closedWon)" -ForegroundColor Gray
}

# Test 2: windowDays=7
Test-Step "GET /outcomes/summary?windowDays=7" {
    $r = Invoke-RestMethod -Method GET -Uri "$BASE/outcomes/summary?windowDays=7" -Headers @{"x-api-key"="test"}
    if ($r.windowDays -ne 7) { throw "Expected windowDays=7, got $($r.windowDays)" }
    Write-Host "  OK: windowDays=$($r.windowDays)" -ForegroundColor Gray
}

# Test 3: windowDays=90
Test-Step "GET /outcomes/summary?windowDays=90" {
    $r = Invoke-RestMethod -Method GET -Uri "$BASE/outcomes/summary?windowDays=90" -Headers @{"x-api-key"="test"}
    if ($r.windowDays -ne 90) { throw "Expected windowDays=90, got $($r.windowDays)" }
    Write-Host "  OK: windowDays=$($r.windowDays)" -ForegroundColor Gray
}

# Test 4: mode filter (accept but ignore in Phase 1)
Test-Step "GET /outcomes/summary?mode=auto" {
    $r = Invoke-RestMethod -Method GET -Uri "$BASE/outcomes/summary?mode=auto" -Headers @{"x-api-key"="test"}
    if (-not $r.ok) { throw "Expected ok:true" }
    Write-Host "  OK: mode=auto accepted (ignored in Phase 1)" -ForegroundColor Gray
}

# Test 5: boardId filter
Test-Step "GET /outcomes/summary?boardId=test_board_1" {
    $r = Invoke-RestMethod -Method GET -Uri "$BASE/outcomes/summary?boardId=test_board_1" -Headers @{"x-api-key"="test"}
    if (-not $r.ok) { throw "Expected ok:true" }
    Write-Host "  OK: boardId filter applied" -ForegroundColor Gray
}

# Test 6: Validate KPI structure
Test-Step "Validate KPI fields" {
    $r = Invoke-RestMethod -Method GET -Uri "$BASE/outcomes/summary" -Headers @{"x-api-key"="test"}
    $kpis = $r.kpis
    if ($null -eq $kpis.assigned) { throw "Missing kpis.assigned" }
    if ($null -eq $kpis.closedWon) { throw "Missing kpis.closedWon" }
    if ($null -eq $kpis.conversionRate) { throw "Missing kpis.conversionRate" }
    Write-Host "  OK: KPI structure valid" -ForegroundColor Gray
}

# Test 7: Validate perAgent structure
Test-Step "Validate perAgent array" {
    $r = Invoke-RestMethod -Method GET -Uri "$BASE/outcomes/summary" -Headers @{"x-api-key"="test"}
    if (-not ($r.perAgent -is [Array])) { throw "perAgent must be array" }
    if ($r.perAgent.Count -gt 0) {
        $agent = $r.perAgent[0]
        if ($null -eq $agent.agentUserId) { throw "Missing agentUserId" }
        if ($null -eq $agent.assigned) { throw "Missing assigned count" }
        if ($null -eq $agent.closedWon) { throw "Missing closedWon count" }
        if ($null -eq $agent.conversionRate) { throw "Missing conversionRate" }
        Write-Host "  OK: perAgent[0]: $($agent.agentName), assigned=$($agent.assigned)" -ForegroundColor Gray
    } else {
        Write-Host "  OK: perAgent array is empty (no data yet)" -ForegroundColor Gray
    }
}

# Test 8: Invalid windowDays
Test-Step "Reject invalid windowDays" {
    try {
        $r = Invoke-RestMethod -Method GET -Uri "$BASE/outcomes/summary?windowDays=999" -Headers @{"x-api-key"="test"} -ErrorAction Stop
        throw "Should have rejected windowDays=999"
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -ne 400) { throw "Expected 400 error, got $statusCode" }
        Write-Host "  OK: 400 error correctly returned" -ForegroundColor Gray
    }
}

Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "PHASE 1.6 SMOKE TEST RESULTS" -ForegroundColor Yellow
Write-Host "PASSED: $passCount / $totalTests" -ForegroundColor $(if($passCount -eq $totalTests){"Green"}else{"Red"})
Write-Host "========================================" -ForegroundColor Yellow

if ($passCount -eq $totalTests) {
    Write-Host "[SUCCESS] Phase 1.6 COMPLETE" -ForegroundColor Green
    exit 0
} else {
    Write-Host "[FAILED] Phase 1.6 INCOMPLETE" -ForegroundColor Red
    exit 1
}
