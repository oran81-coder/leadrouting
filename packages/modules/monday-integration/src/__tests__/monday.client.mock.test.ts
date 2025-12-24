import { describe, it, expect, beforeEach } from "@jest/globals";
import { MockMondayClient, mockData } from "../__mocks__/monday.client.mock";

describe("MockMondayClient", () => {
  let client: MockMondayClient;

  beforeEach(() => {
    client = new MockMondayClient();
  });

  describe("query", () => {
    it("should return boards with columns", async () => {
      const response = await client.query("query { boards { id name columns { id title type } } }");

      expect(response.data.boards).toBeDefined();
      expect(response.data.boards.length).toBeGreaterThan(0);
      expect(response.data.boards[0]).toHaveProperty("id");
      expect(response.data.boards[0]).toHaveProperty("name");
      expect(response.data.boards[0]).toHaveProperty("columns");
    });

    it("should return items from a board", async () => {
      const response = await client.query(
        "query { boards { items { id name } } }",
        { boardId: "board_123" }
      );

      expect(response.data.boards[0].items).toBeDefined();
      expect(response.data.boards[0].items.length).toBeGreaterThan(0);
    });

    it("should return users", async () => {
      const response = await client.query("query { users { id name email } }");

      expect(response.data.users).toBeDefined();
      expect(response.data.users.length).toBe(3);
      expect(response.data.users[0]).toHaveProperty("email");
    });

    it("should increment call count", async () => {
      expect(client.getCallCount()).toBe(0);

      await client.query("query { boards }");
      expect(client.getCallCount()).toBe(1);

      await client.query("query { users }");
      expect(client.getCallCount()).toBe(2);
    });

    it("should throw error when configured to fail", async () => {
      client.setNextCallFails("Test error");

      await expect(client.query("query { boards }")).rejects.toThrow("Test error");
    });

    it("should reset failure state after throwing", async () => {
      client.setNextCallFails("Test error");

      await expect(client.query("query { boards }")).rejects.toThrow();

      // Next call should succeed
      const response = await client.query("query { boards { id name columns { id title type } } }");
      expect(response.data).toBeDefined();
      expect(response.data.boards).toBeDefined();
      expect(response.data.boards.length).toBeGreaterThan(0);
    });
  });

  describe("mutate", () => {
    it("should update column value", async () => {
      const response = await client.mutate(
        "mutation { change_column_value }",
        { itemId: "item_1", columnId: "status", value: "Done" }
      );

      expect(response.data.change_column_value).toBeDefined();
      expect(response.data.change_column_value.id).toBe("item_1");
    });

    it("should create new item", async () => {
      const response = await client.mutate(
        "mutation { create_item }",
        { boardId: "board_123", itemName: "New Lead" }
      );

      expect(response.data.create_item).toBeDefined();
      expect(response.data.create_item.id).toMatch(/^item_/);
      expect(response.data.create_item.name).toBe("New Lead");
    });

    it("should throw error when configured to fail", async () => {
      client.setNextCallFails("Mutation failed");

      await expect(
        client.mutate("mutation { change_column_value }")
      ).rejects.toThrow("Mutation failed");
    });
  });

  describe("reset", () => {
    it("should reset call count", async () => {
      await client.query("query { boards }");
      await client.query("query { users }");
      expect(client.getCallCount()).toBe(2);

      client.reset();
      expect(client.getCallCount()).toBe(0);
    });
  });

  describe("mockData", () => {
    it("should provide access to mock boards", () => {
      expect(mockData.boards).toBeDefined();
      expect(mockData.boards.length).toBeGreaterThan(0);
      expect(mockData.boards[0].id).toBe("board_123");
    });

    it("should provide access to mock items", () => {
      expect(mockData.items).toBeDefined();
      expect(mockData.items.length).toBeGreaterThan(0);
      expect(mockData.items[0].id).toBe("item_1");
    });

    it("should provide access to mock users", () => {
      expect(mockData.users).toBeDefined();
      expect(mockData.users.length).toBe(3);
      expect(mockData.users[0].id).toBe("user_1");
    });
  });
});

