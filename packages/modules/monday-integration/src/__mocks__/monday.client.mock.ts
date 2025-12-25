/**
 * Mock Monday.com Client for Testing
 * Provides realistic mock responses without making real API calls
 */

export interface MondayBoard {
  id: string;
  name: string;
  columns: MondayColumn[];
}

export interface MondayColumn {
  id: string;
  title: string;
  type: string;
}

export interface MondayItem {
  id: string;
  name: string;
  board: {
    id: string;
  };
  column_values: Array<{
    id: string;
    text: string;
    value: string | null;
  }>;
}

/**
 * Mock data store
 */
const mockBoards: MondayBoard[] = [
  {
    id: "board_123",
    name: "Leads Board",
    columns: [
      { id: "name", title: "Name", type: "name" },
      { id: "people", title: "Assigned To", type: "people" },
      { id: "status", title: "Status", type: "status" },
      { id: "deal_stage", title: "Deal Stage", type: "status" },
      { id: "text", title: "Country", type: "text" },
      { id: "numbers", title: "Budget", type: "numbers" },
      { id: "dropdown", title: "Industry", type: "dropdown" },
      { id: "date", title: "Next Call Date", type: "date" },
    ],
  },
  {
    id: "board_456",
    name: "Deals Board",
    columns: [
      { id: "name", title: "Deal Name", type: "name" },
      { id: "people", title: "Owner", type: "people" },
      { id: "status", title: "Stage", type: "status" },
      { id: "numbers", title: "Deal Amount", type: "numbers" },
    ],
  },
];

const mockItems: MondayItem[] = [
  {
    id: "item_1",
    name: "Lead from Israel",
    board: { id: "board_123" },
    column_values: [
      { id: "people", text: "", value: null },
      { id: "status", text: "New", value: '{"label":"New"}' },
      { id: "deal_stage", text: "Open", value: '{"label":"Open"}' },
      { id: "text", text: "IL", value: "IL" },
      { id: "numbers", text: "1200", value: "1200" },
      { id: "dropdown", text: "Technology", value: '{"labels":["Technology"]}' },
      { id: "date", text: "2025-01-05", value: '{"date":"2025-01-05"}' },
    ],
  },
  {
    id: "item_2",
    name: "Lead from USA",
    board: { id: "board_123" },
    column_values: [
      { id: "people", text: "John Doe", value: '{"personsAndTeams":[{"id":12345,"kind":"person"}]}' },
      { id: "status", text: "Contacted", value: '{"label":"Contacted"}' },
      { id: "deal_stage", text: "Closed Won", value: '{"label":"Closed Won"}' },
      { id: "text", text: "US", value: "US" },
      { id: "numbers", text: "5000", value: "5000" },
      { id: "dropdown", text: "Finance", value: '{"labels":["Finance"]}' },
      { id: "date", text: "2025-01-10", value: '{"date":"2025-01-10"}' },
    ],
  },
];

const mockUsers = [
  { id: "user_1", name: "Alice Smith", email: "alice@example.com" },
  { id: "user_2", name: "Bob Jones", email: "bob@example.com" },
  { id: "user_3", name: "Carol White", email: "carol@example.com" },
];

/**
 * Mock Monday.com Client
 */
export class MockMondayClient {
  private callCount = 0;
  private shouldFail = false;
  private failureMessage = "Mock API error";

  /**
   * Configure mock to fail on next call
   */
  setNextCallFails(message = "Mock API error"): void {
    this.shouldFail = true;
    this.failureMessage = message;
  }

  /**
   * Reset mock state
   */
  reset(): void {
    this.callCount = 0;
    this.shouldFail = false;
  }

  /**
   * Get call count (for testing)
   */
  getCallCount(): number {
    return this.callCount;
  }

  /**
   * List all boards (compatible with MondayClient interface)
   */
  async listBoards(): Promise<MondayBoard[]> {
    this.callCount++;
    
    if (this.shouldFail) {
      const error = new Error(this.failureMessage);
      this.shouldFail = false;
      throw error;
    }

    return mockBoards;
  }

  /**
   * List columns for a specific board
   */
  async listBoardColumns(boardId: string): Promise<Array<{ id: string; title: string; type: string; settings_str?: string | null }>> {
    this.callCount++;
    
    if (this.shouldFail) {
      const error = new Error(this.failureMessage);
      this.shouldFail = false;
      throw error;
    }

    const board = mockBoards.find(b => b.id === boardId);
    if (!board) {
      return [];
    }

    // For status columns, add mock settings_str with labels
    return board.columns.map(col => {
      if (col.type === "status") {
        // Mock status column settings with typical labels
        return {
          ...col,
          settings_str: JSON.stringify({
            labels: {
              "0": "New",
              "1": "In Treatment",
              "2": "Relevant",
              "3": "No Answer",
              "4": "Follow Up",
              "5": "Closed Won",
              "6": "Closed Lost"
            },
            labels_colors: {
              "0": { color: "#fdab3d", border: "#e99729", var_name: "orange" },
              "1": { color: "#0086c0", border: "#007099", var_name: "blue" },
              "2": { color: "#00c875", border: "#00a25e", var_name: "green" },
              "3": { color: "#e2445c", border: "#ce3048", var_name: "red" },
              "4": { color: "#a25ddc", border: "#8b4ec6", var_name: "purple" },
              "5": { color: "#00c875", border: "#00a25e", var_name: "green-shadow" },
              "6": { color: "#c4c4c4", border: "#b0b0b0", var_name: "grey" }
            }
          })
        };
      }
      return { ...col, settings_str: null };
    });
  }

  /**
   * List status labels for a status column
   */
  async listStatusLabels(boardId: string, columnId: string): Promise<Array<{ key: string; label: string }>> {
    this.callCount++;
    
    if (this.shouldFail) {
      const error = new Error(this.failureMessage);
      this.shouldFail = false;
      throw error;
    }

    const columns = await this.listBoardColumns(boardId);
    const column = columns.find(c => c.id === columnId);
    
    if (!column || column.type !== "status" || !column.settings_str) {
      return [];
    }

    try {
      const settings = JSON.parse(column.settings_str);
      const labels = settings?.labels ?? {};
      return Object.entries(labels).map(([key, label]) => ({
        key: String(key),
        label: String(label)
      }));
    } catch {
      return [];
    }
  }

  /**
   * Fetch board samples (items from multiple boards)
   */
  async fetchBoardSamples(boardIds: string[], limitPerBoard: number = 10): Promise<any[]> {
    this.callCount++;

    if (this.shouldFail) {
      const error = new Error(this.failureMessage);
      this.shouldFail = false;
      throw error;
    }

    return boardIds.map(boardId => {
      const items = mockItems
        .filter(item => item.board.id === boardId)
        .slice(0, limitPerBoard);
      
      return {
        boardId,
        items,
      };
    });
  }

  /**
   * Mock GraphQL query
   */
  async query(query: string, variables?: Record<string, any>): Promise<any> {
    this.callCount++;

    if (this.shouldFail) {
      const error = new Error(this.failureMessage);
      this.shouldFail = false;
      throw error;
    }

    // Parse query to determine what to return
    if (query.includes("boards") && query.includes("columns")) {
      // Fetch boards with columns
      return {
        data: {
          boards: mockBoards,
        },
      };
    }

    if (query.includes("boards") && query.includes("items")) {
      // Fetch items from board
      const boardId = variables?.boardId || "board_123";
      const items = mockItems.filter((item) => item.board.id === boardId);
      return {
        data: {
          boards: [
            {
              id: boardId,
              items,
            },
          ],
        },
      };
    }

    if (query.includes("users")) {
      // Fetch users
      return {
        data: {
          users: mockUsers,
        },
      };
    }

    if (query.includes("items") && query.includes("column_values")) {
      // Fetch specific item
      const itemId = variables?.itemId || "item_1";
      const item = mockItems.find((i) => i.id === itemId);
      return {
        data: {
          items: item ? [item] : [],
        },
      };
    }

    // Default empty response
    return { data: {} };
  }

  /**
   * Mock GraphQL mutation
   */
  async mutate(mutation: string, variables?: Record<string, any>): Promise<any> {
    this.callCount++;

    if (this.shouldFail) {
      this.shouldFail = false;
      throw new Error(this.failureMessage);
    }

    // Parse mutation to determine what to return
    if (mutation.includes("change_column_value")) {
      // Update column value
      return {
        data: {
          change_column_value: {
            id: variables?.itemId || "item_1",
          },
        },
      };
    }

    if (mutation.includes("create_item")) {
      // Create new item
      return {
        data: {
          create_item: {
            id: `item_${Date.now()}`,
            name: variables?.itemName || "New Item",
          },
        },
      };
    }

    // Default success response
    return { data: { success: true } };
  }
}

/**
 * Factory function for creating mock client
 */
export function createMockMondayClient(): MockMondayClient {
  return new MockMondayClient();
}

/**
 * Mock data getters for tests
 */
export const mockData = {
  boards: mockBoards,
  items: mockItems,
  users: mockUsers,
};

