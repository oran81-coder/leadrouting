$ErrorActionPreference = "Stop"

Write-Host "`n🔧 מתחיל רישום Webhook..." -ForegroundColor Cyan

# 1. Get the primary board ID from the database
$boardIdQuery = "SELECT payload FROM FieldMappingConfigVersion WHERE orgId='org_1' ORDER BY version DESC LIMIT 1"
$result = npx tsx -e "
  import { getPrisma } from './packages/core/src/db/prisma.js';
  const prisma = getPrisma();
  prisma.\$queryRaw\`SELECT payload FROM FieldMappingConfigVersion WHERE orgId='org_1' ORDER BY version DESC LIMIT 1\`.then(rows => {
    if (rows.length > 0) {
      const config = JSON.parse(rows[0].payload);
      console.log(config.primaryBoardId);
    } else {
      console.log('');
    }
  });
"

$boardId = "18393182279"  # Your board ID from the screenshot

Write-Host "✅ Board ID: $boardId" -ForegroundColor Green

# 2. Register the webhook via Admin API
$token = "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjYwMTA2Nzk2MywiYWFpIjoxMSwidWlkIjo5NzY3OTM3MywiaWFkIjoiMjAyNS0xMi0yNVQyMDoxMDoxMi4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MzMwMzk1NzIsInJnbiI6InVzZTEifQ.IL0kInsBDeEz8DmVYtnZEL0yxdyqvrOUVs1K1JQMOL0"
$publicUrl = "https://unsepultured-uncatastrophically-beulah.ngrok-free.dev"
$webhookSecret = "webhook-secret-2024-leadrouting-system"

Write-Host "📡 שולח בקשה ל-Monday.com API..." -ForegroundColor Yellow

# Create webhook using Monday.com GraphQL API
$mutation = @"
mutation {
  create_webhook (
    board_id: $boardId,
    url: "$publicUrl/webhooks/monday",
    event: create_pulse
  ) {
    id
    board_id
  }
}
"@

$body = @{
    query = $mutation
} | ConvertTo-Json

$headers = @{
    "Authorization" = $token
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri "https://api.monday.com/v2" -Method Post -Body $body -Headers $headers
    
    if ($response.data.create_webhook) {
        $webhookId = $response.data.create_webhook.id
        Write-Host "`n✅ Webhook נרשם בהצלחה!" -ForegroundColor Green
        Write-Host "   Webhook ID: $webhookId" -ForegroundColor White
        
        # Save to our database
        Write-Host "`n💾 שומר ב-Database..." -ForegroundColor Cyan
        
        npx tsx -e "
          import { getPrisma } from './packages/core/src/db/prisma.js';
          const prisma = getPrisma();
          prisma.mondayWebhook.upsert({
            where: {
              orgId_boardId_event: {
                orgId: 'org_1',
                boardId: '$boardId',
                event: 'create_pulse'
              }
            },
            create: {
              orgId: 'org_1',
              boardId: '$boardId',
              webhookId: '$webhookId',
              url: '$publicUrl/webhooks/monday',
              event: 'create_pulse',
              isActive: true
            },
            update: {
              webhookId: '$webhookId',
              isActive: true,
              updatedAt: new Date()
            }
          }).then(() => {
            console.log('✅ נשמר ב-Database');
            process.exit(0);
          });
        "
        
        Write-Host "`n🎉 הכל מוכן! המערכת תקבל לידים חדשים בזמן אמת`n" -ForegroundColor Green
        
    } else {
        Write-Host "`n❌ שגיאה ברישום Webhook" -ForegroundColor Red
        Write-Host ($response | ConvertTo-Json -Depth 10)
        exit 1
    }
    
} catch {
    Write-Host "`n❌ שגיאה: $_" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Yellow
    }
    exit 1
}

