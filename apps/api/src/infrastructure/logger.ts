/**
 * Application Logger Configuration
 * 
 * Uses Winston for structured logging with different transports
 * based on environment (development vs production).
 */

import winston from 'winston';
import path from 'path';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Define format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define which transports to use
const transports: winston.transport[] = [];

// Always log to console in development
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.printf(
          (info) => `${info.timestamp} [${info.level}] ${info.module || 'app'}: ${info.message}`
        )
      ),
    })
  );
}

// In production, log to files
if (process.env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: path.join('logs', 'combined.log'),
    })
  );
}

// Create the logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  levels,
  format,
  transports,
});

// Helper function to create a module-specific logger
export function createModuleLogger(moduleName: string) {
  return {
    debug: (message: string, meta?: any) => logger.debug(message, { module: moduleName, ...meta }),
    info: (message: string, meta?: any) => logger.info(message, { module: moduleName, ...meta }),
    warn: (message: string, meta?: any) => logger.warn(message, { module: moduleName, ...meta }),
    error: (message: string, meta?: any) => logger.error(message, { module: moduleName, ...meta }),
  };
}

// Export default logger
export default logger;

