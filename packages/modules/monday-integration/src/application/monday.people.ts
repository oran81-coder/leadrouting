import { PrismaMondayUserCacheRepo } from "../infrastructure/mondayUserCache.repo";

type UserLite = { id: string; name: string; email: string };

const CACHE_TTL_MS = 10 * 60 * 1000;
let inMemory: { at: number; users: UserLite[] } | null = null;

function isNumericId(v: string): boolean {
  return /^[0-9]+$/.test(v.trim());
}

async function getUsersInMemoryOrDb(client: any, orgId: string): Promise<UserLite[]> {
  const now = Date.now();
  if (inMemory && now - inMemory.at < CACHE_TTL_MS) return inMemory.users;

  const repo = new PrismaMondayUserCacheRepo();
  const cached = await repo.list(orgId);
  if (cached.length) {
    const users = cached.map((u) => ({ id: u.userId, name: u.name, email: u.email }));
    inMemory = { at: now, users };
    return users;
  }

  // Fallback: fetch from Monday if cache empty
  const users = await client.fetchUsers();
  await repo.upsertMany(orgId, users);
  inMemory = { at: now, users };
  return users;
}

/**
 * Force refresh of Monday users cache from API.
 */
export async function refreshMondayUsersCache(client: any, orgId: string): Promise<number> {
  const users = await client.fetchUsers();
  const repo = new PrismaMondayUserCacheRepo();
  await repo.upsertMany(orgId, users);
  inMemory = { at: Date.now(), users };
  return users.length;
}

/**
 * Resolve a rule action value into a Monday person id.
 * Accepted inputs:
 * - numeric string id ("12345")
 * - email ("name@company.com")
 * - full name exact match ("John Doe") [case-insensitive]
 *
 * Uses DB cache first; refresh can be triggered via admin endpoint.
 */
export async function resolveMondayPersonId(client: any, orgId: string, identifier: string): Promise<number> {
  const v = String(identifier ?? "").trim();
  if (!v) throw new Error("Empty assignee identifier");
  if (isNumericId(v)) return Number(v);

  const users = await getUsersInMemoryOrDb(client, orgId);

  const byEmail = users.filter((u) => u.email && u.email.toLowerCase() === v.toLowerCase());
  if (byEmail.length === 1) return Number(byEmail[0].id);
  if (byEmail.length > 1) throw new Error(`Ambiguous assignee email '${v}'`);

  const byName = users.filter((u) => u.name && u.name.toLowerCase() === v.toLowerCase());
  if (byName.length === 1) return Number(byName[0].id);
  if (byName.length > 1) throw new Error(`Ambiguous assignee name '${v}'`);

  throw new Error(`Assignee '${v}' not found in Monday users cache`);
}
