/**
 * Logger Export
 * 
 * Re-exports the centralized Winston logger from packages/core
 * This ensures all parts of the API use the same logger instance
 * with correlation ID tracking and structured logging.
 */
export { log as logger, logger as winstonLogger, setCorrelationId, getCorrelationId, generateCorrelationId } from "../../../../packages/core/src/shared/logger";
