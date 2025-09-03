/**
 * Custom error classes for CoLink Commerce API
 * These error classes are used throughout the application for consistent error handling
 */

/**
 * Base application error class
 * All custom errors extend from this class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errorCode?: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number,
    errorCode?: string,
    details?: unknown,
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = isOperational;
    
    // Ensures proper stack trace for debugging
    Error.captureStackTrace(this, this.constructor);
    
    // Set the prototype explicitly
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * 400 Bad Request - Generic error for invalid requests
 * Use this for general client errors
 */
export class BadRequestError extends AppError {
  constructor(message = 'Bad request', errorCode?: string, details?: unknown) {
    super(message, 400, errorCode || 'BAD_REQUEST', details);
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

/**
 * 400 Bad Request - Validation error
 * Use this specifically for input validation failures
 */
export class ValidationError extends AppError {
  constructor(message = 'Validation failed', errorCode?: string, details?: unknown) {
    super(message, 400, errorCode || 'VALIDATION_ERROR', details);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * 401 Unauthorized - Authentication error
 * Use when the user is not authenticated
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', errorCode?: string, details?: unknown) {
    super(message, 401, errorCode || 'UNAUTHORIZED', details);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * 403 Forbidden - Authorization error
 * Use when the user is authenticated but doesn't have permission
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Permission denied', errorCode?: string, details?: unknown) {
    super(message, 403, errorCode || 'FORBIDDEN', details);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * 404 Not Found - Resource not found error
 * Use when a requested resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', errorCode?: string, details?: unknown) {
    super(message, 404, errorCode || 'NOT_FOUND', details);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * 409 Conflict - Resource conflict error
 * Use when a request conflicts with the current state of the resource
 */
export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', errorCode?: string, details?: unknown) {
    super(message, 409, errorCode || 'CONFLICT', details);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * 429 Too Many Requests - Rate limit error
 * Use when a user has sent too many requests in a given amount of time
 */
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests', errorCode?: string, details?: unknown) {
    super(message, 429, errorCode || 'RATE_LIMIT', details);
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * 500 Internal Server Error - Server error
 * Use for unexpected errors that occur on the server
 */
export class InternalServerError extends AppError {
  constructor(message = 'Internal server error', errorCode?: string, details?: unknown) {
    super(message, 500, errorCode || 'INTERNAL_SERVER_ERROR', details, false);
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}

/**
 * 502 Bad Gateway - External service error
 * Use when an external service or API fails
 */
export class ExternalServiceError extends AppError {
  constructor(message = 'External service error', errorCode?: string, details?: unknown) {
    super(message, 502, errorCode || 'EXTERNAL_SERVICE_ERROR', details, false);
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}

/**
 * 503 Service Unavailable - Temporary unavailability
 * Use when the service is temporarily unavailable (maintenance, overload)
 */
export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable', errorCode?: string, details?: unknown) {
    super(message, 503, errorCode || 'SERVICE_UNAVAILABLE', details, false);
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}

/**
 * Helper function to determine if an error is an instance of AppError
 */
export const isAppError = (error: unknown): error is AppError => {
  return error instanceof AppError;
};

/**
 * Helper function to convert unknown errors to AppError
 */
export const toAppError = (error: unknown): AppError => {
  if (isAppError(error)) {
    return error;
  }
  
  if (error instanceof Error) {
    return new InternalServerError(error.message);
  }
  
  return new InternalServerError('An unknown error occurred');
};
