import { createMondayClient } from "./monday.clientFactory";
import { PrismaMondayCredentialRepo } from "../infrastructure/mondayCredential.repo";

export async function createMondayClientForOrg(orgId: string) {
  const repo = new PrismaMondayCredentialRepo();
  const cred = await repo.get(orgId);
  if (!cred) return null; // Return null instead of throwing error
  return createMondayClient({ token: cred.token, endpoint: cred.endpoint });
}
