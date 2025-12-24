import { describe, it, expect } from "@jest/globals";
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  BusinessError,
  ExternalServiceError,
  InternalError,
  ErrorCode,
  isAppError,
  toAppError,
} from "../errors";

describe("Error Classes", () => {
  describe("AppError", () => {
    it("should create an error with all properties", () => {
      const error = new AppError(
        ErrorCode.INTERNAL_ERROR,
        "Test error",
        500,
        { detail: "test" }
      );

      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(error.message).toBe("Test error");
      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual({ detail: "test" });
      expect(error.name).toBe("AppError");
    });

    it("should convert to JSON", () => {
      const error = new AppError(
        ErrorCode.VALIDATION_FAILED,
        "Validation error",
        400,
        { field: "email" }
      );

      const json = error.toJSON();

      expect(json).toEqual({
        error: {
          code: ErrorCode.VALIDATION_FAILED,
          message: "Validation error",
          details: { field: "email" },
        },
      });
    });
  });

  describe("ValidationError", () => {
    it("should create a 400 error", () => {
      const error = new ValidationError("Invalid input", { field: "email" });

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe(ErrorCode.VALIDATION_FAILED);
      expect(error.message).toBe("Invalid input");
      expect(error.details).toEqual({ field: "email" });
    });
  });

  describe("UnauthorizedError", () => {
    it("should create a 401 error", () => {
      const error = new UnauthorizedError();

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(error.message).toBe("Unauthorized");
    });

    it("should accept custom message", () => {
      const error = new UnauthorizedError("Invalid token");

      expect(error.message).toBe("Invalid token");
    });
  });

  describe("ForbiddenError", () => {
    it("should create a 403 error", () => {
      const error = new ForbiddenError();

      expect(error.statusCode).toBe(403);
      expect(error.code).toBe(ErrorCode.FORBIDDEN);
    });
  });

  describe("NotFoundError", () => {
    it("should create a 404 error", () => {
      const error = new NotFoundError("Resource not found");

      expect(error.statusCode).toBe(404);
      expect(error.message).toBe("Resource not found");
    });
  });

  describe("BusinessError", () => {
    it("should create a 422 error", () => {
      const error = new BusinessError(
        ErrorCode.ROUTING_NOT_ENABLED,
        "Routing is not enabled"
      );

      expect(error.statusCode).toBe(422);
      expect(error.code).toBe(ErrorCode.ROUTING_NOT_ENABLED);
    });
  });

  describe("ExternalServiceError", () => {
    it("should create a 502 error", () => {
      const error = new ExternalServiceError(
        ErrorCode.MONDAY_API_ERROR,
        "Monday.com API failed"
      );

      expect(error.statusCode).toBe(502);
      expect(error.code).toBe(ErrorCode.MONDAY_API_ERROR);
    });
  });

  describe("InternalError", () => {
    it("should create a 500 error", () => {
      const error = new InternalError();

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(error.message).toBe("Internal server error");
    });

    it("should accept custom message and details", () => {
      const error = new InternalError("Database connection failed", {
        host: "localhost",
      });

      expect(error.message).toBe("Database connection failed");
      expect(error.details).toEqual({ host: "localhost" });
    });
  });

  describe("isAppError", () => {
    it("should return true for AppError instances", () => {
      const error = new AppError(ErrorCode.INTERNAL_ERROR, "Test", 500);
      expect(isAppError(error)).toBe(true);
    });

    it("should return true for AppError subclasses", () => {
      const error = new ValidationError("Test");
      expect(isAppError(error)).toBe(true);
    });

    it("should return false for regular errors", () => {
      const error = new Error("Test");
      expect(isAppError(error)).toBe(false);
    });

    it("should return false for non-error values", () => {
      expect(isAppError("string")).toBe(false);
      expect(isAppError(null)).toBe(false);
      expect(isAppError(undefined)).toBe(false);
      expect(isAppError({})).toBe(false);
    });
  });

  describe("toAppError", () => {
    it("should return AppError as-is", () => {
      const error = new ValidationError("Test");
      const result = toAppError(error);

      expect(result).toBe(error);
    });

    it("should convert regular Error to InternalError", () => {
      const error = new Error("Something went wrong");
      const result = toAppError(error);

      expect(result).toBeInstanceOf(InternalError);
      expect(result.message).toBe("Something went wrong");
      expect(result.statusCode).toBe(500);
    });

    it("should convert unknown values to InternalError", () => {
      const result = toAppError("string error");

      expect(result).toBeInstanceOf(InternalError);
      expect(result.message).toBe("An unexpected error occurred");
      expect(result.details).toEqual({ originalError: "string error" });
    });
  });
});

