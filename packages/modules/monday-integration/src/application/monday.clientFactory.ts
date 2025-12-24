import { MondayClient } from "../infrastructure/monday.client";
import { MockMondayClient } from "../__mocks__/monday.client.mock";

export interface MondayClientFactoryDeps {
  token: string;
  endpoint?: string;
  timeoutMs?: number;
}

export function createMondayClient(deps: MondayClientFactoryDeps): MondayClient {
  // Check if MONDAY_USE_MOCK is enabled (Phase 1 development)
  if (process.env.MONDAY_USE_MOCK === "true") {
    console.log("[createMondayClient] Using MockMondayClient (MONDAY_USE_MOCK=true)");
    return new MockMondayClient() as any as MondayClient;
  }

  return new MondayClient({
    token: deps.token,
    endpoint: deps.endpoint,
    timeoutMs: deps.timeoutMs,
  });
}
