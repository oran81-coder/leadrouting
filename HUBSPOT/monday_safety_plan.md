# Monday.com — Safety & Backward Compatibility Plan

To address the concern of harming existing processes (specifically the Monday connection), we will follow these "Safety Rules" during implementation:

## 1. Zero-Touch for Monday Tables
> [!IMPORTANT]
> We will NOT rename or delete the `MondayCredential` table or existing columns in `Organization`.
- Existing Monday connections will continue to work exactly as they do today.
- New HubSpot connections will use a separate, parallel structure (or a new generalized table that doesn't overwrite the old one).

## 2. Defaulting to Monday
In the code, whenever the "Service Provider" is not explicitly defined (which is the case for all existing leads and configurations), the system will **automatically default to Monday**.
```typescript
const provider = orgSettings.activeProvider ?? 'monday';
```

## 3. Parallel Ingestion Engines
Instead of modifying the existing `MondayLeadIntakePoller`, we will:
1. Move the Monday logic into a dedicated class `MondayIntegrationService`.
2. Create a new `HubspotIntegrationService`.
3. The main poller will simply loop through organizations and trigger the service that matches their `activeProvider`.

## 4. UI Stability
- The "Connect HubSpot" screen will be a **separate tab** or a clear alternative in the Admin UI.
- It will not overwrite the Monday API key unless the user explicitly switches the "Active CRM".

## 5. Metadata Preservation
- `LeadFact` records for Monday use `itemId`. HubSpot leads will use the HubSpot `dealId`. 
- Since both are strings in our DB, they co-exist perfectly without collision.

---
### Summary
**Existing Monday users will not feel any change.** The system will treat HubSpot as an "Additional Module" that is only activated upon request.
