# Fix Summary: APPROVE & OVERRIDE Flow - Dec 27, 2025

## 🐛 **Problems Found**

### 1. APPROVE Button Not Working
**Root Cause:**
- Duplicate call to `applyRepo.tryBegin()` caused unique constraint error
- No error handling - failures were silent
- `RoutingApply` record created but actual writeback never happened

**Symptoms:**
- Clicking APPROVE did nothing
- Status remained PROPOSED
- Monday.com not updated
- Logs showed: `Unique constraint failed on fields: (orgId, proposalId)`

---

### 2. OVERRIDE Endpoint Issues
**Problems:**
- Duplicate `if (!applyNow)` checks (lines 228 & 235)
- No try-catch error handling
- No idempotency guard (RoutingApply.tryBegin)
- No detailed logging
- If writeback failed, no cleanup mechanism

---

### 3. BULK-APPROVE Issues
**Problems:**
- Missing `setDecision` call to update status to APPROVED
- No cleanup on failure
- Inconsistent error handling

---

## ✅ **Solutions Implemented**

### `/approve` Endpoint (Lines 91-177)
**Changes:**
1. ✅ Removed duplicate `tryBegin()` call
2. ✅ Wrapped entire flow in try-catch
3. ✅ Added detailed logging:
   - `[APPROVE] Applying proposal X to Monday.com...`
   - `[APPROVE] Successfully applied to Monday.com`
   - `[APPROVE] Proposal X fully approved and applied`
4. ✅ Automatic cleanup on failure:
   ```typescript
   try {
     const prisma = getPrisma();
     await prisma.routingApply.delete({ ... });
     logger.info(`[APPROVE] Cleaned up RoutingApply record for retry`);
   } catch (cleanupError) {
     logger.warn(`[APPROVE] Could not clean up RoutingApply record:`, cleanupError);
   }
   ```
5. ✅ Return proper error response with 500 status code

---

### `/override` Endpoint (Lines 199-272)
**Changes:**
1. ✅ Removed duplicate `if (!applyNow)` check
2. ✅ Wrapped entire flow in try-catch
3. ✅ Added idempotency guard BEFORE writeback:
   ```typescript
   const guard = await applyRepo.tryBegin(ORG_ID, id);
   if (guard === "ALREADY") {
     return res.json({ ok: true, id, status: "APPLIED", alreadyApplied: true });
   }
   ```
4. ✅ Added detailed logging:
   - `[OVERRIDE] Applying overridden proposal X to Monday.com...`
   - `[OVERRIDE] Successfully applied to Monday.com`
   - `[OVERRIDE] Proposal X fully overridden and applied`
5. ✅ Automatic cleanup on failure (same as APPROVE)
6. ✅ Proper error response with 500 status code

---

### `/bulk-approve` Endpoint (Lines 313-409)
**Changes:**
1. ✅ Added missing `setDecision` call:
   ```typescript
   await proposalRepo.setDecision({ 
     orgId: ORG_ID, 
     id, 
     status: "APPROVED", 
     decidedBy: ACTOR, 
     decisionNotes: null 
   });
   ```
2. ✅ Added cleanup on failure for each proposal
3. ✅ Added detailed logging per proposal
4. ✅ Improved error handling with try-catch per item
5. ✅ Return summary: `{ total, succeeded, results[] }`

---

## 📝 **New Imports Added**

```typescript
import { getPrisma } from "../../../../packages/core/src/db/prisma";
import { createModuleLogger } from "../infrastructure/logger";

const logger = createModuleLogger('ManagerRoutes');
```

---

## 🧪 **Testing**

### Created Helper Scripts:

1. **scripts/check-apply-records.ts**
   - Lists all RoutingApply records
   - Shows which proposals have/don't have apply records
   - Identifies mismatches (apply record exists but status is PROPOSED)

2. **scripts/clear-failed-apply.ts**
   - Cleans up failed apply attempts
   - Detects proposals with apply record but status=PROPOSED
   - Allows retry after cleanup

3. **scripts/test-override-flow.ts**
   - Lists available PROPOSED proposals
   - Provides step-by-step testing instructions
   - Shows expected results

---

## 🎯 **Expected Behavior Now**

### APPROVE Flow:
1. User clicks APPROVE
2. Backend checks idempotency (tryBegin)
3. Writes to Monday.com (applyAssignmentToMonday)
4. Updates proposal status to APPROVED
5. Creates audit log
6. Returns success

**If any step fails:**
- Cleans up RoutingApply record automatically
- Returns clear error message to UI
- Logs detailed error with stack trace
- User can retry immediately

---

### OVERRIDE Flow:
1. User selects different agent and checks "Apply now"
2. Backend updates proposal status to OVERRIDDEN
3. Checks idempotency (tryBegin)
4. Writes new agent to Monday.com
5. Marks as applied
6. Creates audit log
7. Returns success

**If writeback fails:**
- Same cleanup mechanism as APPROVE
- Clear error message
- User can retry

---

## 🔍 **Debugging Guide**

### If APPROVE still doesn't work:

1. **Check backend logs:**
   ```powershell
   Get-Content terminals\15.txt -Tail 50 | Select-String -Pattern "APPROVE|error"
   ```

2. **Check for stuck RoutingApply records:**
   ```bash
   npx tsx scripts/check-apply-records.ts
   ```

3. **If you see "Unique constraint" error:**
   ```bash
   npx tsx scripts/clear-failed-apply.ts
   ```

4. **Check Monday.com credentials:**
   - Verify MONDAY_API_TOKEN in .env
   - Check field mappings are configured

---

### If OVERRIDE doesn't work:

1. **Same steps as APPROVE**, but look for `[OVERRIDE]` in logs
2. **Check the proposal status:**
   - Should change to OVERRIDDEN immediately
   - Then to APPLIED if "Apply now" was checked
3. **Verify the new agent value:**
   - Check if it's a valid Monday.com user ID
   - Check `resolveMondayPersonId` if using people column

---

## 📊 **Status**

- ✅ APPROVE endpoint fixed and tested
- ✅ OVERRIDE endpoint fixed (awaiting user test)
- ✅ BULK-APPROVE endpoint improved
- ✅ Error handling comprehensive
- ✅ Logging detailed
- ✅ Cleanup mechanism automatic
- ✅ Helper scripts created

---

## 🚀 **Next Steps**

1. **User testing:**
   - Test APPROVE on different proposals
   - Test OVERRIDE with different agents
   - Test bulk operations

2. **Monitor logs:**
   - Watch for any [APPROVE]/[OVERRIDE] errors
   - Check Monday.com writeback success rate

3. **Consider future improvements:**
   - Add retry mechanism with exponential backoff
   - Add rate limiting for Monday.com API calls
   - Add webhook confirmation for writeback success

