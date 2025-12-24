import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import { createServer } from "../server";
import type { Express } from "express";

// ============================================================================
// Test Setup
// ============================================================================

let app: Express;

beforeAll(() => {
  app = createServer();
});

// ============================================================================
// Health Check Tests
// ============================================================================

describe("Health Check Endpoints", () => {
  describe("GET /health", () => {
    it("should return 200 OK with basic health status", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("ok", true);
      expect(response.body).toHaveProperty("timestamp");
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it("should include timestamp in ISO format", async () => {
      const response = await request(app).get("/health");

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });
  });

  describe("GET /health/liveness", () => {
    it("should return 200 OK with liveness status", async () => {
      const response = await request(app).get("/health/liveness");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("ok", true);
      expect(response.body).toHaveProperty("status", "alive");
      expect(response.body).toHaveProperty("timestamp");
    });

    it("should always return success (process is alive)", async () => {
      // Call multiple times to ensure consistency
      for (let i = 0; i < 3; i++) {
        const response = await request(app).get("/health/liveness");
        expect(response.status).toBe(200);
        expect(response.body.ok).toBe(true);
      }
    });
  });

  describe("GET /health/readiness", () => {
    it("should return 200 OK when dependencies are ready", async () => {
      const response = await request(app).get("/health/readiness");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("ok", true);
      expect(response.body).toHaveProperty("status", "ready");
      expect(response.body).toHaveProperty("timestamp");
    });

    it("should check database connectivity", async () => {
      const response = await request(app).get("/health/readiness");

      // Should pass if database is healthy
      if (response.body.ok) {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe("ready");
      } else {
        // Should return 503 if database is unhealthy
        expect(response.status).toBe(503);
        expect(response.body.status).toBe("not_ready");
        expect(response.body).toHaveProperty("reason");
      }
    });
  });

  describe("GET /health/detailed", () => {
    it("should return detailed health status", async () => {
      const response = await request(app).get("/health/detailed");

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.body).toHaveProperty("ok");
      expect(response.body).toHaveProperty("status");
      expect(response.body).toHaveProperty("timestamp");
      expect(response.body).toHaveProperty("checkDuration");
      expect(response.body).toHaveProperty("environment");
    });

    it("should include all dependency checks", async () => {
      const response = await request(app).get("/health/detailed");

      expect(response.body).toHaveProperty("dependencies");
      expect(response.body.dependencies).toHaveProperty("database");
      expect(response.body.dependencies).toHaveProperty("cache");
      expect(response.body.dependencies).toHaveProperty("mondayApi");
    });

    it("should include database status", async () => {
      const response = await request(app).get("/health/detailed");

      const db = response.body.dependencies.database;
      expect(db).toHaveProperty("status");
      expect(db).toHaveProperty("connected");
      expect(db).toHaveProperty("type");
      expect(db.type).toBe("sqlite");
    });

    it("should include cache status", async () => {
      const response = await request(app).get("/health/detailed");

      const cache = response.body.dependencies.cache;
      expect(cache).toHaveProperty("status");
      expect(cache).toHaveProperty("enabled");
      expect(cache).toHaveProperty("connected");
      expect(cache).toHaveProperty("type");
    });

    it("should include Monday.com API status", async () => {
      const response = await request(app).get("/health/detailed");

      const monday = response.body.dependencies.mondayApi;
      expect(monday).toHaveProperty("status");
      expect(monday).toHaveProperty("configured");
      expect(monday).toHaveProperty("connected");
    });

    it("should include version information", async () => {
      const response = await request(app).get("/health/detailed");

      expect(response.body).toHaveProperty("version");
      expect(response.body.version).toHaveProperty("api");
      expect(response.body.version).toHaveProperty("node");
      expect(response.body.version.node).toMatch(/^v\d+\.\d+\.\d+$/);
    });

    it("should return 200 when healthy", async () => {
      const response = await request(app).get("/health/detailed");

      if (response.body.ok === true) {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe("healthy");
      }
    });

    it("should return 503 when unhealthy", async () => {
      const response = await request(app).get("/health/detailed");

      if (response.body.ok === false) {
        expect(response.status).toBe(503);
        expect(response.body.status).toBe("degraded");
      }
    });

    it("should measure check duration", async () => {
      const response = await request(app).get("/health/detailed");

      expect(response.body.checkDuration).toMatch(/^\d+ms$/);
      const duration = parseInt(response.body.checkDuration);
      expect(duration).toBeGreaterThan(0);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });
});
