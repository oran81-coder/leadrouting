# Authentication & Authorization Guide - Phase 5.1

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup & Configuration](#setup--configuration)
4. [Backend Implementation](#backend-implementation)
5. [Frontend Implementation](#frontend-implementation)
6. [API Endpoints](#api-endpoints)
7. [Testing](#testing)
8. [Security Best Practices](#security-best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Overview

Phase 5.1 introduces comprehensive JWT-based authentication and role-based authorization to the Lead Routing System. The system supports three user roles:

- **Admin**: Full system access (configuration, routing, metrics, user management)
- **Manager**: Approval workflows, outcomes dashboard
- **Agent**: Read-only access to assigned leads and outcomes

### Key Features

✅ **JWT-based authentication** - Industry standard, scalable, stateless  
✅ **Role-based access control (RBAC)** - Fine-grained permissions  
✅ **Secure password handling** - bcrypt hashing with 10 rounds  
✅ **Session management** - Database-backed sessions with revocation support  
✅ **Token refresh** - Automatic token renewal for seamless UX  
✅ **Backward compatible** - `AUTH_ENABLED` flag allows gradual rollout  
✅ **Rate limiting** - Strict limits on authentication endpoints (5 req/15min)

---

## Architecture

### System Flow

```
┌─────────────────────────────────────────┐
│  1. User enters credentials             │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  2. POST /auth/login                    │
│     - Validate email/password           │
│     - Generate JWT tokens               │
│     - Save session to DB                │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  3. Client stores tokens                │
│     - localStorage: accessToken (1h)    │
│     - localStorage: refreshToken (7d)   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  4. Subsequent API calls                │
│     Authorization: Bearer <accessToken> │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  5. Middleware: authenticateJWT         │
│     - Extract & verify token            │
│     - Check session in DB               │
│     - Attach user to req.user           │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  6. Route handler processes request     │
└─────────────────────────────────────────┘
```

### Database Schema

```sql
-- User Model
CREATE TABLE "User" (
  id           TEXT PRIMARY KEY,
  orgId        TEXT NOT NULL,
  username     TEXT NOT NULL,
  email        TEXT NOT NULL,
  passwordHash TEXT NOT NULL,
  role         TEXT NOT NULL,  -- 'admin' | 'manager' | 'agent'
  firstName    TEXT,
  lastName     TEXT,
  isActive     BOOLEAN DEFAULT true,
  lastLoginAt  DATETIME,
  createdAt    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt    DATETIME,
  
  UNIQUE(orgId, username),
  UNIQUE(orgId, email)
);

-- Session Model
CREATE TABLE "Session" (
  id               TEXT PRIMARY KEY,
  userId           TEXT NOT NULL,
  token            TEXT UNIQUE NOT NULL,
  refreshToken     TEXT UNIQUE,
  expiresAt        DATETIME NOT NULL,
  refreshExpiresAt DATETIME,
  ipAddress        TEXT,
  userAgent        TEXT,
  isRevoked        BOOLEAN DEFAULT false,
  createdAt        DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);
```

---

## Setup & Configuration

### Backend Environment Variables

Add to `.env`:

```bash
# Authentication & Authorization (Phase 5.1)
AUTH_ENABLED=false  # Set to true to enable auth (backward compatible)
JWT_SECRET=change-me-in-production-min-32-chars-required-for-security
JWT_EXPIRATION=1h  # Access token expiration
JWT_REFRESH_EXPIRATION=7d  # Refresh token expiration
BCRYPT_ROUNDS=10  # Password hashing rounds (10-15 recommended)
```

⚠️ **IMPORTANT**: Change `JWT_SECRET` to a strong random string in production!

```bash
# Generate a secure secret (Linux/Mac):
openssl rand -base64 32

# Or use Node.js:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Frontend Environment Variables

Create `frontend/.env`:

```bash
# API Configuration
VITE_API_URL=http://localhost:3000

# Authentication (Phase 5.1)
VITE_AUTH_ENABLED=false  # Set to "true" to enable auth
```

### Database Migration

Run Prisma migration to create User and Session tables:

```bash
npm run prisma:migrate
```

### Seed Development Users

```bash
npm run seed
```

This creates 3 development users:

| Email                  | Password      | Role    |
|------------------------|---------------|---------|
| admin@example.com      | Password123!  | admin   |
| manager@example.com    | Password123!  | manager |
| agent@example.com      | Password123!  | agent   |

⚠️ **IMPORTANT**: Delete or change these credentials in production!

---

## Backend Implementation

### 1. Auth Service

The core authentication logic lives in `packages/modules/auth/src/application/auth.service.ts`.

**Key Methods:**

```typescript
// User Registration
async register(data: {
  orgId: string;
  username: string;
  email: string;
  password: string;
  role: "admin" | "manager" | "agent";
}): Promise<User>

// User Login
async login(data: {
  orgId: string;
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
  jwtSecret: string;
  jwtExpiration: string;
  jwtRefreshExpiration: string;
}): Promise<{ user: User; accessToken: string; refreshToken: string }>

// Token Verification
async verifyToken(token: string, secret: string): Promise<JWTPayload>

// Token Refresh
async refreshTokens(data: {
  refreshToken: string;
  jwtSecret: string;
  jwtExpiration: string;
  jwtRefreshExpiration: string;
}): Promise<{ user: User; accessToken: string; refreshToken: string }>

// Logout
async logout(token: string, secret: string): Promise<void>
```

### 2. Middleware

#### `authenticateJWT` - Verify JWT and attach user

```typescript
import { authenticateJWT } from "./middleware/auth";

router.get("/protected", authenticateJWT, (req, res) => {
  // req.user is now available
  res.json({ user: req.user });
});
```

#### `requireRole` - Role-based authorization

```typescript
import { authenticateJWT, requireRole } from "./middleware/auth";

// Admin only
router.post("/admin/settings", 
  authenticateJWT, 
  requireRole(["admin"]), 
  handler
);

// Manager or Admin
router.get("/manager/dashboard", 
  authenticateJWT, 
  requireRole(["admin", "manager"]), 
  handler
);
```

#### Convenience Helpers

```typescript
import { requireAdmin, requireManagerOrAdmin } from "./middleware/auth";

// Admin only (shorthand)
router.delete("/users/:id", requireAdmin, handler);

// Manager or Admin (shorthand)
router.get("/proposals", requireManagerOrAdmin, handler);
```

### 3. Protecting Routes

#### Example: Admin Routes

```typescript
import { Router } from "express";
import { requireAdmin } from "../middleware/auth";

const router = Router();

// All routes require admin role
router.use(requireAdmin);

router.get("/settings", getSettings);
router.post("/settings", updateSettings);
router.get("/users", listUsers);
router.post("/users", createUser);

export default router;
```

#### Example: Manager Routes

```typescript
import { Router } from "express";
import { requireManagerOrAdmin } from "../middleware/auth";

const router = Router();

// All routes require manager or admin role
router.use(requireManagerOrAdmin);

router.get("/proposals", listProposals);
router.post("/proposals/:id/approve", approveProposal);
router.post("/proposals/:id/reject", rejectProposal);

export default router;
```

---

## Frontend Implementation

### 1. AuthContext & useAuth Hook

The `AuthContext` provides authentication state and actions throughout the app.

**Usage:**

```typescript
import { useAuth } from "./ui/AuthContext";

function MyComponent() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please login</div>;

  return (
    <div>
      <p>Welcome, {user?.firstName || user?.username}!</p>
      <p>Role: {user?.role}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

**Available Properties:**

```typescript
interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  hasRole: (roles: User["role"][]) => boolean;
}
```

### 2. Login Screen

Automatically shown when user is not authenticated (if `VITE_AUTH_ENABLED=true`).

Features:
- Email/password form with validation
- Show/hide password toggle
- Modern gradient design with dark mode support
- Development quick-login buttons (dev only)
- Error handling with user-friendly messages

### 3. Protected Routes

Use `<ProtectedRoute>` to require authentication:

```typescript
import { ProtectedRoute } from "./ui/ProtectedRoute";

function App() {
  return (
    <ProtectedRoute>
      <YourProtectedContent />
    </ProtectedRoute>
  );
}
```

**With role requirements:**

```typescript
// Admin only
<ProtectedRoute requireRoles={["admin"]}>
  <AdminPanel />
</ProtectedRoute>

// Manager or Admin
<ProtectedRoute requireRoles={["admin", "manager"]}>
  <ManagerDashboard />
</ProtectedRoute>
```

**With custom fallback:**

```typescript
<ProtectedRoute fallback={<CustomUnauthorizedPage />}>
  <SecretContent />
</ProtectedRoute>
```

### 4. Role-Based UI

Hide/show UI elements based on user role:

```typescript
import { useAuth } from "./ui/AuthContext";

function NavigationBar() {
  const { user, hasRole } = useAuth();

  return (
    <nav>
      <a href="/">Home</a>
      {hasRole(["admin", "manager"]) && (
        <a href="/dashboard">Dashboard</a>
      )}
      {hasRole(["admin"]) && (
        <a href="/admin">Admin Panel</a>
      )}
    </nav>
  );
}
```

### 5. API Calls with Auth

All API calls automatically include the JWT token via the `Authorization` header.

**No changes needed** - the `api.ts` module handles this automatically:

```typescript
// This already includes Authorization header if token exists
const proposals = await listProposals({ status: "PENDING" });
```

### 6. Token Auto-Refresh

Tokens are automatically refreshed every 50 minutes (10 minutes before expiration).

The refresh happens in the background - users won't notice interruptions.

---

## API Endpoints

### Public Endpoints (No Auth Required)

#### `GET /auth/status`

Check if authentication is enabled.

**Response:**

```json
{
  "ok": true,
  "authEnabled": true,
  "message": "Authentication is enabled"
}
```

#### `POST /auth/login`

User login.

**Request:**

```json
{
  "email": "admin@example.com",
  "password": "Password123!"
}
```

**Response:**

```json
{
  "ok": true,
  "user": {
    "id": "user_123",
    "orgId": "org_1",
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin",
    "firstName": "Admin",
    "lastName": "User",
    "isActive": true,
    "lastLoginAt": "2025-12-24T10:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**

- `401 Unauthorized` - Invalid credentials
- `401 Unauthorized` - User is inactive
- `429 Too Many Requests` - Rate limit exceeded (5 req/15min)

#### `POST /auth/refresh`

Refresh access token using refresh token.

**Request:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**

```json
{
  "ok": true,
  "user": { /* user object */ },
  "accessToken": "new_access_token",
  "refreshToken": "new_refresh_token"
}
```

### Protected Endpoints (Auth Required)

All protected endpoints require `Authorization: Bearer <accessToken>` header.

#### `GET /auth/me`

Get current user information.

**Response:**

```json
{
  "ok": true,
  "user": {
    "id": "user_123",
    "orgId": "org_1",
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin",
    "firstName": "Admin",
    "lastName": "User",
    "isActive": true
  }
}
```

#### `POST /auth/logout`

Logout and revoke session.

**Response:**

```json
{
  "ok": true,
  "message": "Logged out successfully"
}
```

#### `POST /auth/register` (Admin Only)

Register a new user.

**Request:**

```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "StrongPass123!",
  "role": "agent",
  "firstName": "New",
  "lastName": "User"
}
```

**Response:**

```json
{
  "ok": true,
  "user": { /* new user object */ }
}
```

**Errors:**

- `403 Forbidden` - Only admins can register users
- `400 Bad Request` - Weak password or missing required fields
- `409 Conflict` - Username or email already exists

---

## Testing

### Running Auth Tests

```bash
# Run all tests including auth
npm test

# Run only auth tests
npm test -- auth.spec.ts
```

### Test Coverage

The auth test suite includes:

✅ User registration (valid/invalid data, duplicates)  
✅ User login (correct/incorrect credentials, inactive users)  
✅ Token verification (valid/invalid tokens, wrong secret)  
✅ Token refresh (valid/invalid refresh tokens)  
✅ Logout (session revocation)

### Manual Testing with cURL

#### Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Password123!"
  }'
```

#### Access Protected Endpoint

```bash
export TOKEN="your_access_token_here"

curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

#### Refresh Token

```bash
export REFRESH_TOKEN="your_refresh_token_here"

curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}"
```

#### Logout

```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

---

## Security Best Practices

### 1. JWT Secret

⚠️ **CRITICAL**: Use a strong, random JWT secret in production!

```bash
# Generate secure secret (32+ characters)
openssl rand -base64 32
```

Never commit secrets to version control. Use environment variables or secret management services (AWS Secrets Manager, Azure Key Vault, etc.).

### 2. Password Requirements

Current requirements (enforced by `AuthService.validatePassword`):

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

### 3. bcrypt Rounds

Default: 10 rounds

Higher rounds = more secure but slower. Recommended: 10-15.

```bash
# Adjust in .env if needed
BCRYPT_ROUNDS=12
```

### 4. Token Expiration

**Access Token**: 1 hour (short-lived)  
**Refresh Token**: 7 days (long-lived)

Adjust based on your security requirements:

```bash
# More secure (shorter expiration)
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=1d

# Less secure (longer expiration)
JWT_EXPIRATION=8h
JWT_REFRESH_EXPIRATION=30d
```

### 5. Rate Limiting

Authentication endpoints have strict rate limits:

- **POST /auth/login**: 5 requests per 15 minutes per IP
- **POST /auth/register**: 5 requests per 15 minutes per IP
- **POST /auth/refresh**: 10 requests per 15 minutes per IP

### 6. HTTPS Only (Production)

Always use HTTPS in production to prevent token interception.

```bash
# Enforce HTTPS (production)
NODE_ENV=production
HTTPS_ONLY=true
```

### 7. Session Revocation

Sessions can be revoked immediately via the database:

```sql
-- Revoke all sessions for a user
UPDATE "Session" SET "isRevoked" = true WHERE "userId" = 'user_123';

-- Revoke a specific session
UPDATE "Session" SET "isRevoked" = true WHERE "token" = 'token_value';
```

### 8. Password Reset Flow (Future)

Phase 5.1 does not include password reset. Implement in Phase 5.2+:

1. User requests password reset
2. Generate secure reset token (expiring link)
3. Send email with reset link
4. User clicks link and sets new password
5. Invalidate reset token

---

## Troubleshooting

### Issue: "Invalid token" error

**Cause:** Token expired, revoked, or invalid.

**Solution:**
1. Check if token is expired (decode JWT at jwt.io)
2. Try refreshing token with `/auth/refresh`
3. Re-login if refresh fails

### Issue: "Authentication required" but I'm logged in

**Cause:** Token not being sent or lost from localStorage.

**Solution:**
1. Check browser console for errors
2. Verify token exists in localStorage: `localStorage.getItem('lead_routing_access_token')`
3. Check if `VITE_AUTH_ENABLED=true` in frontend `.env`

### Issue: "Forbidden - insufficient permissions"

**Cause:** User role doesn't have access to requested resource.

**Solution:**
1. Check user role: `req.user.role` (backend) or `user.role` (frontend)
2. Verify route requires correct roles
3. Login with appropriate user (admin for admin routes)

### Issue: Login rate limit exceeded

**Cause:** Too many failed login attempts (5 per 15 minutes).

**Solution:**
1. Wait 15 minutes
2. Check if credentials are correct
3. Increase rate limit in development (see `RATE_LIMITING_GUIDE.md`)

### Issue: Token refresh fails

**Cause:** Refresh token expired, revoked, or invalid.

**Solution:**
1. Check refresh token expiration (default: 7 days)
2. Re-login to get new tokens
3. Check if session was manually revoked in database

### Issue: Frontend shows login screen in development

**Cause:** `VITE_AUTH_ENABLED` not set correctly.

**Solution:**
1. Create `frontend/.env` if it doesn't exist
2. Add `VITE_AUTH_ENABLED=false` for development without auth
3. Restart frontend dev server (`npm run dev`)

---

## Migration Strategy

### Phase 1: Deploy with Auth Disabled (Current State)

```bash
# Backend
AUTH_ENABLED=false

# Frontend
VITE_AUTH_ENABLED=false
```

✅ All existing functionality works  
✅ No breaking changes  
✅ Auth endpoints available but optional

### Phase 2: Create User Accounts

1. Enable auth on backend: `AUTH_ENABLED=true`
2. Use seed script or `/auth/register` to create users
3. Assign appropriate roles (admin/manager/agent)
4. Test login with each role

### Phase 3: Enable Frontend Auth

1. Set `VITE_AUTH_ENABLED=true` in frontend
2. Deploy frontend changes
3. Users must login to access app
4. Provide credentials to team

### Phase 4: Enforce Auth (Optional)

1. Remove backward compatibility flag
2. Remove `AUTH_ENABLED` check from middleware
3. All routes require authentication
4. Deprecate old API key auth (if used)

---

## What's Next?

### Phase 5.2 - Advanced Auth Features (Future)

- [ ] Password reset flow
- [ ] Email verification
- [ ] "Remember me" functionality
- [ ] Multi-factor authentication (MFA)
- [ ] OAuth integration (Google, Microsoft)
- [ ] Monday.com SSO integration
- [ ] Session management UI (admin)
- [ ] Audit log for auth events

---

## Support

For questions or issues:

1. Check this guide first
2. Review `PHASE_5_1_PROGRESS_REPORT.md` for implementation details
3. Check `TESTING_GUIDE.md` for general testing help
4. Check `RATE_LIMITING_GUIDE.md` for rate limit configuration

---

**Phase 5.1 Status:** ✅ **COMPLETE**  
**Last Updated:** December 24, 2025  
**Documentation Version:** 1.0

