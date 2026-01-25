import { redis } from './client';

/**
 * Rate limiting configuration interface
 */
export interface RateLimitConfig {
  windowSeconds: number;    // Time window in seconds
  maxRequests: number;      // Maximum requests allowed in the window
  blockDuration?: number;   // Optional block duration in seconds after exceeding limit
  userBased?: boolean;      // Whether to apply limits per user (default: true)
  endpointBased?: boolean;  // Whether to apply limits per endpoint (default: true)
}

/**
 * Default rate limiting configurations for different scenarios
 */
export const DEFAULT_RATE_LIMITS = {
  // Global anonymous requests (no authentication)
  ANONYMOUS: {
    windowSeconds: 60,      // 1 minute
    maxRequests: 30,        // 30 requests per minute
    blockDuration: 300,     // 5 minutes block if exceeded
    userBased: false,       // Applies to all anonymous requests
    endpointBased: true     // Different endpoints have separate limits
  },
  
  // Authenticated users (basic users)
  AUTHENTICATED: {
    windowSeconds: 60,      // 1 minute
    maxRequests: 100,       // 100 requests per minute
    blockDuration: 300,     // 5 minutes block if exceeded
    userBased: true,        // Per user limits
    endpointBased: true     // Per endpoint limits
  },
  
  // Admin users (higher limits)
  ADMIN: {
    windowSeconds: 60,      // 1 minute
    maxRequests: 500,       // 500 requests per minute
    blockDuration: 300,     // 5 minutes block if exceeded
    userBased: true,
    endpointBased: true
  },
  
  // API endpoints with special limits
  API_LOGIN: {
    windowSeconds: 300,     // 5 minutes
    maxRequests: 10,        // 10 login attempts per 5 minutes
    blockDuration: 1800,    // 30 minutes block for brute force protection
    userBased: true,        // Per user/device
    endpointBased: false    // Applies to all login attempts
  },
  
  // Data import/export operations
  DATA_IMPORT: {
    windowSeconds: 3600,    // 1 hour
    maxRequests: 5,         // 5 imports per hour
    blockDuration: 7200,    // 2 hours block
    userBased: true,
    endpointBased: true
  },
  
  // Chat/real-time operations
  CHAT: {
    windowSeconds: 10,      // 10 seconds
    maxRequests: 50,        // 50 messages per 10 seconds
    blockDuration: 60,      // 1 minute block
    userBased: true,
    endpointBased: false
  }
} as const;

/**
 * Rate limiting result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number;            // Unix timestamp in seconds when counter resets
  total: number;
  blocked?: boolean;
  blockExpires?: number;    // Unix timestamp when block expires
  retryAfter?: number;      // Seconds to wait before next request
}

/**
 * Rate limit key generation strategies
 */
export enum RateLimitKeyStrategy {
  USER_ONLY = 'user_only',           // user:{userId}
  ENDPOINT_ONLY = 'endpoint_only',   // endpoint:{method}:{path}
  USER_ENDPOINT = 'user_endpoint',   // user:{userId}:endpoint:{method}:{path}
  IP_ONLY = 'ip_only',               // ip:{ipAddress}
  IP_ENDPOINT = 'ip_endpoint'        // ip:{ipAddress}:endpoint:{method}:{path}
}

/**
 * Check rate limit for a request
 * @param identifier - User ID, IP address, or other identifier
 * @param endpoint - API endpoint path (e.g., '/api/ps')
 * @param config - Rate limiting configuration
 * @param strategy - Key generation strategy
 * @returns Rate limiting result
 */
export async function checkRateLimit(
  identifier: string,
  endpoint: string = 'global',
  config: RateLimitConfig = DEFAULT_RATE_LIMITS.AUTHENTICATED,
  strategy: RateLimitKeyStrategy = RateLimitKeyStrategy.USER_ENDPOINT
): Promise<RateLimitResult> {
  try {
    // Generate cache key based on strategy
    const key = generateRateLimitKey(identifier, endpoint, strategy);
    
    // Check if blocked
    const blockKey = `${key}:block`;
    const blockExpires = await redis.get(blockKey);
    
    if (blockExpires) {
      const blockExpiresNum = parseInt(blockExpires);
      const now = Math.floor(Date.now() / 1000);
      
      if (blockExpiresNum > now) {
        return {
          allowed: false,
          remaining: 0,
          reset: blockExpiresNum,
          total: config.maxRequests,
          blocked: true,
          blockExpires: blockExpiresNum,
          retryAfter: blockExpiresNum - now
        };
      } else {
        // Block expired, remove it
        await redis.del(blockKey);
      }
    }
    
    // Get current count
    const countKey = `${key}:count`;
    const windowKey = `${key}:window`;
    
    const currentCount = await redis.get(countKey);
    const currentWindow = await redis.get(windowKey);
    
    const now = Math.floor(Date.now() / 1000);
    const windowStart = currentWindow ? parseInt(currentWindow) : now;
    
    // If window has expired, reset counter
    if (now - windowStart >= config.windowSeconds) {
      await redis.setex(countKey, config.windowSeconds * 2, '1');
      await redis.setex(windowKey, config.windowSeconds * 2, now.toString());
      
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        reset: now + config.windowSeconds,
        total: config.maxRequests
      };
    }
    
    // Window still active, increment counter
    const newCount = currentCount ? parseInt(currentCount) + 1 : 1;
    const ttl = await redis.ttl(countKey);
    
    await redis.setex(countKey, ttl > 0 ? ttl : config.windowSeconds * 2, newCount.toString());
    
    const remaining = Math.max(0, config.maxRequests - newCount);
    const allowed = newCount <= config.maxRequests;
    
    // If limit exceeded and block duration is configured, set block
    if (!allowed && config.blockDuration) {
      const blockExpiry = now + config.blockDuration;
      await redis.setex(blockKey, config.blockDuration, blockExpiry.toString());
      
      return {
        allowed: false,
        remaining: 0,
        reset: windowStart + config.windowSeconds,
        total: config.maxRequests,
        blocked: true,
        blockExpires: blockExpiry,
        retryAfter: config.blockDuration
      };
    }
    
    return {
      allowed,
      remaining,
      reset: windowStart + config.windowSeconds,
      total: config.maxRequests,
      blocked: false
    };
    
  } catch (error) {
    console.error('❌ Rate limiting error:', error);
    
    // Fail open - allow request if rate limiting fails
    return {
      allowed: true,
      remaining: Number.MAX_SAFE_INTEGER,
      reset: Math.floor(Date.now() / 1000) + 60,
      total: Number.MAX_SAFE_INTEGER
    };
  }
}

/**
 * Generate rate limit key based on strategy
 */
function generateRateLimitKey(
  identifier: string,
  endpoint: string,
  strategy: RateLimitKeyStrategy
): string {
  const normalizedEndpoint = endpoint.replace(/[^a-zA-Z0-9:-]/g, '-').toLowerCase();
  
  switch (strategy) {
    case RateLimitKeyStrategy.USER_ONLY:
      return `ratelimit:user:${identifier}`;
    
    case RateLimitKeyStrategy.ENDPOINT_ONLY:
      return `ratelimit:endpoint:${normalizedEndpoint}`;
    
    case RateLimitKeyStrategy.USER_ENDPOINT:
      return `ratelimit:user:${identifier}:endpoint:${normalizedEndpoint}`;
    
    case RateLimitKeyStrategy.IP_ONLY:
      return `ratelimit:ip:${identifier}`;
    
    case RateLimitKeyStrategy.IP_ENDPOINT:
      return `ratelimit:ip:${identifier}:endpoint:${normalizedEndpoint}`;
    
    default:
      return `ratelimit:${identifier}:${normalizedEndpoint}`;
  }
}

/**
 * Get rate limit statistics for an identifier
 */
export async function getRateLimitStats(
  identifier: string,
  endpoint?: string
): Promise<{
  current: number;
  remaining: number;
  reset: number;
  isBlocked: boolean;
  blockExpires?: number;
}> {
  try {
    const baseKey = endpoint 
      ? generateRateLimitKey(identifier, endpoint, RateLimitKeyStrategy.USER_ENDPOINT)
      : generateRateLimitKey(identifier, 'global', RateLimitKeyStrategy.USER_ONLY);
    
    const [count, window, blockExpires] = await Promise.all([
      redis.get(`${baseKey}:count`),
      redis.get(`${baseKey}:window`),
      redis.get(`${baseKey}:block`)
    ]);
    
    const now = Math.floor(Date.now() / 1000);
    const currentCount = count ? parseInt(count) : 0;
    const windowStart = window ? parseInt(window) : now;
    
    // For simplicity, assume default config
    const maxRequests = DEFAULT_RATE_LIMITS.AUTHENTICATED.maxRequests;
    const windowSeconds = DEFAULT_RATE_LIMITS.AUTHENTICATED.windowSeconds;
    
    return {
      current: currentCount,
      remaining: Math.max(0, maxRequests - currentCount),
      reset: windowStart + windowSeconds,
      isBlocked: !!blockExpires && parseInt(blockExpires) > now,
      blockExpires: blockExpires ? parseInt(blockExpires) : undefined
    };
    
  } catch (error) {
    console.error('❌ Failed to get rate limit stats:', error);
    return {
      current: 0,
      remaining: Number.MAX_SAFE_INTEGER,
      reset: now + 60,
      isBlocked: false
    };
  }
}

/**
 * Reset rate limit for an identifier (admin function)
 */
export async function resetRateLimit(
  identifier: string,
  endpoint?: string
): Promise<void> {
  try {
    const baseKey = endpoint 
      ? generateRateLimitKey(identifier, endpoint, RateLimitKeyStrategy.USER_ENDPOINT)
      : generateRateLimitKey(identifier, 'global', RateLimitKeyStrategy.USER_ONLY);
    
    const keys = [
      `${baseKey}:count`,
      `${baseKey}:window`,
      `${baseKey}:block`
    ];
    
    await redis.del(...keys);
    console.log(`✅ Rate limit reset for ${identifier}${endpoint ? ` on ${endpoint}` : ''}`);
    
  } catch (error) {
    console.error('❌ Failed to reset rate limit:', error);
  }
}

/**
 * Get all rate limited keys (admin function)
 */
export async function getAllRateLimitKeys(): Promise<string[]> {
  try {
    return await redis.keys('ratelimit:*');
  } catch (error) {
    console.error('❌ Failed to get rate limit keys:', error);
    return [];
  }
}

/**
 * Rate limiting middleware for Next.js API routes
 * This is a simplified version - implement in your actual middleware
 */
export function withRateLimit(
  config: RateLimitConfig = DEFAULT_RATE_LIMITS.AUTHENTICATED,
  strategy: RateLimitKeyStrategy = RateLimitKeyStrategy.USER_ENDPOINT
) {
  return async function rateLimitMiddleware(req: Request) {
    try {
      // Extract identifier (user ID, IP, etc.)
      const identifier = extractIdentifier(req);
      const endpoint = new URL(req.url).pathname;
      
      const result = await checkRateLimit(identifier, endpoint, config, strategy);
      
      if (!result.allowed) {
        return new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            message: `Too many requests. Please try again in ${result.retryAfter} seconds.`,
            retryAfter: result.retryAfter,
            reset: result.reset
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': result.total.toString(),
              'X-RateLimit-Remaining': result.remaining.toString(),
              'X-RateLimit-Reset': result.reset.toString(),
              'Retry-After': result.retryAfter?.toString() || '60'
            }
          }
        );
      }
      
      // Add rate limit headers to successful responses
      const response = await fetch(req);
      const newHeaders = new Headers(response.headers);
      
      newHeaders.set('X-RateLimit-Limit', result.total.toString());
      newHeaders.set('X-RateLimit-Remaining', result.remaining.toString());
      newHeaders.set('X-RateLimit-Reset', result.reset.toString());
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
      
    } catch (error) {
      console.error('Rate limiting middleware error:', error);
      // Fail open - allow request
      return await fetch(req);
    }
  };
}

/**
 * Extract identifier from request
 * In a real implementation, this would extract user ID from session or IP from request
 */
function extractIdentifier(req: Request): string {
  // Try to get user ID from headers (in a real app, this would come from auth)
  const userId = req.headers.get('x-user-id') || req.headers.get('authorization');
  
  if (userId) {
    return `user:${userId}`;
  }
  
  // Fall back to IP address (simplified)
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             'unknown';
  
  return `ip:${ip.split(',')[0].trim()}`;
}

// Utility: Get current timestamp in seconds
const now = Math.floor(Date.now() / 1000);