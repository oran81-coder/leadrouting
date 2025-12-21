import { createMondayClient } from "./monday.clientFactory";
import { PrismaMondayCredentialRepo } from "../infrastructure/mondayCredential.repo";

export async function createMondayClientForOrg(orgId: string) {
  const repo = new PrismaMondayCredentialRepo();
  const cred = await repo.get(orgId);
  if (!cred) throw new Error("Monday not connected (missing credentials)");
  return createMondayClient({ token: cred.token, endpoint: cred.endpoint });
}
