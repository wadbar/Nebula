import { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private store: Map<string, RateLimitRecord> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig = { windowMs: 60000, maxRequests: 100 }) {
    this.config = config;
    
    // Auto-cleanup stale records every minute
    setInterval(() => this.cleanup(), 60000).unref();
  }

  public middleware = (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    let record = this.store.get(ip);

    if (!record || now > record.resetAt) {
      record = { count: 0, resetAt: now + this.config.windowMs };
    }

    record.count++;
    this.store.set(ip, record);

    res.setHeader('X-RateLimit-Limit', this.config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, this.config.maxRequests - record.count));
    res.setHeader('X-RateLimit-Reset', new Date(record.resetAt).toISOString());

    if (record.count > this.config.maxRequests) {
      res.status(429).json({
        error: 'TOO_MANY_REQUESTS',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((record.resetAt - now) / 1000)
      });
      return;
    }

    next();
  };

  private cleanup(): void {
    const now = Date.now();
    for (const [ip, record] of this.store.entries()) {
      if (now > record.resetAt) {
        this.store.delete(ip);
      }
    }
  }
}

export const globalRateLimiter = new RateLimiter();
