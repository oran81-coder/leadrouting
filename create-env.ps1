# Quick .env File Creator
# This will help you create .env with OAuth credentials

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Create .env File for OAuth" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (Test-Path ".env") {
    Write-Host "⚠️  .env already exists!" -ForegroundColor Yellow
    $response = Read-Host "Overwrite? (y/n)"
    if ($response -ne "y") {
        Write-Host "Cancelled." -ForegroundColor Red
        exit
    }
}

Write-Host "I'll help you create the .env file step by step.`n" -ForegroundColor Green

# Prompt for OAuth credentials
Write-Host "📋 Step 1: Monday.com OAuth Credentials" -ForegroundColor Yellow
Write-Host "   (From https://auth.monday.com/developers)`n" -ForegroundColor Gray

$clientId = Read-Host "Enter Client ID"
if ([string]::IsNullOrWhiteSpace($clientId)) {
    Write-Host "❌ Client ID is required!" -ForegroundColor Red
    exit
}

$clientSecret = Read-Host "Enter Client Secret"
if ([string]::IsNullOrWhiteSpace($clientSecret)) {
    Write-Host "❌ Client Secret is required!" -ForegroundColor Red
    exit
}

Write-Host "`n✅ Got credentials!`n" -ForegroundColor Green

# Create .env content
$envContent = @"
# ===============================================
# Lead Routing System - Environment Configuration
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# ===============================================

# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL="file:./prisma/dev.db"

# Authentication & Security
JWT_SECRET=lead-routing-super-secret-jwt-key-2024
BCRYPT_ROUNDS=10
AUTH_ENABLED=true

# API Configuration
ROUTING_API_KEY=dev_key_123
CORS_ORIGIN=http://localhost:5173

# ===============================================
# Monday.com OAuth Configuration
# ===============================================
MONDAY_OAUTH_CLIENT_ID=$clientId
MONDAY_OAUTH_CLIENT_SECRET=$clientSecret
MONDAY_OAUTH_REDIRECT_URI=http://localhost:5173/register-org

# ===============================================
# Rate Limiting
# ===============================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
"@

# Save to .env
$envContent | Out-File -FilePath ".env" -Encoding UTF8 -NoNewline

Write-Host "✅ .env file created successfully!`n" -ForegroundColor Green

Write-Host "📄 File location: $((Get-Location).Path)\.env`n" -ForegroundColor Cyan

Write-Host "🔍 Verify in Monday.com app:" -ForegroundColor Yellow
Write-Host "   ✓ Redirect URI: http://localhost:5173/register-org" -ForegroundColor White
Write-Host "   ✓ Scopes enabled: me:read, account:read, boards:read/write," -ForegroundColor White
Write-Host "                     users:read, workspaces:read`n" -ForegroundColor White

Write-Host "🔄 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Stop current server (Ctrl+C)" -ForegroundColor White
Write-Host "   2. Run: npm run dev" -ForegroundColor White
Write-Host "   3. Test: http://localhost:5173/#register`n" -ForegroundColor White

Write-Host "Press Enter to exit..." -ForegroundColor Gray
Read-Host

