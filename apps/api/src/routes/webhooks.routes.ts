/**
 * Webhooks Routes - Handle incoming webhooks from Monday.com
 * Phase 2: Real-time Integration
 */

import { Router } from "express";
import { logger } from "../config/logger";
import { verifyMondaySignature } from "../../../../packages/modules/monday-integration/src/application/monday.webhooks";
import { handleNewLead, handleColumnChange } from "../../../../packages/modules/monday-integration/src/application/leadIntake.handler";

export function webhooksRoutes() {
  const r = Router();

  /**
   * POST /webhooks/monday
   * Receive webhooks from Monday.com
   * 
   * Security: Validates signature before processing
   * Performance: Responds quickly (200 OK) to avoid Monday.com timeouts
   */
  r.post("/monday", async (req, res) => {
    try {
      const signature = req.headers["authorization"];
      const body = req.body;

      logger.info("📨 Received webhook from Monday.com", {
        event: body.event,
        boardId: body.boardId,
        pulseId: body.pulseId,
      });

      // Validate required fields
      if (!body.event) {
        logger.warn("⚠️ Webhook missing 'event' field");
        return res.status(400).json({ error: "Missing event field" });
      }

      // Verify signature (security check)
      if (!verifyMondaySignature(signature as string | undefined, body)) {
        logger.warn("⚠️ Invalid webhook signature");
        return res.status(401).json({ error: "Invalid signature" });
      }

      // Extract webhook data
      const { event, boardId, pulseId, pulseName, columnId, value } = body;

      // Validate event-specific required fields
      if (event === "create_pulse" && (!boardId || !pulseId || !pulseName)) {
        logger.warn("⚠️ create_pulse webhook missing required fields");
        return res.status(400).json({ error: "Missing required fields for create_pulse" });
      }

      // Handle different webhook events (async, but respond immediately)
      if (event === "create_pulse") {
        // Process in background (don't await to respond quickly)
        handleNewLead({
          boardId,
          pulseId,
          pulseName,
          orgId: "org_1", // TODO: Extract from webhook or use auth
        }).catch((error) => {
          logger.error("❌ Failed to process new lead:", error);
        });
      } else if (event === "change_column_value") {
        // Process in background
        handleColumnChange({
          boardId,
          pulseId,
          columnId,
          value,
          orgId: "org_1",
        }).catch((error) => {
          logger.error("❌ Failed to process column change:", error);
        });
      } else {
        logger.info(`ℹ️ Unhandled webhook event: ${event}`);
      }

      // Always respond quickly to Monday.com (within 3 seconds)
      res.status(200).json({ ok: true, received: true });
    } catch (error: any) {
      logger.error("❌ Webhook processing error:", error);
      
      // Still respond with 200 to avoid Monday.com retries
      // We log errors internally for debugging
      res.status(200).json({ ok: true, error: error.message });
    }
  });

  /**
   * GET /webhooks/test
   * Test endpoint to verify webhook infrastructure
   */
  r.get("/test", async (_req, res) => {
    res.json({
      ok: true,
      message: "Webhook infrastructure is operational",
      timestamp: new Date().toISOString(),
    });
  });

  return r;
}

