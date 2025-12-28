# Monday.com OAuth Configuration Helper Script
# This script will help you set up OAuth credentials

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Monday.com OAuth Setup Helper" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "This script will help you create the .env file with OAuth credentials.`n" -ForegroundColor Yellow

# Check if .env already exists
if (Test-Path ".env") {
    Write-Host "⚠️  .env file already exists!" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to update it? (y/n)"
    if ($overwrite -ne "y") {
        Write-Host "`n❌ Setup cancelled." -ForegroundColor Red
        exit
    }
}

Write-Host "`n📋 Step 1: Create Monday.com App" -ForegroundColor Green
Write-Host "   Go to: https://auth.monday.com/developers" -ForegroundColor White
Write-Host "   Create a new app and configure OAuth settings" -ForegroundColor White
Write-Host "`nPress Enter when ready to continue..." -ForegroundColor Yellow
Read-Host

Write-Host "`n🔐 Step 2: Enter OAuth Credentials" -ForegroundColor Green
$clientId = Read-Host "Enter your Monday.com OAuth Client ID"
$clientSecret = Read-Host "Enter your Monday.com OAuth Client Secret"
$redirectUri = Read-Host "Enter Redirect URI (default: http://localhost:5173/register-org)"

if ([string]::IsNullOrWhiteSpace($redirectUri)) {
    $redirectUri = "http://localhost:5173/register-org"
}

Write-Host "`n📝 Step 3: Optional - Monday API Token" -ForegroundColor Green
Write-Host "   (Used for backend operations, not OAuth)" -ForegroundColor Gray
$apiToken = Read-Host "Enter Monday.com API Token (or press Enter to skip)"

# Read existing .env or create new one
$envContent = @"
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL="file:./prisma/dev.db"

# Authentication & Security
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
BCRYPT_ROUNDS=10
AUTH_ENABLED=true

# API Configuration
ROUTING_API_KEY=dev_key_123
CORS_ORIGIN=http://localhost:5173

# Monday.com OAuth (for user registration/login)
MONDAY_OAUTH_CLIENT_ID=$clientId
MONDAY_OAUTH_CLIENT_SECRET=$clientSecret
MONDAY_OAUTH_REDIRECT_URI=$redirectUri

"@

if (![string]::IsNullOrWhiteSpace($apiToken)) {
    $envContent += @"
# Monday.com API (for backend operations)
MONDAY_API_TOKEN=$apiToken

"@
}

# Save to .env
$envContent | Out-File -FilePath ".env" -Encoding UTF8

Write-Host "`n✅ .env file created successfully!" -ForegroundColor Green
Write-Host "`n📄 File location: $(Get-Location)\.env" -ForegroundColor Cyan

Write-Host "`n🔄 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Verify Redirect URI in Monday.com app: $redirectUri" -ForegroundColor White
Write-Host "   2. Make sure all OAuth scopes are enabled" -ForegroundColor White
Write-Host "   3. Restart your server: npm run dev" -ForegroundColor White
Write-Host "   4. Test at: http://localhost:5173/#register`n" -ForegroundColor White

Write-Host "Press Enter to exit..." -ForegroundColor Gray
Read-Host

