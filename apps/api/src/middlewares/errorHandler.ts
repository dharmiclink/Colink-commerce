/**
 * Error handling middleware for CoLink Commerce API
 * Handles all errors thrown during request processing and formats them for response
 */

import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import { isAppError, AppError, ValidationError, NotFoundError, ConflictError, InternalServerError } from '../utils/errors';

// Initialize logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' 
    ? { target: 'pino-pretty' } 
    : undefined,
});

/**
 * Handles Prisma database errors and converts them to appropriate AppErrors
 */
const handlePrismaError = (error: Prisma.PrismaClientKnownRequestError): AppError => {
  // Extract useful information from the error
  const target = error.meta?.target as string[] || [];
  const field = target.length > 0 ? target[0] : undefined;
  
  switch (error.code) {
    // Unique constraint violation
    case 'P2002':
      return new ConflictError(
        `A record with this ${field || 'value'} already exists.`,
        'UNIQUE_CONSTRAINT_VIOLATION',
        { field, code: error.code }
      );
    
    // Record not found
    case 'P2025':
      return new NotFoundError(
        'The requested record was not found.',
        'RECORD_NOT_FOUND',
        { code: error.code }
      );
    
    // Foreign key constraint violation
    case 'P2003':
      return new ValidationError(
        `Invalid reference to ${field || 'related record'}.`,
        'FOREIGN_KEY_VIOLATION',
        { field, code: error.code }
      );
    
    // Invalid data provided
    case 'P2000':
      return new ValidationError(
        `The provided value for ${field || 'a field'} is too long.`,
        'VALUE_TOO_LONG',
        { field, code: error.code }
      );
    
    // Required field missing
    case 'P2004':
      return new ValidationError(
        `A required field ${field || ''} is missing.`,
        'REQUIRED_FIELD_MISSING',
        { field, code: error.code }
      );
    
    // Default case for other Prisma errors
    default:
      return new InternalServerError(
        'A database error occurred.',
        'DATABASE_ERROR',
        { code: error.code }
      );
  }
};

/**
 * Handles Zod validation errors and formats them for response
 */
const handleZodError = (error: ZodError): ValidationError => {
  const formattedErrors = error.errors.map(err => ({
    path: err.path.join('.'),
    message: err.message,
    code: err.code
  }));
  
  return new ValidationError(
    'Validation failed',
    'VALIDATION_ERROR',
    formattedErrors
  );
};

/**
 * Main error handler middleware
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Generate a unique error ID for tracing
  const errorId = uuidv4();
  
  // Default to internal server error
  let appError: AppError;
  
  // Convert different error types to AppError
  if (isAppError(err)) {
    // Already an AppError, use as is
    appError = err;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Handle Prisma errors
    appError = handlePrismaError(err);
  } else if (err instanceof ZodError) {
    // Handle Zod validation errors
    appError = handleZodError(err);
  } else {
    // Handle generic errors
    appError = new InternalServerError(
      err.message || 'An unexpected error occurred',
      'INTERNAL_SERVER_ERROR'
    );
  }
  
  // Determine log level based on status code
  const logLevel = appError.statusCode >= 500 ? 'error' : 'warn';
  
  // Log the error with appropriate level and details
  logger[logLevel]({
    err,
    errorId,
    statusCode: appError.statusCode,
    errorCode: appError.errorCode,
    isOperational: appError.isOperational,
    path: req.path,
    method: req.method,
    requestId: req.headers['x-request-id'] || 'unknown',
    userId: (req as any).user?.id || 'anonymous',
  }, `Request error: ${err.message}`);
  
  // Prepare the error response
  const errorResponse: Record<string, any> = {
    status: 'error',
    statusCode: appError.statusCode,
    errorId,
    message: appError.message,
    code: appError.errorCode,
  };
  
  // Add request ID if available
  if (req.headers['x-request-id']) {
    errorResponse.requestId = req.headers['x-request-id'];
  }
  
  // Include error details in development or if it's a validation error
  if (process.env.NODE_ENV !== 'production' || appError instanceof ValidationError) {
    errorResponse.details = appError.details;
  }
  
  // Include stack trace in development
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack;
  }
  
  // Send the error response
  res.status(appError.statusCode).json(errorResponse);
};

/**
 * Async handler to catch errors in async route handlers
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
