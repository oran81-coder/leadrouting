import type { MondayClient } from "../infrastructure/monday.client";
import type { WritebackTargets } from "../../../field-mapping/src/contracts/mapping.types";

export type ApplyAssignmentInput = {
  boardId: string;
  itemId: string;
  assigneeValue: string; // usually monday user id (for people) or text/status label
  reason?: string;
  status?: string;
};

/**
 * Writeback retry configuration
 */
export interface WritebackRetryConfig {
  maxAttempts: number;        // Default: 3
  initialDelayMs: number;     // Default: 1000 (1 second)
  maxDelayMs: number;         // Default: 10000 (10 seconds)
  backoffMultiplier: number;  // Default: 2 (exponential)
}

const DEFAULT_RETRY_CONFIG: WritebackRetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Writeback result
 */
export interface WritebackResult {
  success: boolean;
  attempts: number;
  error?: WritebackError;
  durationMs: number;
}

/**
 * Writeback error details
 */
export interface WritebackError {
  message: string;
  code?: string;
  retryable: boolean;
  lastAttemptError: any;
}

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay for retry attempt with exponential backoff
 */
function calculateDelay(
  attempt: number,
  config: WritebackRetryConfig
): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any): boolean {
  // Network errors
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return true;
  }
  
  // Monday API rate limit
  if (error.status === 429 || error.message?.includes('rate limit')) {
    return true;
  }
  
  // Server errors (5xx)
  if (error.status >= 500 && error.status < 600) {
    return true;
  }
  
  // Timeout errors
  if (error.message?.toLowerCase().includes('timeout')) {
    return true;
  }
  
  // Client errors (4xx) are generally not retryable
  if (error.status >= 400 && error.status < 500) {
    return false;
  }
  
  // Unknown errors - retry to be safe
  return true;
}

/**
 * Apply assignment back to Monday with retry logic and error handling
 * 
 * @param client - Monday.com API client
 * @param targets - Writeback targets from field mapping
 * @param input - Assignment data
 * @param retryConfig - Optional retry configuration
 * @returns Writeback result with success status and error details
 */
export async function applyAssignmentToMondayWithRetry(
  client: any,
  targets: WritebackTargets,
  input: ApplyAssignmentInput,
  retryConfig: Partial<WritebackRetryConfig> = {}
): Promise<WritebackResult> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  const startTime = Date.now();
  
  let lastError: any;
  let attempts = 0;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    attempts = attempt;
    
    try {
      console.log(`[Writeback] Attempt ${attempt}/${config.maxAttempts} for item ${input.itemId}`);
      
      // Perform writeback
      await applyAssignmentToMonday(client, targets, input);
      
      // Success
      const durationMs = Date.now() - startTime;
      console.log(`[Writeback] Success on attempt ${attempt} (${durationMs}ms)`);
      
      return {
        success: true,
        attempts: attempt,
        durationMs,
      };
      
    } catch (error: any) {
      lastError = error;
      console.error(`[Writeback] Attempt ${attempt} failed:`, error.message);
      
      // Check if should retry
      const retryable = isRetryableError(error);
      
      if (!retryable || attempt === config.maxAttempts) {
        // Don't retry or max attempts reached
        const durationMs = Date.now() - startTime;
        
        return {
          success: false,
          attempts: attempt,
          durationMs,
          error: {
            message: error.message || 'Unknown error',
            code: error.code || error.status?.toString(),
            retryable,
            lastAttemptError: error,
          },
        };
      }
      
      // Calculate delay and wait before retry
      const delay = calculateDelay(attempt, config);
      console.log(`[Writeback] Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  
  // Should never reach here, but just in case
  const durationMs = Date.now() - startTime;
  return {
    success: false,
    attempts,
    durationMs,
    error: {
      message: lastError?.message || 'All retry attempts failed',
      code: lastError?.code,
      retryable: false,
      lastAttemptError: lastError,
    },
  };
}

/**
 * Apply assignment back to Monday based on Wizard-configured writeback targets.
 *
 * Supports assignedAgent target types:
 * - people: writes { personsAndTeams: [{ id, kind: "person" }] }
 * - text: writes { text: "..." }
 * - status: writes { label: "..." }
 */
export async function applyAssignmentToMonday(
  client: any,
  targets: WritebackTargets,
  input: ApplyAssignmentInput
): Promise<void> {
  const assigned = targets.assignedAgent;
  const ct = assigned.columnType ?? "people";

  if (ct === "people") {
    await client.changeColumnValue({
      boardId: assigned.boardId,
      itemId: input.itemId,
      columnId: assigned.columnId,
      value: { personsAndTeams: [{ id: Number(input.assigneeValue), kind: "person" }] },
    });
  } else if (ct === "text") {
    await client.changeColumnValue({
      boardId: assigned.boardId,
      itemId: input.itemId,
      columnId: assigned.columnId,
      value: { text: String(input.assigneeValue) },
    });
  } else if (ct === "status") {
    await client.changeColumnValue({
      boardId: assigned.boardId,
      itemId: input.itemId,
      columnId: assigned.columnId,
      value: { label: String(input.assigneeValue) },
    });
  } else {
    throw new Error(`Unsupported assignedAgent columnType: ${ct}`);
  }

  if (targets.routingStatus && input.status) {
    await client.changeColumnValue({
      boardId: targets.routingStatus.boardId,
      itemId: input.itemId,
      columnId: targets.routingStatus.columnId,
      value: { label: String(input.status) },
    });
  }

  if (targets.routingReason && input.reason) {
    await client.changeColumnValue({
      boardId: targets.routingReason.boardId,
      itemId: input.itemId,
      columnId: targets.routingReason.columnId,
      value: { text: String(input.reason) },
    });
  }
}


/**
 * Set routing meta (status/reason) without touching assignedAgent.
 * Useful for MANUAL_APPROVAL mode: mark item as Pending Approval.
 */
export async function setRoutingMetaOnMonday(
  client: any,
  targets: WritebackTargets,
  input: { boardId: string; itemId: string; status?: string; reason?: string }
): Promise<void> {
  if (targets.routingStatus && input.status) {
    await client.changeColumnValue({
      boardId: targets.routingStatus.boardId,
      itemId: input.itemId,
      columnId: targets.routingStatus.columnId,
      value: { label: String(input.status) },
    });
  }
  if (targets.routingReason && input.reason) {
    await client.changeColumnValue({
      boardId: targets.routingReason.boardId,
      itemId: input.itemId,
      columnId: targets.routingReason.columnId,
      value: { text: String(input.reason) },
    });
  }
}

/**
 * Add activity log comment to Monday item
 * Provides routing explanation in Monday's activity feed
 */
export async function addRoutingCommentToMonday(
  client: any,
  itemId: string,
  agentName: string,
  reason: string
): Promise<void> {
  try {
    const comment = `🤖 Lead Routing System\n\nAssigned to: ${agentName}\nReason: ${reason}`;
    
    await client.createUpdate({
      itemId,
      body: comment,
    });
    
    console.log(`[Writeback] Added routing comment to item ${itemId}`);
  } catch (error: any) {
    // Don't fail writeback if comment fails
    console.warn(`[Writeback] Failed to add comment to item ${itemId}:`, error.message);
  }
}
