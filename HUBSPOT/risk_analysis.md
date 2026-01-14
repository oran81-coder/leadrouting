# HubSpot Integration — Risk Analysis & Mitigation

Following a deep-dive review of the implementation plan, I have identified potential "blind spots" and technical risks that could arise during execution.

## 1. Rate Limiting (The "HubSpot Choke")
> [!CAUTION]
> HubSpot APIs have strict rate limits (usually 10-100 requests/second depending on the tier).
- **Risk**: A high-frequency poller (like our current 120s Monday poller) across multiple organizations could hit HubSpot's global limit, causing the integration to stop working for all users.
- **Mitigation**: 
  - Implement **Request Throttling** in the `ICrmClient`.
  - Prefer **Webhooks** over Polling where possible to reduce API calls.
  - Use `batch` endpoints for fetching deal properties.

## 2. Cross-Object Mapping Complexity
- **Risk**: In HubSpot, vital lead information is often split across objects. For example:
  - **Deal**: Amount, Stage.
  - **Contact**: Email, Phone, LinkedIn.
  - **Company**: Industry, Revenue.
- **Failure**: If we only poll "Deals", we will miss the Contact's email needed for routing.
- **Mitigation**: 
  - The `HubspotClient` must automatically fetch "Associated Objects" during ingestion.
  - The Mapping Wizard must allow the Admin to select properties from related objects (e.g., `Deal -> Primary Contact -> Email`).

## 3. The "Unassigned" Definition Conflict
- **Risk**: In Monday, a lead is unassigned if a column is empty. In HubSpot, a Deal *usually* has an owner from the moment of creation (the person who created it).
- **Failure**: The system might skip all deals thinking they are already "assigned".
- **Mitigation**: 
  - Add a "Lead Source Filter" in the config (e.g., "Only route deals where Owner is 'Sales Operations' or 'Unassigned'").

## 4. OAuth Token De-serialization
- **Failure**: If the `Refresh Token` is revoked or expires while the server is down, the connection breaks.
- **Mitigation**: 
  - **Auto-Retry & Alerting**: Implement a background worker that checks connectivity daily.
  - **Graceful Degradation**: If the token fails, keep existing leads in the queue but stop the poller and alert the admin immediately.
  - **Encryption**: Tokens MUST be encrypted with `AES-256-GCM` before storage.

## 5. Data Idempotency & Race Conditions
- **Risk**: If a webhook and a poller process the same HubSpot deal at the same millisecond, we might create duplicate routing proposals.
- **Mitigation**: 
  - **Atomic Locking**: Use a distributed lock (e.g., Redis) or a unique constraint in the DB on `orgId_itemId_provider`.
  - **Idempotency Keys**: Generate a unique key based on the HubSpot `version` or `updatedAt` timestamp.

## 6. Mapping Migration (Breaking Changes)
- **Risk**: Generalizing the database to support `CrmCredential` and `FieldMappingConfig.provider` might break existing Monday users if not handled with a strict migration script.
- **Mitigation**: 
  - Use Prisma migrations with `DEFAULT 'monday'` values.
  - Regression testing on a copy of the production database.

---

### Critical Success Factor: The "Generalist" Poller
Instead of `startLeadIntakePoller()`, we should rename it to `startCrmIntakeEngine()` which iterates through all Orgs and their respective active providers.
