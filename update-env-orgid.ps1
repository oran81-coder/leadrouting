$newOrgId = "cmjt563ps000037hg6i4dvl7m"

Write-Host "Adding/Updating DEFAULT_ORG_ID in .env file..."

$envPath = "lead-routing-phase1-FULL-latest-rebuilt-FIX3-smokefix\lead-routing-skeleton-node-ts\.env"

if (Test-Path $envPath) {
    $content = Get-Content $envPath -Raw
    
    if ($content -match "DEFAULT_ORG_ID=") {
        # Update existing
        $content = $content -replace "DEFAULT_ORG_ID=.*", "DEFAULT_ORG_ID=$newOrgId"
    } else {
        # Add new
        $content += "`nDEFAULT_ORG_ID=$newOrgId`n"
    }
    
    Set-Content -Path $envPath -Value $content
    Write-Host "✅ Updated .env file with DEFAULT_ORG_ID=$newOrgId"
} else {
    Write-Host "❌ .env file not found at: $envPath"
}
