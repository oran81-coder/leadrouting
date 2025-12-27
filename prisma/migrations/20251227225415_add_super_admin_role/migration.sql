-- Add super_admin role to UserRole enum and make orgId nullable for super admins

-- SQLite doesn't support ALTER TABLE to change column types directly
-- We need to use the recreate strategy

-- Step 1: Create new User table with updated schema
CREATE TABLE "User_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT, -- Now nullable for super_admin
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'agent',
    "firstName" TEXT,
    "lastName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Step 2: Copy data from old table to new table
INSERT INTO "User_new" ("id", "orgId", "username", "email", "passwordHash", "role", "firstName", "lastName", "isActive", "lastLoginAt", "createdAt", "updatedAt")
SELECT "id", "orgId", "username", "email", "passwordHash", "role", "firstName", "lastName", "isActive", "lastLoginAt", "createdAt", "updatedAt"
FROM "User";

-- Step 3: Drop old table
DROP TABLE "User";

-- Step 4: Rename new table to User
ALTER TABLE "User_new" RENAME TO "User";

-- Step 5: Recreate indexes
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_orgId_username_key" ON "User"("orgId", "username");
CREATE UNIQUE INDEX "User_orgId_email_key" ON "User"("orgId", "email");
CREATE INDEX "User_orgId_role_idx" ON "User"("orgId", "role");
CREATE INDEX "User_orgId_isActive_idx" ON "User"("orgId", "isActive");
CREATE INDEX "User_orgId_role_isActive_idx" ON "User"("orgId", "role", "isActive");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_lastLoginAt_idx" ON "User"("lastLoginAt");

