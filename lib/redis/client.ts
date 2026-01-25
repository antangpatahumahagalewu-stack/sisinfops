import Redis from 'ioredis';
import { encryptData, decryptData, maskSensitiveFields } from './security';

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableAutoPipelining: true,
  lazyConnect: true,
};

// Create Redis client instance
const redis = new Redis(redisConfig);

// Connection event handlers
redis.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redis.on('error', (error) => {
  console.error('❌ Redis connection error:', error);
});

redis.on('close', () => {
  console.warn('⚠️ Redis connection closed');
});

redis.on('reconnecting', (delay: number) => {
  console.log(`🔄 Redis reconnecting in ${delay}ms`);
});

/**
 * Cache helper function with TTL and security features
 * @param key - Redis key
 * @param fetchFn - Function to fetch fresh data if cache miss
 * @param ttlSeconds - Time to live in seconds (default: 5 minutes)
 * @param encryptSensitive - Whether to encrypt sensitive data (default: false)
 * @returns Cached or fresh data
 */
export async function cacheGet<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 300,
  encryptSensitive: boolean = false
): Promise<T> {
  try {
    // Try to get from cache
    const cached = await redis.get(key);
    
    if (cached) {
      console.log(`🔍 Cache hit for key: ${key}`);
      let data: T;
      
      if (encryptSensitive) {
        data = decryptData(JSON.parse(cached));
      } else {
        data = JSON.parse(cached);
      }
      
      return data;
    }
    
    console.log(`⚡ Cache miss for key: ${key}, fetching fresh data`);
    
    // Fetch fresh data
    const freshData = await fetchFn();
    
    // Prepare data for caching
    let dataToCache: any = freshData;
    
    // Apply security measures
    dataToCache = maskSensitiveFields(dataToCache);
    
    if (encryptSensitive) {
      dataToCache = encryptData(dataToCache);
    }
    
    // Store in cache with TTL
    await redis.setex(key, ttlSeconds, JSON.stringify(dataToCache));
    
    return freshData;
    
  } catch (error) {
    console.error(`❌ Cache operation failed for key ${key}:`, error);
    
    // Fallback: fetch fresh data without caching
    console.log('🔄 Falling back to direct fetch');
    return await fetchFn();
  }
}

/**
 * Set cache value directly
 * @param key - Redis key
 * @param value - Value to cache
 * @param ttlSeconds - Time to live in seconds
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number = 300,
  encryptSensitive: boolean = false
): Promise<void> {
  try {
    let dataToCache: any = value;
    
    // Apply security measures
    dataToCache = maskSensitiveFields(dataToCache);
    
    if (encryptSensitive) {
      dataToCache = encryptData(dataToCache);
    }
    
    if (ttlSeconds > 0) {
      await redis.setex(key, ttlSeconds, JSON.stringify(dataToCache));
    } else {
      await redis.set(key, JSON.stringify(dataToCache));
    }
    
    console.log(`💾 Cache set for key: ${key} (TTL: ${ttlSeconds}s)`);
  } catch (error) {
    console.error(`❌ Failed to set cache for key ${key}:`, error);
  }
}

/**
 * Delete cache key
 * @param key - Redis key or pattern
 */
export async function cacheDelete(key: string): Promise<void> {
  try {
    // Handle pattern deletion
    if (key.includes('*')) {
      const keys = await redis.keys(key);
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`🗑️ Deleted ${keys.length} cache keys matching pattern: ${key}`);
      }
    } else {
      await redis.del(key);
      console.log(`🗑️ Deleted cache key: ${key}`);
    }
  } catch (error) {
    console.error(`❌ Failed to delete cache for key ${key}:`, error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  hitRate: number;
  totalKeys: number;
  memoryUsage: string;
  connected: boolean;
}> {
  try {
    const [info, dbsize] = await Promise.all([
      redis.info(),
      redis.dbsize()
    ]);
    
    // Parse memory usage
    const memoryMatch = info.match(/used_memory_human:(\d+\.?\d*[KMG]?B)/);
    const memoryUsage = memoryMatch ? memoryMatch[1] : 'unknown';
    
    // Parse keyspace hits/misses for hit rate
    const hitsMatch = info.match(/keyspace_hits:(\d+)/);
    const missesMatch = info.match(/keyspace_misses:(\d+)/);
    
    const hits = hitsMatch ? parseInt(hitsMatch[1]) : 0;
    const misses = missesMatch ? parseInt(missesMatch[1]) : 0;
    const hitRate = hits + misses > 0 ? (hits / (hits + misses)) * 100 : 0;
    
    return {
      hitRate: parseFloat(hitRate.toFixed(2)),
      totalKeys: dbsize,
      memoryUsage,
      connected: redis.status === 'ready'
    };
  } catch (error) {
    console.error('❌ Failed to get cache stats:', error);
    return {
      hitRate: 0,
      totalKeys: 0,
      memoryUsage: 'unknown',
      connected: false
    };
  }
}

/**
 * Clear all cache (use with caution)
 */
export async function clearAllCache(): Promise<void> {
  try {
    await redis.flushdb();
    console.log('🧹 All cache cleared');
  } catch (error) {
    console.error('❌ Failed to clear cache:', error);
  }
}

/**
 * Close Redis connection gracefully
 */
export async function closeRedisConnection(): Promise<void> {
  try {
    await redis.quit();
    console.log('👋 Redis connection closed gracefully');
  } catch (error) {
    console.error('❌ Error closing Redis connection:', error);
    redis.disconnect();
  }
}

// Export Redis instance for advanced usage
export { redis };