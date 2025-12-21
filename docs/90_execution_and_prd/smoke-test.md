# Phase 1 Smoke Test (Windows PowerShell)

This document provides exact commands to verify the Phase 1 lead routing system boots and responds correctly.

## Prerequisites

- Node.js 20+ installed
- npm installed
- Windows PowerShell
- Git (to clone/pull the repo)

---

## Step 1: Install Dependencies

```powershell
# From project root
npm install
```

**PASS Criteria:** Command completes without errors; `node_modules/` folder exists.

---

## Step 2: Setup Environment

```powershell
# Copy example env (if .env doesn't exist)
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

**PASS Criteria:** `.env` file exists in project root.

---

## Step 3: Prisma Generate

```powershell
npm run prisma:generate
```

**PASS Criteria:** 
- Command completes without errors
- Output shows "✔ Generated Prisma Client"

---

## Step 4: Prisma Migrate (Create Database)

```powershell
npm run prisma:migrate
```

**PASS Criteria:** 
- Command completes without errors
- `prisma/dev.db` file exists
- Output shows migration applied successfully

**Note:** If prompted for migration name, press Enter to accept default.

---

## Step 5: Start API Server

```powershell
npm run dev
```

**PASS Criteria:** 
- Console shows: `API listening on :3000`
- Console shows: `[adminRoutes] loaded`
- No errors in console
- Server remains running

**Note:** Keep this terminal open. Open a new PowerShell window for next steps.

---

## Step 6: Test Health Endpoint

```powershell
# In a NEW PowerShell window
Invoke-WebRequest -Uri http://localhost:3000/health -UseBasicParsing | Select-Object StatusCode, Content
```

**PASS Criteria:**
- StatusCode: `200`
- Content: `{"ok":true}`

---

## Step 7: Test Admin Endpoint (Rules Latest)

```powershell
Invoke-WebRequest -Uri http://localhost:3000/admin/rules/latest -UseBasicParsing | Select-Object StatusCode, Content
```

**PASS Criteria:**
- StatusCode: `200`
- Content: `{"ok":true,"rules":null}` (null is expected on first boot)

---

## Step 8: Test Admin Endpoint (Routing State)

```powershell
Invoke-WebRequest -Uri http://localhost:3000/admin/routing/state -UseBasicParsing | Select-Object StatusCode, Content
```

**PASS Criteria:**
- StatusCode: `200`
- Content contains: `"ok":true`
- Content contains: `"state":null` or `"state":{"orgId":"org_1","isEnabled":false}`

---

## Step 9: Test Admin Validation Endpoint

```powershell
Invoke-WebRequest -Uri http://localhost:3000/admin/validate -UseBasicParsing | Select-Object StatusCode, Content
```

**PASS Criteria:**
- StatusCode: `400` (expected: no schema/mapping configured yet)
- Content contains: `"ok":false`
- Content contains: `"schemaExists":false` or `"mappingExists":false`

---

## Summary

**ALL PASS:** 
- ✅ Dependencies installed
- ✅ Prisma generated
- ✅ Database migrated
- ✅ API boots without errors
- ✅ Health endpoint responds
- ✅ Admin endpoints reachable
- ✅ Validation logic working

**Smoke test complete.** System is developer-ready for Phase 1 work.

---

## Troubleshooting

### Issue: "Cannot find module '@prisma/client'"
**Solution:** Run `npm run prisma:generate`

### Issue: "Can't reach database server"
**Solution:** Run `npm run prisma:migrate` to create database

### Issue: "Port 3000 already in use"
**Solution:** 
- Stop other services on port 3000
- OR change `API_PORT=3001` in `.env` and adjust test commands

### Issue: "x-api-key required"
**Solution:** 
- If `ROUTING_API_KEY` is set in `.env`, add header to test commands:
```powershell
$headers = @{ "x-api-key" = "your-key-here" }
Invoke-WebRequest -Uri http://localhost:3000/health -Headers $headers -UseBasicParsing
```
- OR remove `ROUTING_API_KEY` from `.env` for local development

### Issue: Pollers throwing errors
**Solution:** Pollers are idle-safe. If Monday token is not configured, pollers will log warnings but not crash. This is expected for smoke test.

---

## Next Steps

After smoke test passes:
1. Configure Monday.com token (optional)
2. Create internal schema via `POST /admin/schema`
3. Configure field mapping via `POST /admin/mapping`
4. Create rules via `POST /admin/rules`
5. Enable routing via `POST /admin/routing/enable`

See PRD and context docs for full Phase 1 workflow.

