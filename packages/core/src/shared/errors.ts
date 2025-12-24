/**
 * Standardized error codes for the Lead Routing System
 * Prefix conventions:
 * - E1xxx: Validation errors
 * - E2xxx: Authentication/Authorization errors
 * - E3xxx: Business logic errors
 * - E4xxx: External service errors (Monday.com, etc.)
 * - E5xxx: Internal server errors
 */
export enum ErrorCode {
  // Validation Errors (E1xxx)
  VALIDATION_FAILED = "E1001",
  INVALID_INPUT = "E1002",
  MISSING_REQUIRED_FIELD = "E1003",
  INVALID_FORMAT = "E1004",
  
  // Authentication/Authorization Errors (E2xxx)
  UNAUTHORIZED = "E2001",
  FORBIDDEN = "E2002",
  INVALID_TOKEN = "E2003",
  TOKEN_EXPIRED = "E2004",
  
  // Business Logic Errors (E3xxx)
  ROUTING_NOT_ENABLED = "E3001",
  ROUTING_ALREADY_ENABLED = "E3002",
  SCHEMA_NOT_FOUND = "E3003",
  MAPPING_NOT_FOUND = "E3004",
  RULES_NOT_FOUND = "E3005",
  PROPOSAL_NOT_FOUND = "E3006",
  INVALID_PROPOSAL_STATUS = "E3007",
  NO_AGENTS_AVAILABLE = "E3008",
  RULE_EVALUATION_FAILED = "E3009",
  
  // External Service Errors (E4xxx)
  MONDAY_API_ERROR = "E4001",
  MONDAY_CONNECTION_FAILED = "E4002",
  MONDAY_RATE_LIMIT = "E4003",
  MONDAY_INVALID_TOKEN = "E4004",
  
  // Internal Server Errors (E5xxx)
  INTERNAL_ERROR = "E5001",
  DATABASE_ERROR = "E5002",
  UNEXPECTED_ERROR = "E5003",
}

/**
 * Base error class for all application errors
 */
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly message: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, any>
  ) {
    super(message);
    this.name = "AppError";
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON response format
   */
  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

/**
 * Validation Error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(ErrorCode.VALIDATION_FAILED, message, 400, details);
    this.name = "ValidationError";
  }
}

/**
 * Unauthorized Error (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(ErrorCode.UNAUTHORIZED, message, 401);
    this.name = "UnauthorizedError";
  }
}

/**
 * Forbidden Error (403)
 */
export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden") {
    super(ErrorCode.FORBIDDEN, message, 403);
    this.name = "ForbiddenError";
  }
}

/**
 * Not Found Error (404)
 */
export class NotFoundError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.UNEXPECTED_ERROR) {
    super(code, message, 404);
    this.name = "NotFoundError";
  }
}

/**
 * Business Logic Error (422)
 */
export class BusinessError extends AppError {
  constructor(code: ErrorCode, message: string, details?: Record<string, any>) {
    super(code, message, 422, details);
    this.name = "BusinessError";
  }
}

/**
 * External Service Error (502)
 */
export class ExternalServiceError extends AppError {
  constructor(code: ErrorCode, message: string, details?: Record<string, any>) {
    super(code, message, 502, details);
    this.name = "ExternalServiceError";
  }
}

/**
 * Internal Server Error (500)
 */
export class InternalError extends AppError {
  constructor(message: string = "Internal server error", details?: Record<string, any>) {
    super(ErrorCode.INTERNAL_ERROR, message, 500, details);
    this.name = "InternalError";
  }
}

/**
 * Helper to check if error is AppError
 */
export function isAppError(error: any): error is AppError {
  return error instanceof AppError;
}

/**
 * Convert unknown error to AppError
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new InternalError(error.message, {
      originalError: error.name,
      stack: error.stack,
    });
  }

  return new InternalError("An unexpected error occurred", {
    originalError: String(error),
  });
}
