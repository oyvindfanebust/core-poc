import { Request, Response } from 'express';
import { logger } from '../utils/logger.js';

export interface Metrics {
  timestamp: string;
  uptime: number;
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  process: {
    pid: number;
    ppid: number;
    platform: string;
    arch: string;
    nodeVersion: string;
  };
  system: {
    loadAvg: number[];
    cpuUsage: NodeJS.CpuUsage;
  };
  http: {
    totalRequests: number;
    activeConnections: number;
  };
  custom: Record<string, any>;
}

class MetricsCollector {
  private static instance: MetricsCollector;
  private httpMetrics = {
    totalRequests: 0,
    activeConnections: 0,
    requestsByStatus: new Map<number, number>(),
    requestsByPath: new Map<string, number>(),
    responseTimeHistogram: [] as number[],
  };

  private customMetrics = new Map<string, any>();

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  incrementRequests(): void {
    this.httpMetrics.totalRequests++;
  }

  incrementActiveConnections(): void {
    this.httpMetrics.activeConnections++;
  }

  decrementActiveConnections(): void {
    this.httpMetrics.activeConnections = Math.max(0, this.httpMetrics.activeConnections - 1);
  }

  recordStatusCode(status: number): void {
    const current = this.httpMetrics.requestsByStatus.get(status) || 0;
    this.httpMetrics.requestsByStatus.set(status, current + 1);
  }

  recordPath(path: string): void {
    const current = this.httpMetrics.requestsByPath.get(path) || 0;
    this.httpMetrics.requestsByPath.set(path, current + 1);
  }

  recordResponseTime(time: number): void {
    this.httpMetrics.responseTimeHistogram.push(time);
    // Keep only last 1000 entries
    if (this.httpMetrics.responseTimeHistogram.length > 1000) {
      this.httpMetrics.responseTimeHistogram = this.httpMetrics.responseTimeHistogram.slice(-1000);
    }
  }

  setCustomMetric(key: string, value: any): void {
    this.customMetrics.set(key, value);
  }

  getCustomMetric(key: string): any {
    return this.customMetrics.get(key);
  }

  getMetrics(): Metrics {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
      },
      process: {
        pid: process.pid,
        ppid: process.ppid || 0,
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
      },
      system: {
        loadAvg: require('os').loadavg(),
        cpuUsage,
      },
      http: {
        totalRequests: this.httpMetrics.totalRequests,
        activeConnections: this.httpMetrics.activeConnections,
      },
      custom: Object.fromEntries(this.customMetrics),
    };
  }

  getDetailedHttpMetrics() {
    const responseTime = this.httpMetrics.responseTimeHistogram;
    const avg = responseTime.length > 0 
      ? responseTime.reduce((a, b) => a + b, 0) / responseTime.length 
      : 0;
    
    const sorted = [...responseTime].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;

    return {
      totalRequests: this.httpMetrics.totalRequests,
      activeConnections: this.httpMetrics.activeConnections,
      statusCodes: Object.fromEntries(this.httpMetrics.requestsByStatus),
      paths: Object.fromEntries(this.httpMetrics.requestsByPath),
      responseTime: {
        avg: Math.round(avg),
        p95: Math.round(p95),
        p99: Math.round(p99),
        samples: responseTime.length,
      },
    };
  }
}

export const metricsCollector = MetricsCollector.getInstance();

export class MetricsController {
  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = metricsCollector.getMetrics();
      
      logger.debug('Metrics requested', {
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });

      res.json(metrics);
    } catch (error) {
      logger.error('Failed to get metrics', { error });
      res.status(500).json({ error: 'Failed to retrieve metrics' });
    }
  }

  async getHttpMetrics(req: Request, res: Response): Promise<void> {
    try {
      const httpMetrics = metricsCollector.getDetailedHttpMetrics();
      
      res.json(httpMetrics);
    } catch (error) {
      logger.error('Failed to get HTTP metrics', { error });
      res.status(500).json({ error: 'Failed to retrieve HTTP metrics' });
    }
  }

  async getPrometheusMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = metricsCollector.getMetrics();
      const httpMetrics = metricsCollector.getDetailedHttpMetrics();
      
      // Generate Prometheus-format metrics
      const prometheusMetrics = [
        `# HELP nodejs_heap_size_used_bytes Process heap memory currently used`,
        `# TYPE nodejs_heap_size_used_bytes gauge`,
        `nodejs_heap_size_used_bytes ${metrics.memory.heapUsed * 1024 * 1024}`,
        ``,
        `# HELP nodejs_heap_size_total_bytes Process heap memory total`,
        `# TYPE nodejs_heap_size_total_bytes gauge`,
        `nodejs_heap_size_total_bytes ${metrics.memory.heapTotal * 1024 * 1024}`,
        ``,
        `# HELP process_resident_memory_bytes Resident memory size in bytes`,
        `# TYPE process_resident_memory_bytes gauge`,
        `process_resident_memory_bytes ${metrics.memory.rss * 1024 * 1024}`,
        ``,
        `# HELP process_uptime_seconds Total process uptime in seconds`,
        `# TYPE process_uptime_seconds counter`,
        `process_uptime_seconds ${metrics.uptime}`,
        ``,
        `# HELP http_requests_total Total number of HTTP requests`,
        `# TYPE http_requests_total counter`,
        `http_requests_total ${httpMetrics.totalRequests}`,
        ``,
        `# HELP http_active_connections Current number of active HTTP connections`,
        `# TYPE http_active_connections gauge`,
        `http_active_connections ${httpMetrics.activeConnections}`,
        ``,
      ];

      // Add status code metrics
      for (const [status, count] of Object.entries(httpMetrics.statusCodes)) {
        prometheusMetrics.push(
          `# HELP http_requests_status_total Total HTTP requests by status code`,
          `# TYPE http_requests_status_total counter`,
          `http_requests_status_total{status="${status}"} ${count}`,
          ``
        );
      }

      // Add response time metrics
      if (httpMetrics.responseTime.samples > 0) {
        prometheusMetrics.push(
          `# HELP http_request_duration_ms HTTP request duration in milliseconds`,
          `# TYPE http_request_duration_ms histogram`,
          `http_request_duration_ms_sum ${httpMetrics.responseTime.avg * httpMetrics.responseTime.samples}`,
          `http_request_duration_ms_count ${httpMetrics.responseTime.samples}`,
          `http_request_duration_ms{quantile="0.95"} ${httpMetrics.responseTime.p95}`,
          `http_request_duration_ms{quantile="0.99"} ${httpMetrics.responseTime.p99}`,
          ``
        );
      }

      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.send(prometheusMetrics.join('\n'));
    } catch (error) {
      logger.error('Failed to get Prometheus metrics', { error });
      res.status(500).send('# Failed to retrieve metrics');
    }
  }
}

// Middleware to collect HTTP metrics
export function metricsMiddleware(req: Request, res: Response, next: Function): void {
  const startTime = Date.now();
  
  metricsCollector.incrementRequests();
  metricsCollector.incrementActiveConnections();
  metricsCollector.recordPath(req.path);

  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    
    metricsCollector.decrementActiveConnections();
    metricsCollector.recordStatusCode(res.statusCode);
    metricsCollector.recordResponseTime(responseTime);
  });

  next();
}