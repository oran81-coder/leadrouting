import { Router } from "express";
import { register } from "../metrics/prometheus";

/**
 * Prometheus Metrics Routes
 * 
 * GET /metrics - Prometheus metrics in text format
 */
export function metricsRoutes() {
  const r = Router();

  /**
   * Prometheus metrics endpoint
   * Returns metrics in Prometheus text format for scraping
   */
  r.get("/", async (_req, res) => {
    try {
      res.set("Content-Type", register.contentType);
      res.end(await register.metrics());
    } catch (error) {
      res.status(500).end(error);
    }
  });

  return r;
}
