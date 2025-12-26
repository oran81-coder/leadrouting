# ============================================
# ngrok Health Monitoring Script
# ============================================
# Checks if ngrok is running and responsive
# Can be run manually or scheduled via Task Scheduler
# ============================================

param(
    [switch]$Continuous,
    [int]$IntervalSeconds = 300,  # 5 minutes default
    [switch]$AutoRestart,
    [switch]$Silent
)

$ErrorActionPreference = "Continue"

function Write-Status {
    param($Message, $Color = "White")
    if (-Not $Silent) {
        Write-Host $Message -ForegroundColor $Color
    }
}

function Check-NgrokHealth {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    Write-Status "`n[$timestamp] Checking ngrok health..." "Cyan"
    
    # Check 1: Is ngrok API responding?
    try {
        $ngrokApi = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -TimeoutSec 5
        
        if ($ngrokApi.tunnels.Count -eq 0) {
            Write-Status "   ⚠️  ngrok API is running but no tunnels found" "Yellow"
            return $false
        }
        
        $tunnel = $ngrokApi.tunnels[0]
        $publicUrl = $tunnel.public_url
        $connections = $tunnel.metrics.conns.count
        
        Write-Status "   ✅ ngrok is healthy" "Green"
        Write-Status "      Public URL: $publicUrl" "Cyan"
        Write-Status "      Connections: $connections" "Cyan"
        
        # Check 2: Can we reach the public URL?
        try {
            $response = Invoke-WebRequest -Uri "$publicUrl/health" -TimeoutSec 10 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Status "   ✅ Public URL is reachable" "Green"
                return $true
            } else {
                Write-Status "   ⚠️  Public URL returned status: $($response.StatusCode)" "Yellow"
                return $false
            }
        } catch {
            Write-Status "   ⚠️  Public URL is not reachable: $($_.Exception.Message)" "Yellow"
            return $false
        }
        
    } catch {
        Write-Status "   ❌ ngrok is not running or not responding" "Red"
        Write-Status "      Error: $($_.Exception.Message)" "Red"
        return $false
    }
}

function Send-Alert {
    param($Message)
    
    # Log to file
    $logFile = Join-Path $PSScriptRoot "ngrok-health.log"
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logFile -Value "[$timestamp] $Message"
    
    # Display alert
    Write-Status "`n🚨 ALERT: $Message" "Red"
    
    # Optional: You can add email/Slack notifications here
    # For now, just log and display
}

function Restart-NgrokTunnel {
    Write-Status "`n🔄 Attempting to restart ngrok..." "Yellow"
    
    # Try to find and kill existing ngrok processes
    $ngrokProcesses = Get-Process -Name "ngrok" -ErrorAction SilentlyContinue
    if ($ngrokProcesses) {
        Write-Status "   Stopping existing ngrok processes..." "Cyan"
        $ngrokProcesses | Stop-Process -Force
        Start-Sleep -Seconds 2
    }
    
    # Start new ngrok instance
    $projectRoot = Split-Path -Parent $PSScriptRoot
    Write-Status "   Starting new ngrok instance..." "Cyan"
    
    Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd '$projectRoot'; npx ngrok http 3000" -WindowStyle Normal
    
    Write-Status "   ⏳ Waiting 10 seconds for ngrok to initialize..." "Cyan"
    Start-Sleep -Seconds 10
    
    # Verify it's running
    $isHealthy = Check-NgrokHealth
    if ($isHealthy) {
        Write-Status "   ✅ ngrok restarted successfully!" "Green"
        Send-Alert "ngrok was restarted automatically"
        
        # Update .env with new URL
        Write-Status "   📝 Updating .env with new URL..." "Cyan"
        try {
            $ngrokApi = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels"
            $newUrl = $ngrokApi.tunnels[0].public_url
            
            $envFile = Join-Path $projectRoot ".env"
            if (Test-Path $envFile) {
                $envContent = Get-Content $envFile -Raw
                $envContent = $envContent -replace "PUBLIC_URL=.*", "PUBLIC_URL=$newUrl"
                Set-Content -Path $envFile -Value $envContent -NoNewline
                Write-Status "   ✅ .env updated with new URL: $newUrl" "Green"
                
                # Note: Server needs restart to pick up new URL
                Write-Status "   ⚠️  NOTE: You may need to restart the backend server" "Yellow"
                Write-Status "      and re-register webhook with Monday.com" "Yellow"
            }
        } catch {
            Write-Status "   ⚠️  Failed to update .env: $($_.Exception.Message)" "Yellow"
        }
    } else {
        Write-Status "   ❌ Failed to restart ngrok" "Red"
        Send-Alert "Failed to restart ngrok automatically"
    }
}

# ============================================
# Main Execution
# ============================================

if (-Not $Silent) {
    Write-Host "`n============================================" -ForegroundColor Cyan
    Write-Host "  ngrok Health Monitor" -ForegroundColor Cyan
    Write-Host "============================================`n" -ForegroundColor Cyan
}

if ($Continuous) {
    Write-Status "🔄 Running in continuous mode (checking every $IntervalSeconds seconds)" "Yellow"
    Write-Status "   Press Ctrl+C to stop`n" "Gray"
    
    $checkCount = 0
    $failureCount = 0
    
    while ($true) {
        $checkCount++
        Write-Status "`n--- Check #$checkCount ---" "Gray"
        
        $isHealthy = Check-NgrokHealth
        
        if (-Not $isHealthy) {
            $failureCount++
            Send-Alert "ngrok health check failed (failure #$failureCount)"
            
            if ($AutoRestart) {
                Write-Status "`n🔧 Auto-restart is enabled..." "Yellow"
                Restart-NgrokTunnel
                $failureCount = 0  # Reset failure count after restart
            } else {
                Write-Status "`n💡 Tip: Use --AutoRestart to automatically restart ngrok on failure" "Yellow"
            }
        } else {
            $failureCount = 0  # Reset failure count on success
        }
        
        Write-Status "`n⏳ Next check in $IntervalSeconds seconds..." "Gray"
        Start-Sleep -Seconds $IntervalSeconds
    }
} else {
    # Single check
    $isHealthy = Check-NgrokHealth
    
    if (-Not $isHealthy) {
        Send-Alert "ngrok health check failed"
        
        Write-Status "`n💡 Suggestions:" "Yellow"
        Write-Status "   1. Start ngrok manually: npx ngrok http 3000" "White"
        Write-Status "   2. Or run: scripts\start-dev.ps1" "White"
        Write-Status "   3. Or use --AutoRestart to restart automatically" "White"
        
        exit 1
    }
    
    Write-Status "`n✅ All checks passed!" "Green"
    exit 0
}

