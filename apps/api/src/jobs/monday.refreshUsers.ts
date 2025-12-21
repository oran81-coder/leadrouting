import { createMondayClient } from "../../../../packages/modules/monday-integration/src/application/monday.clientFactory";
import { refreshMondayUsersCache } from "../../../../packages/modules/monday-integration/src/application/monday.people";
import { requireEnv, optionalEnv } from "../config/env";

/**
 * Run as a lightweight job (can be wired to cron in Phase 2).
 * For Phase 1 you can trigger via POST /admin/monday/users/refresh.
 */
export async function runRefreshMondayUsersJob(orgId: string): Promise<{ count: number }> {
  const token = requireEnv("MONDAY_API_TOKEN");
  const endpoint = optionalEnv("MONDAY_API_ENDPOINT", "https://api.monday.com/v2");
  const client = createMondayClient({ token, endpoint });

  const count = await refreshMondayUsersCache(client as any, orgId);
  return { count };
}
