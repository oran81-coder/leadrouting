# Monday Users Cache (DB)

## Why
People writeback requires a numeric Monday userId.
Rules may store: userId / email / name.
We resolve (email|name) -> userId using a persisted cache to avoid:
- slow calls on every approval/apply
- failures when API is rate-limited

## Storage
Prisma model: `MondayUserCache`
Unique: (orgId, userId)

## Refresh
- API: `POST /admin/monday/users/refresh`
- Job helper: `apps/api/src/jobs/monday.refreshUsers.ts`

Recommended:
- refresh on deployment
- refresh daily (Phase 2 cron)
