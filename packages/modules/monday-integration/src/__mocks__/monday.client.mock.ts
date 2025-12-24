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
      { id: "text", title: "Country", type: "text" },
      { id: "numbers", title: "Budget", type: "numbers" },
      { id: "dropdown", title: "Industry", type: "dropdown" },
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
      { id: "text", text: "IL", value: "IL" },
      { id: "numbers", text: "1200", value: "1200" },
      { id: "dropdown", text: "Technology", value: '{"labels":["Technology"]}' },
    ],
  },
  {
    id: "item_2",
    name: "Lead from USA",
    board: { id: "board_123" },
    column_values: [
      { id: "people", text: "John Doe", value: '{"personsAndTeams":[{"id":12345,"kind":"person"}]}' },
      { id: "status", text: "Contacted", value: '{"label":"Contacted"}' },
      { id: "text", text: "US", value: "US" },
      { id: "numbers", text: "5000", value: "5000" },
      { id: "dropdown", text: "Finance", value: '{"labels":["Finance"]}' },
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

