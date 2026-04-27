import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
  count: number;
  resetTime: number;
}

// Simple in-memory rate limiter (replace with Redis in production)
const rateLimitStore = new Map<string, RateLimitStore>();

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
}

// Default: 100 requests per 15 minutes
const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 15 * 60 * 1000,
  maxRequests: 100,
};

export function createRateLimiter(config: Partial<RateLimitConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return function rateLimit(request: NextRequest): NextResponse | null {
    // Get client identifier (IP address or custom header)
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
    const identifier = `${ip}:${request.nextUrl.pathname}`;

    const now = Date.now();
    const clientData = rateLimitStore.get(identifier);

    // Clean up old entries periodically
    if (rateLimitStore.size > 10000) {
      const cutoff = now - finalConfig.windowMs;
      for (const [key, value] of rateLimitStore.entries()) {
        if (value.resetTime < cutoff) {
          rateLimitStore.delete(key);
        }
      }
    }

    if (!clientData || now > clientData.resetTime) {
      // New window or expired window
      rateLimitStore.set(identifier, {
        count: 1,
        resetTime: now + finalConfig.windowMs,
      });
      return null; // Allow request
    }

    if (clientData.count >= finalConfig.maxRequests) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((clientData.resetTime - now) / 1000);

      return NextResponse.json(
        {
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': finalConfig.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': clientData.resetTime.toString(),
            'Retry-After': retryAfter.toString(),
          },
        }
      );
    }

    // Increment counter
    clientData.count++;
    rateLimitStore.set(identifier, clientData);

    return null; // Allow request
  };
}

// Export pre-configured rate limiters for different use cases
export const strictRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
});

export const moderateRateLimit = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 50,
});

export const defaultRateLimit = createRateLimiter();
