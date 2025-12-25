import { Router } from "express";
import { register } from "../metrics/prometheus";

/**
 * Prometheus Metrics Routes
 * 
 * GET /metrics - Prometheus metrics in text format
 * GET /metrics/json - JSON-formatted metrics for dashboards
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

  /**
   * JSON metrics endpoint for frontend dashboards
   * Returns parsed metrics in JSON format
   */
  r.get("/json", async (_req, res) => {
    try {
      const metrics = await register.getMetricsAsJSON();
      
      // Transform to a more frontend-friendly structure
      const summary: Record<string, any> = {};
      
      for (const metric of metrics) {
        const name = metric.name;
        
        if (metric.type === 'counter') {
          // Sum up all counter values
          const total = metric.values.reduce((sum, v) => sum + (v.value || 0), 0);
          summary[name] = { type: 'counter', value: total, values: metric.values };
        } else if (metric.type === 'gauge') {
          // Use the latest gauge value
          const latest = metric.values[metric.values.length - 1];
          summary[name] = { type: 'gauge', value: latest?.value || 0, values: metric.values };
        } else if (metric.type === 'histogram') {
          // Extract histogram buckets
          summary[name] = { type: 'histogram', values: metric.values };
        }
      }
      
      res.json({
        ok: true,
        timestamp: new Date().toISOString(),
        metrics: summary,
      });
    } catch (error: any) {
      res.status(500).json({
        ok: false,
        error: error.message || 'Failed to fetch metrics',
      });
    }
  });

  return r;
}
