import { createServer } from "./server";
import { startLeadIntakePoller } from "./services/leadIntakePoller";
import { startIndustryPoller } from "./services/industryPoller";
import { startMetricsJob } from "./services/metricsJob";
import { log } from "../../../packages/core/src/shared/logger";
import { env } from "./config/env";

const port = env.PORT;

/**
 * Start the API server and background jobs
 */
async function startServer() {
  try {
    const app = createServer();
    
    const server = app.listen(port, () => {
      log.info(`🚀 Lead Routing API started`, {
        port,
        env: env.NODE_ENV,
        mondayMock: env.MONDAY_USE_MOCK,
      });
      
      // Start background jobs
      startIndustryPoller();
      startLeadIntakePoller();
      startMetricsJob();
      
      log.info("✅ Background jobs initialized");
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      log.info("SIGTERM received, shutting down gracefully");
      server.close(() => {
        log.info("Server closed");
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      log.info("SIGINT received, shutting down gracefully");
      server.close(() => {
        log.info("Server closed");
        process.exit(0);
      });
    });
  } catch (error) {
    log.error("Failed to start server", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  log.error("Uncaught exception", {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason) => {
  log.error("Unhandled promise rejection", {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  process.exit(1);
});

// Start the server with Performance & Monitoring enabled
startServer();