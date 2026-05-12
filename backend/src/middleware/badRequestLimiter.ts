import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// 20 bad requests allowed per IP per 1 hour
export const badRequestLimiterMem = new RateLimiterMemory({
  points: 20,
  duration: 60 * 60, // 1 hour
});

/**
 * Middleware that intercepts all requests:
 * 1. Pre-check: If IP is already blocked due to too many 400s, return 429 immediately.
 * 2. Post-check: Listen to the response finishing, if status is 400, consume a point.
 */
export const badRequestLimiter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Pre-check barrier
    const resLimiter = await badRequestLimiterMem.get(req.ip || '');
    if (resLimiter !== null && resLimiter.consumedPoints > badRequestLimiterMem.points) {
      return res.status(429).json({
        error: 'Too Many Bad Requests. Your IP has been temporarily blocked for 1 hour.'
      });
    }
  } catch (err) {
    // RateLimiterMemory.get doesn't throw on reject, but general error safety
    console.error('Error checking badRequestLimiterMem', err);
  }

  // 2. Intercept response finish
  res.on('finish', async () => {
    if (res.statusCode === 400) {
      try {
        await badRequestLimiterMem.consume(req.ip || '');
      } catch (rateLimiterRes) {
        // Point consumed, limit exceeded, no action needed here as it will block on NEXT request
      }
    }
  });

  next();
};
