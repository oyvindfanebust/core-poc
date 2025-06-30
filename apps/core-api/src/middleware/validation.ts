import { logger } from '@core-poc/core-services';
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Validation middleware factory
 */
export function validateRequest<T>(
  schema: ZodSchema<T>,
  target: 'body' | 'params' | 'query' = 'body',
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = target === 'body' ? req.body : target === 'params' ? req.params : req.query;
      const validated = schema.parse(data);

      // Replace the request data with validated data
      if (target === 'body') {
        req.body = validated;
      } else if (target === 'params') {
        req.params = validated as any;
      } else {
        req.query = validated as any;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn('Validation error', {
          path: req.path,
          method: req.method,
          errors: error.errors,
        });

        res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        });
      } else {
        logger.error('Unexpected validation error', { error: error });
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };
}

/**
 * Generic error handler middleware
 */
export function errorHandler(error: Error, req: Request, res: Response, _next: NextFunction) {
  // Handle JSON parsing errors
  if (error instanceof SyntaxError && 'body' in error) {
    logger.warn('Invalid JSON in request', {
      path: req.path,
      method: req.method,
      error: error.message,
    });

    res.status(400).json({
      error: 'Invalid JSON',
      details: 'The request body contains invalid JSON',
    });
    return;
  }

  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  // Don't leak internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(500).json({
    error: 'Internal server error',
    ...(isDevelopment && { details: error.message, stack: error.stack }),
  });
}

/**
 * Request logging middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });
  });

  next();
}
