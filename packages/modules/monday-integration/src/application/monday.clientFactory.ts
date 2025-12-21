import { MondayClient } from "../infrastructure/monday.client";

export interface MondayClientFactoryDeps {
  token: string;
  endpoint?: string;
  timeoutMs?: number;
}

export function createMondayClient(deps: MondayClientFactoryDeps): MondayClient {
  return new MondayClient({
    token: deps.token,
    endpoint: deps.endpoint,
    timeoutMs: deps.timeoutMs,
  });
}
