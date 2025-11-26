import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to validate and log internal requests
 * Since backend is bound to 127.0.0.1, all requests are internal
 * This middleware helps identify the source of requests (direct vs via nginx)
 */
@Injectable()
export class InternalRequestMiddleware implements NestMiddleware {
  private readonly logger = new Logger(InternalRequestMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip || req.connection.remoteAddress;
    const realIp = req.headers['x-real-ip'] as string;
    const forwardedFor = req.headers['x-forwarded-for'] as string;
    const userAgent = req.headers['user-agent'];

    // Log request source
    const isFromNginx = !!realIp || !!forwardedFor;
    const source = isFromNginx ? 'nginx-proxy' : 'direct-internal';

    this.logger.debug(
      `Request from ${source} - IP: ${ip}, Real-IP: ${realIp || 'N/A'}, Forwarded-For: ${forwardedFor || 'N/A'}, Path: ${req.path}`,
    );

    // Validate that request is from localhost (security check)
    // Since we bind to 127.0.0.1, this should always be true, but good to verify
    if (ip && ip !== '127.0.0.1' && ip !== '::1' && ip !== '::ffff:127.0.0.1') {
      this.logger.warn(
        `Unexpected IP address: ${ip} for path: ${req.path}. Expected localhost only.`,
      );
    }

    next();
  }
}

