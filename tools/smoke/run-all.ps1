# tools\smoke\run-all.ps1
# ============================================
# SMOKE TEST ORCHESTRATOR - Phase 1.3 + 1.4 + 1.5
# Runs all phases sequentially on their respective tags/branches
# Compatible with PowerShell 5.1 and 7.x on Windows
# ============================================

$ErrorActionPreference = "Stop"
$Global:FAILURES = 0
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$REPO_ROOT = Join-Path $SCRIPT_DIR "..\.."
$OUT_DIR = Join-Path $SCRIPT_DIR "out"

# Create output directory
New-Item -ItemType Directory -Path $OUT_DIR -Force | Out-Null

function Write-Header {
    param([string]$Message)
    Write-Host "`n============================================" -ForegroundColor Cyan
    Write-Host $Message -ForegroundColor Cyan
    Write-Host "============================================`n" -ForegroundColor Cyan
}

function Kill-ProcessOnPort {
    param([int]$Port)
    Write-Host "Checking for processes on port $Port..." -ForegroundColor Yellow
    try {
        $conn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if ($conn) {
            $pid = $conn.OwningProcess | Select-Object -First 1
            Write-Host "Killing process $pid on port $Port" -ForegroundColor Yellow
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
        } else {
            Write-Host "No process found on port $Port" -ForegroundColor Green
        }
    } catch {
        Write-Host "Port $Port is free" -ForegroundColor Green
    }
}

function Wait-ForServer {
    param([string]$Url, [int]$TimeoutSeconds = 30)
    Write-Host "Waiting for server at $Url (timeout: ${TimeoutSeconds}s)..." -ForegroundColor Yellow
    $elapsed = 0
    while ($elapsed -lt $TimeoutSeconds) {
        try {
            $response = Invoke-WebRequest -Uri $Url -Method GET -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Write-Host "Server ready!" -ForegroundColor Green
                return $true
            }
        } catch {
            # Server not ready yet
        }
        Start-Sleep -Seconds 1
        $elapsed++
    }
    Write-Host "Server did not respond within ${TimeoutSeconds}s" -ForegroundColor Red
    return $false
}

function Start-ServerBackground {
    param([string]$LogFile)
    Write-Host "Starting server (logging to $LogFile)..." -ForegroundColor Yellow
    
    # Use cmd.exe to redirect both stdout and stderr to one file
    $startCmd = "cmd.exe /c `"npm run dev > `"$LogFile`" 2>&1`""
    $proc = Start-Process powershell -ArgumentList "-NoProfile", "-Command", $startCmd -PassThru -WindowStyle Hidden
    
    Write-Host "Server process started (PID: $($proc.Id))" -ForegroundColor Green
    return $proc
}

function Run-Phase {
    param(
        [string]$PhaseName,
        [string]$GitRef,
        [string]$SmokeScript,
        [string]$OutputFile
    )
    
    Write-Header "PHASE: $PhaseName"
    
    # 1. Checkout
    Write-Host "Checking out $GitRef..." -ForegroundColor Yellow
    Push-Location $REPO_ROOT
    try {
        git checkout $GitRef 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Failed to checkout $GitRef" -ForegroundColor Red
            $Global:FAILURES++
            return
        }
        Write-Host "Checked out $GitRef" -ForegroundColor Green
        
        # 2. Kill port 3000
        Kill-ProcessOnPort -Port 3000
        
        # 3. Install dependencies (only if package.json changed)
        Write-Host "Checking dependencies..." -ForegroundColor Yellow
        if (-not (Test-Path "node_modules") -or (Test-Path "package.json")) {
            Write-Host "Running npm ci..." -ForegroundColor Yellow
            npm ci 2>&1 | Out-Null
            if ($LASTEXITCODE -ne 0) {
                Write-Host "npm ci failed, trying npm install..." -ForegroundColor Yellow
                npm install 2>&1 | Out-Null
                if ($LASTEXITCODE -ne 0) {
                    Write-Host "npm install failed" -ForegroundColor Red
                    $Global:FAILURES++
                    return
                }
            }
        }
        Write-Host "Dependencies OK" -ForegroundColor Green
        
        # 4. Start server
        $logFile = Join-Path $OUT_DIR "${PhaseName}_${TIMESTAMP}_server.log"
        $serverProc = Start-ServerBackground -LogFile $logFile
        
        # 5. Wait for health check
        $serverReady = Wait-ForServer -Url "http://localhost:3000/health" -TimeoutSeconds 30
        if (-not $serverReady) {
            Write-Host "Server failed to start, check log: $logFile" -ForegroundColor Red
            Stop-Process -Id $serverProc.Id -Force -ErrorAction SilentlyContinue
            $Global:FAILURES++
            return
        }
        
        # 6. Run smoke test
        Write-Host "Running smoke test: $SmokeScript" -ForegroundColor Yellow
        $smokeOutput = Join-Path $OUT_DIR $OutputFile
        
        # Capture output with Tee-Object equivalent (redirect to file and console)
        & powershell -NoProfile -File $SmokeScript | Tee-Object -FilePath $smokeOutput
        $smokeExitCode = $LASTEXITCODE
        
        # 7. Stop server
        Write-Host "Stopping server (PID: $($serverProc.Id))..." -ForegroundColor Yellow
        Stop-Process -Id $serverProc.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        
        # 8. Check result
        if ($smokeExitCode -eq 0) {
            Write-Host "✅ $PhaseName PASSED" -ForegroundColor Green
        } else {
            Write-Host "❌ $PhaseName FAILED (exit code: $smokeExitCode)" -ForegroundColor Red
            Write-Host "Output saved to: $smokeOutput" -ForegroundColor Yellow
            $Global:FAILURES++
        }
        
    } finally {
        Pop-Location
    }
}

# ============================================
# MAIN EXECUTION
# ============================================

Write-Header "SMOKE TEST ORCHESTRATOR - START"
Write-Host "Repository: $REPO_ROOT" -ForegroundColor DarkGray
Write-Host "Output directory: $OUT_DIR" -ForegroundColor DarkGray
Write-Host "Timestamp: $TIMESTAMP`n" -ForegroundColor DarkGray

# Save current branch/commit
Push-Location $REPO_ROOT
$ORIGINAL_REF = git rev-parse --abbrev-ref HEAD 2>&1
if ($LASTEXITCODE -ne 0) {
    $ORIGINAL_REF = git rev-parse HEAD 2>&1
}
Write-Host "Current ref: $ORIGINAL_REF (will restore after tests)`n" -ForegroundColor DarkGray
Pop-Location

# Phase 1.3: Execute-Lite (tag: phase-1.3-execute-lite-verified)
Run-Phase -PhaseName "Phase1.3" `
          -GitRef "phase-1.3-execute-lite-verified" `
          -SmokeScript "smoke-phase1_3-execute-lite.ps1" `
          -OutputFile "Phase1.3_${TIMESTAMP}_output.txt"

# Phase 1.4: Execution Modes (tag: phase-1.4-execution-modes-verified)
Run-Phase -PhaseName "Phase1.4" `
          -GitRef "phase-1.4-execution-modes-verified" `
          -SmokeScript "smoke-phase1_4-execution-modes.ps1" `
          -OutputFile "Phase1.4_${TIMESTAMP}_output.txt"

# Phase 1.5: Auto Writeback (current HEAD or tag if exists)
Push-Location $REPO_ROOT
git tag -l "phase-1.5-auto-writeback-verified" 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    $phase15Ref = "phase-1.5-auto-writeback-verified"
} else {
    $phase15Ref = "HEAD"
}
Pop-Location

Run-Phase -PhaseName "Phase1.5" `
          -GitRef $phase15Ref `
          -SmokeScript "smoke-phase1_5-auto-writeback.ps1" `
          -OutputFile "Phase1.5_${TIMESTAMP}_output.txt"

# Restore original branch
Write-Host "`nRestoring original ref: $ORIGINAL_REF" -ForegroundColor Yellow
Push-Location $REPO_ROOT
git checkout $ORIGINAL_REF 2>&1 | Out-Null
Pop-Location

# Final cleanup
Kill-ProcessOnPort -Port 3000

# Summary
Write-Header "SMOKE TEST ORCHESTRATOR - SUMMARY"
if ($Global:FAILURES -eq 0) {
    Write-Host "✅ ALL PHASES PASSED" -ForegroundColor Green
    Write-Host "Outputs saved to: $OUT_DIR" -ForegroundColor DarkGray
    exit 0
} else {
    Write-Host "❌ $Global:FAILURES PHASE(S) FAILED" -ForegroundColor Red
    Write-Host "Review outputs in: $OUT_DIR" -ForegroundColor Yellow
    exit 1
}

