import { Request, Response } from 'express';
import { DatabaseConnection } from '../database/connection.js';
import { logger } from '../utils/logger.js';

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  error?: string;
  details?: Record<string, any>;
}

export interface HealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  checks: HealthCheck[];
}

export class HealthController {
  constructor(private database: DatabaseConnection) {}

  async getHealth(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      const checks = await Promise.all([
        this.checkDatabase(),
        this.checkMemory(),
        this.checkDisk(),
      ]);

      const overallStatus = this.determineOverallStatus(checks);
      
      const healthResponse: HealthResponse = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        checks,
      };

      const statusCode = overallStatus === 'healthy' ? 200 : 503;
      
      logger.info('Health check completed', {
        status: overallStatus,
        responseTime: Date.now() - startTime,
        checksCount: checks.length,
      });

      res.status(statusCode).json(healthResponse);
    } catch (error) {
      logger.error('Health check failed', { error });
      
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        checks: [],
      });
    }
  }

  async getReadiness(req: Request, res: Response): Promise<void> {
    try {
      // Readiness checks - ensure service can handle requests
      const checks = await Promise.all([
        this.checkDatabase(),
      ]);

      const isReady = checks.every(check => check.status === 'healthy');
      
      const statusCode = isReady ? 200 : 503;
      
      res.status(statusCode).json({
        ready: isReady,
        timestamp: new Date().toISOString(),
        checks,
      });
    } catch (error) {
      logger.error('Readiness check failed', { error });
      res.status(503).json({
        ready: false,
        timestamp: new Date().toISOString(),
        error: 'Readiness check failed',
      });
    }
  }

  async getLiveness(req: Request, res: Response): Promise<void> {
    // Liveness checks - ensure service is running
    try {
      const memoryCheck = await this.checkMemory();
      const isAlive = memoryCheck.status !== 'unhealthy';
      
      const statusCode = isAlive ? 200 : 503;
      
      res.status(statusCode).json({
        alive: isAlive,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: memoryCheck.details,
      });
    } catch (error) {
      logger.error('Liveness check failed', { error });
      res.status(503).json({
        alive: false,
        timestamp: new Date().toISOString(),
        error: 'Liveness check failed',
      });
    }
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // Simple connectivity test
      await this.database.query('SELECT 1 as health_check');
      
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'database',
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime,
        details: {
          type: 'postgresql',
          responseTimeMs: responseTime,
        },
      };
    } catch (error) {
      return {
        service: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  }

  private async checkMemory(): Promise<HealthCheck> {
    try {
      const memUsage = process.memoryUsage();
      const totalMemory = memUsage.heapTotal;
      const usedMemory = memUsage.heapUsed;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (memoryUsagePercent > 90) {
        status = 'unhealthy';
      } else if (memoryUsagePercent > 80) {
        status = 'degraded';
      }
      
      return {
        service: 'memory',
        status,
        details: {
          heapUsed: Math.round(usedMemory / 1024 / 1024), // MB
          heapTotal: Math.round(totalMemory / 1024 / 1024), // MB
          usagePercent: Math.round(memoryUsagePercent),
          external: Math.round(memUsage.external / 1024 / 1024), // MB
          rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        },
      };
    } catch (error) {
      return {
        service: 'memory',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown memory error',
      };
    }
  }

  private async checkDisk(): Promise<HealthCheck> {
    try {
      // Check available disk space (basic check)
      const stats = await import('fs').then(fs => fs.promises.stat('.'));
      
      return {
        service: 'disk',
        status: 'healthy',
        details: {
          available: true,
          // Note: Getting actual disk space requires platform-specific code
          // This is a basic implementation
        },
      };
    } catch (error) {
      return {
        service: 'disk',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown disk error',
      };
    }
  }

  private determineOverallStatus(checks: HealthCheck[]): 'healthy' | 'unhealthy' | 'degraded' {
    if (checks.some(check => check.status === 'unhealthy')) {
      return 'unhealthy';
    }
    
    if (checks.some(check => check.status === 'degraded')) {
      return 'degraded';
    }
    
    return 'healthy';
  }
}