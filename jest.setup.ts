/**
 * Jest setup file
 * Runs before each test suite
 */

// Set test environment variables
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "file:./prisma/test.db";
process.env.JWT_SECRET = "test_jwt_secret_at_least_32_characters_long";
process.env.ENCRYPTION_KEY = "test0123456789abcdef0123456789ab";
process.env.MONDAY_USE_MOCK = "true";
process.env.MONDAY_API_TOKEN = "test_token";
process.env.LOG_LEVEL = "error"; // Suppress logs during tests
process.env.LOG_FORMAT = "json";

// Global test timeout (30 seconds)
jest.setTimeout(30000);

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  log: jest.fn(), // Mock console.log
  debug: jest.fn(), // Mock console.debug
  info: jest.fn(), // Mock console.info
  warn: jest.fn(), // Mock console.warn
  // Keep error for debugging
  error: console.error,
};

