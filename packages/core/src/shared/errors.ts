export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(params: { statusCode: number; code: string; message: string; details?: unknown }) {
    super(params.message);
    this.statusCode = params.statusCode;
    this.code = params.code;
    this.details = params.details;
  }
}

export const Errors = {
  badRequest: (message: string, details?: unknown) =>
    new AppError({ statusCode: 400, code: "BAD_REQUEST", message, details }),
  forbidden: (message: string, details?: unknown) =>
    new AppError({ statusCode: 403, code: "FORBIDDEN", message, details }),
  unauthorized: (message: string, details?: unknown) =>
    new AppError({ statusCode: 401, code: "UNAUTHORIZED", message, details }),
};
