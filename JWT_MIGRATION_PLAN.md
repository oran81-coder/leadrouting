# JWT Authentication Migration Plan

## Current State
- All API routes use hardcoded `org_1` for organization identification
- API key authentication (`x-api-key: dev_key_123`) is in place
- JWT auth routes exist but are not integrated

## Goal
Replace hardcoded `org_1` with proper JWT-based multi-tenancy where:
- Each user belongs to an organization
- JWT token contains `userId` and `orgId`
- All API operations use the authenticated user's `orgId`

---

## Migration Steps

### Phase 1: Create Test Users & Organizations ✅ DONE
**Status:** JWT routes and User/Session tables already exist

**Existing Components:**
- `apps/api/src/routes/auth.routes.ts` - JWT authentication endpoints
- `apps/api/src/middleware/auth.middleware.ts` - JWT verification
- `packages/core/src/auth/auth.service.ts` - Authentication logic
- `prisma/schema.prisma` - User & Session tables defined

### Phase 2: Update API Middleware
**File:** `apps/api/src/routes/index.ts`

**Current:**
```typescript
export function registerRoutes(app: Express) {
  const ORG_ID = "org_1"; // ❌ Hardcoded
  
  app.use("/admin", requireApiKey, adminRoutes());
  app.use("/routing", requireApiKey, routingRoutes());
  // ... etc
}
```

**Target:**
```typescript
import { authenticateJWT } from "../middleware/auth.middleware";

export function registerRoutes(app: Express) {
  // Public routes (no auth)
  app.use("/health", healthRoutes());
  app.use("/auth", authRoutes); // Login, register, etc.

  // Protected routes (JWT required)
  app.use("/admin", authenticateJWT, adminRoutes());
  app.use("/routing", authenticateJWT, routingRoutes());
  app.use("/manager", authenticateJWT, managerRoutes());
  // ... etc
}
```

### Phase 3: Update Route Handlers
**Pattern:** Extract `orgId` from `req.user` instead of hardcoded constant

**Example - Before:**
```typescript
r.get("/", async (_req, res) => {
  const ORG_ID = "org_1"; // ❌ Hardcoded
  const data = await repo.getWeights(ORG_ID);
  return res.json({ ok: true, ...data });
});
```

**Example - After:**
```typescript
r.get("/", async (req, res) => {
  const orgId = req.user!.orgId; // ✅ From JWT
  const data = await repo.getWeights(orgId);
  return res.json({ ok: true, ...data });
});
```

**Files to Update:**
- `apps/api/src/routes/admin.routes.ts`
- `apps/api/src/routes/manager.routes.ts`
- `apps/api/src/routes/kpiWeights.routes.ts`
- `apps/api/src/routes/agentProfile.routes.ts`
- `apps/api/src/routes/routing.routes.ts`
- `apps/api/src/routes/mappingPreview.routes.ts`
- All other route files

### Phase 4: Frontend Integration
**File:** `frontend/src/ui/api.ts`

**Add:**
```typescript
let authToken: string | null = null;

export function setAuthToken(token: string) {
  authToken = token;
  localStorage.setItem("auth_token", token);
}

export function getAuthToken(): string | null {
  if (!authToken) {
    authToken = localStorage.getItem("auth_token");
  }
  return authToken;
}

export function clearAuthToken() {
  authToken = null;
  localStorage.removeItem("auth_token");
}
```

**Update `http` function:**
```typescript
async function http<T>(path: string, opts?: RequestInit): Promise<T> {
  const base = localStorage.getItem("apiBase") || "http://localhost:3000";
  const apiKey = localStorage.getItem("apiKey") || "dev_key_123";
  const token = getAuthToken();

  const headers = new Headers(opts?.headers);
  headers.set("x-api-key", apiKey);
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`); // ✅ JWT
  }

  const response = await fetch(`${base}${path}`, {
    ...opts,
    headers,
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      clearAuthToken();
      window.location.href = "/login"; // Redirect to login
    }
    throw new Error(`HTTP ${response.status}`);
  }
  
  return await response.json();
}
```

**Add Login/Register screens:**
- `frontend/src/ui/LoginScreen.tsx` - New component
- `frontend/src/ui/RegisterScreen.tsx` - New component

### Phase 5: Seed Test Users
**File:** `prisma/seed-users.ts`

```typescript
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create organizations
  const org1 = await prisma.user.upsert({
    where: { orgId_username: { orgId: "org_1", username: "admin" } },
    update: {},
    create: {
      orgId: "org_1",
      username: "admin",
      email: "admin@company1.com",
      passwordHash: await bcrypt.hash("admin123", 10),
      role: "admin",
      firstName: "Admin",
      lastName: "User",
    },
  });

  const org1Manager = await prisma.user.upsert({
    where: { orgId_username: { orgId: "org_1", username: "manager" } },
    update: {},
    create: {
      orgId: "org_1",
      username: "manager",
      email: "manager@company1.com",
      passwordHash: await bcrypt.hash("manager123", 10),
      role: "manager",
      firstName: "Manager",
      lastName: "User",
    },
  });

  console.log("✅ Created test users:", { org1, org1Manager });
}

main();
```

### Phase 6: Testing Checklist
- [ ] Test user registration
- [ ] Test user login (receive JWT)
- [ ] Test protected routes with JWT
- [ ] Test 401 redirect on expired token
- [ ] Test multi-org isolation (org_1 can't see org_2 data)
- [ ] Test all existing features still work with JWT

---

## Backward Compatibility

During migration, support both auth methods:

```typescript
// In middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Try JWT first
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token) {
    try {
      req.user = verifyToken(token);
      return next();
    } catch (e) {
      // Invalid token
    }
  }

  // Fallback to hardcoded org_1 for development
  if (process.env.NODE_ENV === "development") {
    req.user = { userId: "dev_user", orgId: "org_1", role: "admin" };
    return next();
  }

  return res.status(401).json({ error: "Unauthorized" });
}
```

---

## Rollout Strategy

1. **Week 1:** Implement JWT middleware (non-breaking)
2. **Week 2:** Update all route handlers
3. **Week 3:** Frontend login/register screens
4. **Week 4:** Testing & bug fixes
5. **Week 5:** Remove hardcoded fallback, enforce JWT

---

## Security Considerations

- ✅ Passwords hashed with bcrypt (10 rounds)
- ✅ JWT tokens have expiration (24h default)
- ✅ Refresh tokens supported
- ✅ Session revocation on logout
- ⚠️ HTTPS required in production
- ⚠️ CORS configured properly
- ⚠️ Rate limiting on auth endpoints

---

## Notes

- **Current state:** JWT infrastructure exists but not wired up
- **Estimated effort:** 2-3 days full implementation
- **Risk:** Medium - requires testing all routes
- **Priority:** Medium - system works with `org_1`, but not production-ready

