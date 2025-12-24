/**
 * Monday.com API Request Queue
 * 
 * Manages request queuing and throttling for Monday.com API calls to respect rate limits.
 * Monday.com has a rate limit of 100 requests per minute.
 * 
 * Features:
 * - Request queuing with priority support
 * - Automatic throttling (90 req/min with 10% buffer)
 * - Exponential backoff on 429 errors
 * - Request deduplication
 * - Queue metrics and monitoring
 */

import { log } from "../../../../core/src/shared/logger";

export interface QueuedRequest<T> {
  id: string;
  priority: number; // Higher = more priority
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  timestamp: number;
  retries: number;
}

export interface QueueMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  retriedRequests: number;
  queueSize: number;
  averageWaitTime: number;
  requestsPerMinute: number;
}

/**
 * Monday.com API Request Queue
 * Implements token bucket algorithm for rate limiting
 */
export class MondayRequestQueue {
  private queue: QueuedRequest<any>[] = [];
  private processing = false;
  private requestTimes: number[] = [];
  
  // Configuration
  private readonly MAX_REQUESTS_PER_MINUTE = 90; // 90 instead of 100 for safety buffer
  private readonly WINDOW_MS = 60 * 1000; // 1 minute
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_BACKOFF_MS = 1000; // 1 second
  
  // Metrics
  private metrics: QueueMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    retriedRequests: 0,
    queueSize: 0,
    averageWaitTime: 0,
    requestsPerMinute: 0,
  };

  /**
   * Add request to queue
   */
  async enqueue<T>(
    execute: () => Promise<T>,
    priority: number = 0,
    requestId?: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Check for duplicate requests (deduplication)
      const duplicate = this.queue.find(r => r.id === id);
      if (duplicate) {
        log.debug("Duplicate request detected, returning existing promise", { requestId: id });
        // Return the existing promise by piggybacking on its resolve/reject
        // This ensures the caller gets the same result as the original request
        const originalResolve = (duplicate as QueuedRequest<T>).resolve;
        const originalReject = (duplicate as QueuedRequest<T>).reject;
        
        // Store the original handlers and add new ones
        const existingResolve = originalResolve;
        const existingReject = originalReject;
        
        (duplicate as QueuedRequest<T>).resolve = (value: T) => {
          existingResolve(value);
          resolve(value);
        };
        
        (duplicate as QueuedRequest<T>).reject = (error: any) => {
          existingReject(error);
          reject(error);
        };
        
        return;
      }
      
      const request: QueuedRequest<T> = {
        id,
        priority,
        execute,
        resolve,
        reject,
        timestamp: Date.now(),
        retries: 0,
      };

      this.queue.push(request);
      this.metrics.totalRequests++;
      this.metrics.queueSize = this.queue.length;

      // Sort by priority (higher priority first)
      this.queue.sort((a, b) => b.priority - a.priority);

      log.debug("Request enqueued", {
        requestId: id,
        priority,
        queueSize: this.queue.length,
      });

      // Start processing if not already running
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process queued requests
   */
  private async processQueue() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      // Check if we can make a request (rate limit check)
      const canProceed = await this.waitForRateLimit();
      if (!canProceed) {
        // Wait a bit before retrying
        await this.sleep(100);
        continue;
      }

      // Get next request from queue
      const request = this.queue.shift();
      if (!request) continue;

      this.metrics.queueSize = this.queue.length;

      try {
        // Calculate wait time
        const waitTime = Date.now() - request.timestamp;
        this.updateAverageWaitTime(waitTime);

        // Execute request
        const result = await this.executeWithRetry(request);
        request.resolve(result);
        
        this.metrics.successfulRequests++;
        
        log.debug("Request completed successfully", {
          requestId: request.id,
          waitTime: `${waitTime}ms`,
        });
      } catch (error: any) {
        this.metrics.failedRequests++;
        request.reject(error);
        
        log.error("Request failed permanently", {
          requestId: request.id,
          error: error.message,
          retries: request.retries,
        });
      }

      // Track request time for rate limiting
      this.requestTimes.push(Date.now());
      this.cleanupOldRequestTimes();
      this.updateRequestsPerMinute();
    }

    this.processing = false;
  }

  /**
   * Execute request with exponential backoff retry logic
   */
  private async executeWithRetry<T>(request: QueuedRequest<T>): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          this.metrics.retriedRequests++;
          const backoffMs = this.INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
          
          log.info("Retrying request", {
            requestId: request.id,
            attempt,
            backoffMs,
          });
          
          await this.sleep(backoffMs);
        }

        const result = await request.execute();
        return result;
      } catch (error: any) {
        lastError = error;

        // If it's a rate limit error (429), wait longer
        if (error.status === 429 || error.statusCode === 429) {
          const retryAfter = error.headers?.["retry-after"];
          const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : 60000; // Default 1 minute
          
          log.warn("Rate limit hit, waiting before retry", {
            requestId: request.id,
            waitMs,
          });
          
          await this.sleep(waitMs);
          continue;
        }

        // If it's not a retriable error, throw immediately
        if (error.status && error.status >= 400 && error.status < 500 && error.status !== 429) {
          throw error; // Client errors (except 429) are not retriable
        }

        // For server errors (5xx), retry
        if (attempt === this.MAX_RETRIES) {
          throw lastError;
        }
      }
    }

    throw lastError;
  }

  /**
   * Check if we can proceed based on rate limit
   */
  private async waitForRateLimit(): Promise<boolean> {
    this.cleanupOldRequestTimes();
    
    // Count requests in the last minute
    const recentRequests = this.requestTimes.length;
    
    if (recentRequests >= this.MAX_REQUESTS_PER_MINUTE) {
      // Calculate how long to wait
      const oldestRequest = this.requestTimes[0];
      const timeToWait = this.WINDOW_MS - (Date.now() - oldestRequest);
      
      if (timeToWait > 0) {
        log.debug("Rate limit reached, waiting", {
          recentRequests,
          limit: this.MAX_REQUESTS_PER_MINUTE,
          waitMs: timeToWait,
        });
        
        await this.sleep(timeToWait);
        return false;
      }
    }

    return true;
  }

  /**
   * Clean up request times older than window
   */
  private cleanupOldRequestTimes() {
    const cutoff = Date.now() - this.WINDOW_MS;
    this.requestTimes = this.requestTimes.filter(time => time > cutoff);
  }

  /**
   * Update average wait time metric
   */
  private updateAverageWaitTime(waitTime: number) {
    const totalWaitTime = this.metrics.averageWaitTime * (this.metrics.successfulRequests + this.metrics.failedRequests - 1);
    this.metrics.averageWaitTime = (totalWaitTime + waitTime) / (this.metrics.successfulRequests + this.metrics.failedRequests);
  }

  /**
   * Update requests per minute metric
   */
  private updateRequestsPerMinute() {
    this.metrics.requestsPerMinute = this.requestTimes.length;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current metrics
   */
  getMetrics(): QueueMetrics {
    return { ...this.metrics, queueSize: this.queue.length };
  }

  /**
   * Clear queue (for testing)
   */
  clear() {
    this.queue = [];
    this.requestTimes = [];
    this.processing = false;
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retriedRequests: 0,
      queueSize: 0,
      averageWaitTime: 0,
      requestsPerMinute: 0,
    };
  }
}

// Singleton instance
export const mondayQueue = new MondayRequestQueue();

// Expose metrics for monitoring
if (typeof window === "undefined") {
  (global as any).__mondayQueueMetrics = () => mondayQueue.getMetrics();
}

