import { describe, it, expect, beforeAll } from "@jest/globals";
import request from "supertest";
import { createServer } from "../server";
import type { Express } from "express";
import { getApiKey } from "./api";

// ============================================================================
// Test Setup
// ============================================================================

let app: Express;
const API_KEY = getApiKey();

beforeAll(() => {
  app = createServer();
});

// ============================================================================
// Metrics Endpoint Tests
// ============================================================================

describe("Metrics Endpoint", () => {
  describe("GET /metrics", () => {
    it("should return 401 without API key", async () => {
      const response = await request(app).get("/metrics");

      expect(response.status).toBe(401);
    });

    it("should return 200 OK with valid API key", async () => {
      const response = await request(app)
        .get("/metrics")
        .set("x-api-key", API_KEY);

      expect(response.status).toBe(200);
    });

    it("should return Prometheus text format", async () => {
      const response = await request(app)
        .get("/metrics")
        .set("x-api-key", API_KEY);

      expect(response.headers["content-type"]).toContain("text/plain");
    });

    it("should include default Node.js metrics", async () => {
      const response = await request(app)
        .get("/metrics")
        .set("x-api-key", API_KEY);

      const body = response.text;

      // Check for default Node.js metrics
      expect(body).toContain("leadrouting_nodejs_heap_size_total_bytes");
      expect(body).toContain("leadrouting_nodejs_heap_size_used_bytes");
      expect(body).toContain("leadrouting_nodejs_external_memory_bytes");
      expect(body).toContain("leadrouting_process_cpu_user_seconds_total");
    });

    it("should include custom HTTP request metrics", async () => {
      // Make a request to generate metrics
      await request(app).get("/health");

      const response = await request(app)
        .get("/metrics")
        .set("x-api-key", API_KEY);

      const body = response.text;

      // Check for custom metrics
      expect(body).toContain("leadrouting_http_requests_total");
      expect(body).toContain("leadrouting_http_request_duration_seconds");
    });

    it("should include routing proposal metrics", async () => {
      const response = await request(app)
        .get("/metrics")
        .set("x-api-key", API_KEY);

      const body = response.text;

      // Check for routing metrics (even if zero)
      expect(body).toContain("leadrouting_proposals_created_total");
      expect(body).toContain("leadrouting_proposals_approved_total");
      expect(body).toContain("leadrouting_proposals_rejected_total");
      expect(body).toContain("leadrouting_proposals_pending_current");
    });

    it("should include Monday.com API metrics", async () => {
      const response = await request(app)
        .get("/metrics")
        .set("x-api-key", API_KEY);

      const body = response.text;

      expect(body).toContain("leadrouting_monday_api_requests_total");
      expect(body).toContain("leadrouting_monday_api_request_duration_seconds");
    });

    it("should include authentication metrics", async () => {
      const response = await request(app)
        .get("/metrics")
        .set("x-api-key", API_KEY);

      const body = response.text;

      expect(body).toContain("leadrouting_auth_login_attempts_total");
      expect(body).toContain("leadrouting_auth_active_sessions_current");
    });

    it("should include error metrics", async () => {
      const response = await request(app)
        .get("/metrics")
        .set("x-api-key", API_KEY);

      const body = response.text;

      expect(body).toContain("leadrouting_errors_total");
    });

    it("should include database metrics", async () => {
      const response = await request(app)
        .get("/metrics")
        .set("x-api-key", API_KEY);

      const body = response.text;

      expect(body).toContain("leadrouting_database_query_duration_seconds");
      expect(body).toContain("leadrouting_database_connections_active");
    });

    it("should include cache metrics", async () => {
      const response = await request(app)
        .get("/metrics")
        .set("x-api-key", API_KEY);

      const body = response.text;

      expect(body).toContain("leadrouting_cache_hits_total");
      expect(body).toContain("leadrouting_cache_misses_total");
    });

    it("should include business metrics", async () => {
      const response = await request(app)
        .get("/metrics")
        .set("x-api-key", API_KEY);

      const body = response.text;

      expect(body).toContain("leadrouting_leads_processed_total");
      expect(body).toContain("leadrouting_agents_active_count");
    });

    it("should track HTTP requests made during test", async () => {
      // Make some test requests
      await request(app).get("/health");
      await request(app).get("/health/liveness");
      await request(app).get("/health/readiness");

      const response = await request(app)
        .get("/metrics")
        .set("x-api-key", API_KEY);

      const body = response.text;

      // Should have tracked at least these requests
      expect(body).toContain('method="GET"');
      expect(body).toContain('status="200"');
    });

    it("should format metrics in Prometheus format", async () => {
      const response = await request(app)
        .get("/metrics")
        .set("x-api-key", API_KEY);

      const body = response.text;

      // Check basic Prometheus format
      expect(body).toContain("# HELP");
      expect(body).toContain("# TYPE");
      
      // Check that metrics have values
      const lines = body.split("\n").filter((l) => !l.startsWith("#") && l.trim().length > 0);
      expect(lines.length).toBeGreaterThan(0);
      
      // Each metric line should have format: metric_name{labels} value
      lines.forEach((line) => {
        expect(line).toMatch(/^[a-z_]+(\{.*\})?\s+[\d.]+$/);
      });
    });
  });
});

