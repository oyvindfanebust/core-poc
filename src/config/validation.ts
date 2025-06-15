import { z } from 'zod';
import { logger } from '../utils/logger.js';

// Environment configuration schema
const ConfigSchema = z.object({
  // Database
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(65535)).default('5432'),
  DB_NAME: z.string().min(1).default('banking_poc'),
  DB_USER: z.string().min(1).default('postgres'),
  DB_PASSWORD: z.string().min(1).default('postgres'),
  DB_POOL_SIZE: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(100)).default('10'),
  DB_IDLE_TIMEOUT: z.string().transform(val => parseInt(val)).pipe(z.number().min(1000)).default('30000'),
  DB_CONNECTION_TIMEOUT: z.string().transform(val => parseInt(val)).pipe(z.number().min(1000)).default('2000'),

  // TigerBeetle
  TIGERBEETLE_CLUSTER_ID: z.string().transform(val => parseInt(val)).pipe(z.number().min(0)).default('0'),
  TIGERBEETLE_ADDRESSES: z.string().min(1).default('3000'),

  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(65535)).default('3001'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

export type Config = z.infer<typeof ConfigSchema>;

export function validateConfig(): Config {
  try {
    logger.info('Validating environment configuration...');
    
    const config = ConfigSchema.parse(process.env);
    
    logger.info('Environment configuration validated successfully', {
      NODE_ENV: config.NODE_ENV,
      PORT: config.PORT,
      DB_HOST: config.DB_HOST,
      DB_PORT: config.DB_PORT,
      DB_NAME: config.DB_NAME,
      // Don't log sensitive information like passwords
    });
    
    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Configuration validation failed', {
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          received: 'input' in err ? err.input : undefined,
        })),
      });
      
      throw new Error(`Configuration validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
    }
    
    logger.error('Unexpected error during configuration validation', { error });
    throw error;
  }
}