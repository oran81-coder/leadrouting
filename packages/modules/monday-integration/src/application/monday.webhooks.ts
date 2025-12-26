/**
 * Monday.com Webhook Registration & Management
 * Phase 2: Real-time Integration
 */

import { logger } from "../../../../../packages/core/src/shared/logger";
import type { MondayClient } from "../infrastructure/monday.client";
import { getPrisma } from "../../../../../packages/core/src/db/prisma";
import crypto from "crypto";
import { env } from "../../../../../apps/api/src/config/env";

/**
 * Register a webhook with Monday.com
 */
export async function registerMondayWebhook(config: {
  mondayClient: MondayClient;
  boardId: string;
  webhookUrl: string;
  event?: string;
  orgId?: string;
}): Promise<string> {
  const event = config.event || "create_pulse";
  const orgId = config.orgId || "org_1";
  const prisma = getPrisma();

  try {
    logger.info(`Registering webhook for board ${config.boardId}, event: ${event}`);

    // Check if webhook already exists
    const existing = await prisma.mondayWebhook.findUnique({
      where: {
        orgId_boardId_event: {
          orgId,
          boardId: config.boardId,
          event,
        },
      },
    });

    if (existing && existing.isActive) {
      logger.info(`Webhook already exists: ${existing.webhookId}`);
      return existing.webhookId;
    }

    // Create webhook via Monday.com API
    const mutation = `
      mutation CreateWebhook($boardId: ID!, $url: String!, $event: WebhookEventType!) {
        create_webhook(
          board_id: $boardId,
          url: $url,
          event: $event
        ) {
          id
          board_id
        }
      }
    `;

    const result = await config.mondayClient.query(mutation, {
      boardId: config.boardId,
      url: config.webhookUrl,
      event,
    });

    const webhookId = result.data.create_webhook.id;
    logger.info(`✅ Webhook created: ${webhookId}`);

    // Save to database
    await prisma.mondayWebhook.upsert({
      where: {
        orgId_boardId_event: {
          orgId,
          boardId: config.boardId,
          event,
        },
      },
      create: {
        orgId,
        boardId: config.boardId,
        webhookId,
        url: config.webhookUrl,
        event,
        isActive: true,
      },
      update: {
        webhookId,
        url: config.webhookUrl,
        isActive: true,
        updatedAt: new Date(),
      },
    });

    return webhookId;
  } catch (error: any) {
    logger.error(`Failed to register webhook: ${error.message}`, { error, config });
    throw error;
  }
}

/**
 * Delete a webhook from Monday.com
 */
export async function deleteMondayWebhook(config: {
  mondayClient: MondayClient;
  webhookId: string;
}): Promise<void> {
  const prisma = getPrisma();
  
  try {
    logger.info(`Deleting webhook: ${config.webhookId}`);

    const mutation = `
      mutation DeleteWebhook($id: ID!) {
        delete_webhook(id: $id) {
          id
        }
      }
    `;

    await config.mondayClient.query(mutation, { id: config.webhookId });

    // Mark as inactive in database
    await prisma.mondayWebhook.updateMany({
      where: { webhookId: config.webhookId },
      data: { isActive: false, updatedAt: new Date() },
    });

    logger.info(`✅ Webhook deleted: ${config.webhookId}`);
  } catch (error: any) {
    logger.error(`Failed to delete webhook: ${error.message}`, { error, webhookId: config.webhookId });
    throw error;
  }
}

/**
 * Verify Monday.com webhook signature
 * Security: Validates webhook authenticity using HMAC SHA256
 */
export function verifyMondaySignature(authHeader: string | undefined, body: any): boolean {
  // Monday.com sends Authorization header with signature
  if (!authHeader) {
    logger.warn("⚠️ No authorization header in webhook request");
    return false;
  }

  // If WEBHOOK_SECRET is not configured, skip verification (dev mode only)
  if (!env.WEBHOOK_SECRET) {
    logger.warn("⚠️ WEBHOOK_SECRET not configured, skipping signature verification");
    return true;
  }

  try {
    // Monday.com signature format: "v1=<signature>"
    const signatureParts = authHeader.split("=");
    if (signatureParts.length !== 2 || signatureParts[0] !== "v1") {
      logger.warn("⚠️ Invalid signature format");
      return false;
    }

    const providedSignature = signatureParts[1];
    
    // Calculate expected signature
    const payload = JSON.stringify(body);
    const expectedSignature = crypto
      .createHmac("sha256", env.WEBHOOK_SECRET)
      .update(payload)
      .digest("hex");

    // Compare signatures (constant-time comparison)
    const isValid = crypto.timingSafeEqual(
      Buffer.from(providedSignature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      logger.warn("⚠️ Webhook signature verification failed");
    }

    return isValid;
  } catch (error: any) {
    logger.error(`Failed to verify webhook signature: ${error.message}`);
    return false;
  }
}

