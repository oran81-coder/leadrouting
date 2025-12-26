# ============================================
# Lead Routing System - Development Startup Script
# ============================================
# This script automates the entire development setup:
# - Starts ngrok tunnel
# - Extracts the public URL
# - Updates .env file
# - Starts the backend server
# - Registers webhook with Monday.com
# - Opens frontend in browser
# ============================================

param(
    [switch]$SkipWebhook,
    [switch]$SkipFrontend,
    [int]$Port = 3000
)

$ErrorActionPreference = "Stop"

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  Lead Routing - Development Startup" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

$PROJECT_ROOT = Split-Path -Parent $PSScriptRoot
$ENV_FILE = Join-Path $PROJECT_ROOT ".env"

# ============================================
# Step 1: Check if ngrok is installed
# ============================================
Write-Host "📦 Step 1: Checking ngrok installation..." -ForegroundColor Yellow

try {
    $ngrokVersion = npx ngrok --version 2>&1
    Write-Host "   ✅ ngrok is installed: $ngrokVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ ngrok is not installed!" -ForegroundColor Red
    Write-Host "`n   Installing ngrok via npm..." -ForegroundColor Yellow
    npm install -g ngrok
    Write-Host "   ✅ ngrok installed successfully!" -ForegroundColor Green
}

# ============================================
# Step 2: Start ngrok tunnel
# ============================================
Write-Host "`n🌐 Step 2: Starting ngrok tunnel..." -ForegroundColor Yellow

# Check if ngrok is already running
try {
    $ngrokApi = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -ErrorAction SilentlyContinue
    if ($ngrokApi.tunnels.Count -gt 0) {
        Write-Host "   ℹ️  ngrok is already running!" -ForegroundColor Cyan
        $publicUrl = $ngrokApi.tunnels[0].public_url
        Write-Host "   📍 Public URL: $publicUrl" -ForegroundColor Green
    }
} catch {
    Write-Host "   🚀 Starting new ngrok tunnel..." -ForegroundColor Cyan
    
    # Start ngrok in background
    Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd '$PROJECT_ROOT'; npx ngrok http $Port" -WindowStyle Normal
    
    Write-Host "   ⏳ Waiting for ngrok to initialize (10 seconds)..." -ForegroundColor Cyan
    Start-Sleep -Seconds 10
    
    # Get the public URL from ngrok API
    try {
        $ngrokApi = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels"
        $publicUrl = $ngrokApi.tunnels[0].public_url
        Write-Host "   ✅ ngrok started successfully!" -ForegroundColor Green
        Write-Host "   📍 Public URL: $publicUrl" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Failed to get ngrok URL from API" -ForegroundColor Red
        Write-Host "   Please check the ngrok window for the URL and update .env manually" -ForegroundColor Yellow
        Write-Host "   Press any key to continue..." -ForegroundColor Yellow
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit 1
    }
}

# ============================================
# Step 3: Update .env file
# ============================================
Write-Host "`n📝 Step 3: Updating .env file..." -ForegroundColor Yellow

if (-Not (Test-Path $ENV_FILE)) {
    Write-Host "   ❌ .env file not found at: $ENV_FILE" -ForegroundColor Red
    Write-Host "   Please create .env file first" -ForegroundColor Yellow
    exit 1
}

# Read current .env content
$envContent = Get-Content $ENV_FILE -Raw

# Update or add PUBLIC_URL
if ($envContent -match "PUBLIC_URL=.*") {
    $envContent = $envContent -replace "PUBLIC_URL=.*", "PUBLIC_URL=$publicUrl"
    Write-Host "   ✅ Updated PUBLIC_URL in .env" -ForegroundColor Green
} else {
    $envContent += "`nPUBLIC_URL=$publicUrl`n"
    Write-Host "   ✅ Added PUBLIC_URL to .env" -ForegroundColor Green
}

# Ensure WEBHOOK_SECRET exists
if (-Not ($envContent -match "WEBHOOK_SECRET=.*")) {
    $envContent += "WEBHOOK_SECRET=webhook-secret-2024-leadrouting-system`n"
    Write-Host "   ✅ Added WEBHOOK_SECRET to .env" -ForegroundColor Green
}

# Save updated .env
Set-Content -Path $ENV_FILE -Value $envContent -NoNewline
Write-Host "   📍 PUBLIC_URL set to: $publicUrl" -ForegroundColor Cyan

# ============================================
# Step 4: Start Backend Server
# ============================================
Write-Host "`n🚀 Step 4: Starting backend server..." -ForegroundColor Yellow

# Check if server is already running
try {
    $healthCheck = Invoke-RestMethod -Uri "http://localhost:$Port/health" -ErrorAction SilentlyContinue
    if ($healthCheck.ok -eq $true) {
        Write-Host "   ℹ️  Server is already running on port $Port" -ForegroundColor Cyan
    }
} catch {
    Write-Host "   🚀 Starting new server instance..." -ForegroundColor Cyan
    
    # Start server in new window
    Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd '$PROJECT_ROOT'; npm run dev" -WindowStyle Normal
    
    Write-Host "   ⏳ Waiting for server to start (15 seconds)..." -ForegroundColor Cyan
    Start-Sleep -Seconds 15
    
    # Verify server is running
    try {
        $healthCheck = Invoke-RestMethod -Uri "http://localhost:$Port/health"
        if ($healthCheck.ok -eq $true) {
            Write-Host "   ✅ Server started successfully!" -ForegroundColor Green
        }
    } catch {
        Write-Host "   ❌ Server failed to start or health check failed" -ForegroundColor Red
        Write-Host "   Please check the server window for errors" -ForegroundColor Yellow
        exit 1
    }
}

# ============================================
# Step 5: Register Webhook (Optional)
# ============================================
if (-Not $SkipWebhook) {
    Write-Host "`n📡 Step 5: Registering webhook with Monday.com..." -ForegroundColor Yellow
    Write-Host "   ℹ️  This will run the webhook registration script" -ForegroundColor Cyan
    
    # Check if register-webhook-auto.ts exists
    $webhookScript = Join-Path $PROJECT_ROOT "register-webhook-auto.ts"
    if (Test-Path $webhookScript) {
        Write-Host "   🚀 Running webhook registration..." -ForegroundColor Cyan
        try {
            npx tsx $webhookScript
            Write-Host "   ✅ Webhook registration completed!" -ForegroundColor Green
        } catch {
            Write-Host "   ⚠️  Webhook registration failed (this is okay if Monday.com is not configured yet)" -ForegroundColor Yellow
            Write-Host "   You can register manually later from the Admin Screen" -ForegroundColor Cyan
        }
    } else {
        Write-Host "   ℹ️  Webhook auto-registration script not found" -ForegroundColor Cyan
        Write-Host "   You can register webhook manually from Admin Screen" -ForegroundColor Cyan
    }
} else {
    Write-Host "`n⏭️  Step 5: Skipping webhook registration (--SkipWebhook flag)" -ForegroundColor Yellow
}

# ============================================
# Step 6: Open Frontend (Optional)
# ============================================
if (-Not $SkipFrontend) {
    Write-Host "`n🌐 Step 6: Opening frontend..." -ForegroundColor Yellow
    
    # Check if frontend is already running
    try {
        $frontendCheck = Invoke-RestMethod -Uri "http://localhost:5173" -ErrorAction SilentlyContinue
        Write-Host "   ℹ️  Frontend is already running" -ForegroundColor Cyan
    } catch {
        Write-Host "   🚀 Starting frontend..." -ForegroundColor Cyan
        $frontendPath = Join-Path $PROJECT_ROOT "frontend"
        Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm run dev" -WindowStyle Normal
        Start-Sleep -Seconds 5
    }
    
    # Open browser
    Write-Host "   🌐 Opening browser at http://localhost:5173" -ForegroundColor Cyan
    Start-Process "http://localhost:5173"
} else {
    Write-Host "`n⏭️  Step 6: Skipping frontend (--SkipFrontend flag)" -ForegroundColor Yellow
}

# ============================================
# Summary
# ============================================
Write-Host "`n============================================" -ForegroundColor Green
Write-Host "  ✅ Development Environment Ready!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Backend API:     http://localhost:$Port" -ForegroundColor Cyan
Write-Host "📍 Frontend UI:     http://localhost:5173" -ForegroundColor Cyan
Write-Host "📍 Public URL:      $publicUrl" -ForegroundColor Cyan
Write-Host "📍 ngrok Dashboard: http://localhost:4040" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Open Admin Screen in browser" -ForegroundColor White
Write-Host "   2. Connect Monday.com (enter API token)" -ForegroundColor White
Write-Host "   3. Webhook will be registered automatically" -ForegroundColor White
Write-Host "   4. Add a new item in Monday.com to test!" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Important:" -ForegroundColor Yellow
Write-Host "   - Keep all terminal windows open" -ForegroundColor White
Write-Host "   - If ngrok disconnects, run this script again" -ForegroundColor White
Write-Host "   - ngrok URL changes each restart (free tier)" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Useful Commands:" -ForegroundColor Yellow
Write-Host "   - Check ngrok status: scripts\check-ngrok-health.ps1" -ForegroundColor White
Write-Host "   - Register webhook:   npx tsx register-webhook-auto.ts" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

