import type { MondayBoardId, MondayBoardSample, MondayItem, MondayColumnValue } from "../contracts/monday.types";

export interface MondayClientConfig {
  /** Monday API token (v2). Provide via env at runtime. */
  token: string;
  /** Monday GraphQL endpoint. Default is https://api.monday.com/v2 */
  endpoint?: string;
  /** Request timeout in ms. */
  timeoutMs?: number;
}

export interface MondayGraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export class MondayClient {
  private endpoint: string;
  private timeoutMs: number;

  constructor(private cfg: MondayClientConfig) {
    this.endpoint = cfg.endpoint ?? "https://api.monday.com/v2";
    this.timeoutMs = cfg.timeoutMs ?? 15_000;
  }
private async postGraphQL<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const maxAttempts = 5;
  const baseDelayMs = 400;

  let lastErr: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.cfg.token,
        },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      });

      // Retry on rate-limit / transient upstream
      if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
        lastErr = new Error(`Monday API transient error HTTP ${res.status}`);
        if (attempt < maxAttempts) {
          const jitter = Math.floor(Math.random() * 200);
          const delay = baseDelayMs * Math.pow(2, attempt - 1) + jitter;
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Monday API HTTP ${res.status}: ${text}`);
      }

      const json = (await res.json()) as MondayGraphQLResponse<T>;

      // GraphQL errors can also be transient; retry a couple times.
      if (json.errors?.length) {
        const msg = json.errors.map((e) => e.message).join("; ");
        const err = new Error(`Monday API GraphQL error: ${msg}`);
        lastErr = err;

        const transient = /rate|limit|timeout|tempor|overload|try again/i.test(msg);
        if (transient && attempt < maxAttempts) {
          const jitter = Math.floor(Math.random() * 200);
          const delay = baseDelayMs * Math.pow(2, attempt - 1) + jitter;
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        throw err;
      }

      if (!json.data) throw new Error("Monday API returned no data.");

      return json.data;
    } catch (e: any) {
      lastErr = e;
      const transient = e?.name === "AbortError";
      if (transient && attempt < maxAttempts) {
        const jitter = Math.floor(Math.random() * 200);
        const delay = baseDelayMs * Math.pow(2, attempt - 1) + jitter;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw e;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastErr ?? new Error("Monday API failed");
}

  /**
   * Generic query method for custom GraphQL queries
   * @param query - GraphQL query or mutation string
   * @param variables - Variables to pass to the query
   * @returns Promise with the response data
   */
  async query<T = any>(query: string, variables: Record<string, unknown> = {}): Promise<{ data: T }> {
    const data = await this.postGraphQL<T>(query, variables);
    return { data };
  }

  /**
   * Fetch sample items for multiple boards.
   * Phase 1 behavior:
   * - Fetch first N items per board (best effort).
   * - Return MondayBoardSample[] for preview normalization.
   *
   * Notes:
   * - We do not attempt to correlate items across boards.
   * - We rely on mapping (boardId, columnId) and user responsibility.
   */
  async fetchBoardSamples(boardIds: MondayBoardId[], limitPerBoard: number): Promise<MondayBoardSample[]> {
    if (boardIds.length === 0) return [];

    // Query boards by ids and fetch items_page. Depending on Monday API version, items_page is recommended.
    // If items_page is not available in your account, replace with `items(limit: X)`.
    const query = `
      query ($boardIds: [ID!], $limit: Int!) {
        boards(ids: $boardIds) {
          id
          items_page(limit: $limit) {
            items {
              id
              name
              column_values {
                id
                text
                value
                type
              }
            }
          }
        }
      }
    `;

    type Gql = {
      boards: Array<{
        id: string;
        items_page?: { items: Array<{ id: string; name?: string | null; column_values: MondayColumnValue[] }> };
      }>;
    };

    const data = await this.postGraphQL<Gql>(query, { boardIds, limit: limitPerBoard });

    const samples: MondayBoardSample[] = (data.boards ?? []).map((b) => {
      const items = (b.items_page?.items ?? []).map<MondayItem>((it) => ({
        id: String(it.id),
        name: it.name ?? null,
        boardId: String(b.id),
        column_values: it.column_values ?? [],
      }));

      return { boardId: String(b.id), items };
    });

    return samples;
  }
async fetchItem(boardId: string, itemId: string) {
  const query = `
    query ($boardId: [ID!], $itemId: [ID!]) {
      boards(ids: $boardId) {
        id
        items(ids: $itemId) {
          id
          name
          column_values {
            id
            text
            value
            type
          }
        }
      }
    }
  `;
  const data = await this.postGraphQL<{ boards: any[] }>(query, { boardId: [boardId], itemId: [itemId] });
  const board = data.boards?.[0];
  const item = board?.items?.[0];
  if (!item) throw new Error("Monday item not found");
  return { boardId: board.id, item };
}

async changeColumnValue(args: { boardId: string; itemId: string; columnId: string; value: any }) {
  const mutation = `
    mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
      change_column_value(board_id: $boardId, item_id: $itemId, column_id: $columnId, value: $value) {
        id
      }
    }
  `;
  return this.postGraphQL(mutation, {
    boardId: args.boardId,
    itemId: args.itemId,
    columnId: args.columnId,
    value: JSON.stringify(args.value),
  });
}


async fetchItemById(itemId: string) {
  const query = `
    query ($itemId: [ID!]) {
      items(ids: $itemId) {
        id
        name
        board { id }
        column_values {
          id
          text
          value
          type
        }
      }
    }
  `;
  const data = await this.postGraphQL<{ items: any[] }>(query, { itemId: [itemId] });
  const item = data.items?.[0];
  if (!item) throw new Error("Monday item not found");
  const boardId = item.board?.id;
  if (!boardId) throw new Error("Monday item board not found");
  return { boardId: String(boardId), item };
}

async listBoards(limit = 200): Promise<Array<{ id: string; name: string }>> {
  const query = `
    query ($limit: Int!) {
      boards(limit: $limit) {
        id
        name
      }
    }
  `;
  type Gql = { boards: Array<{ id: string; name: string }> };
  const data = await this.postGraphQL<Gql>(query, { limit });
  return (data.boards ?? []).map((b) => ({ id: String(b.id), name: b.name }));
}

async listBoardColumns(boardId: string): Promise<Array<{ id: string; title: string; type: string; settings_str?: string | null }>> {
  const query = `
    query ($boardIds: [ID!]!) {
      boards(ids: $boardIds) {
        id
        columns {
          id
          title
          type
          settings_str
        }
      }
    }
  `;
  type Gql = { boards: Array<{ columns: Array<{ id: string; title: string; type: string; settings_str?: string | null }> }> };
  const data = await this.postGraphQL<Gql>(query, { boardIds: [boardId] });
  const cols = data.boards?.[0]?.columns ?? [];
  return cols.map((c) => ({ id: String(c.id), title: c.title, type: String(c.type), settings_str: c.settings_str ?? null }));
}

async fetchUsers() {
  const query = `
    query {
      users {
        id
        name
        email
      }
    }
  `;
  const data = await this.postGraphQL<{ users: any[] }>(query, {});
  return (data.users ?? []).map((u) => ({ id: String(u.id), name: u.name ?? "", email: u.email ?? "" }));
}

}