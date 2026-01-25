import { redis } from './client';

/**
 * Cache invalidation patterns
 */
export enum InvalidationPattern {
  ALL = '*',                     // Invalidate all cache
  API = 'api:*',                 // Invalidate all API cache
  USER = 'user:*',               // Invalidate all user-related cache
  SESSION = 'session:*',         // Invalidate all sessions
  PS_DATA = 'api:ps*',           // Invalidate Perhutanan Sosial data
  CARBON_DATA = 'api:carbon*',   // Invalidate Carbon projects data
  DASHBOARD = 'api:dashboard*',  // Invalidate dashboard data
  PROFILE = 'user:profile:*',    // Invalidate user profiles
}

/**
 * Cache invalidation strategies
 */
export enum InvalidationStrategy {
  IMMEDIATE = 'immediate',    // Invalidate immediately
  DELAYED = 'delayed',        // Invalidate after delay
  VERSIONED = 'versioned',    // Use versioning for soft invalidation
  PATTERN = 'pattern',        // Use pattern-based invalidation
}

/**
 * Cache invalidation event
 */
export interface CacheInvalidationEvent {
  pattern: string | InvalidationPattern;
  reason: string;
  timestamp: number;
  triggeredBy: string; // user ID or system
  affectedKeys?: number;
  strategy?: InvalidationStrategy;
}

/**
 * Cache invalidation manager
 */
export class CacheInvalidationManager {
  private static instance: CacheInvalidationManager;
  private subscribers: Array<(event: CacheInvalidationEvent) => void> = [];

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): CacheInvalidationManager {
    if (!CacheInvalidationManager.instance) {
      CacheInvalidationManager.instance = new CacheInvalidationManager();
    }
    return CacheInvalidationManager.instance;
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateByPattern(
    pattern: string | InvalidationPattern,
    reason: string,
    triggeredBy: string = 'system'
  ): Promise<CacheInvalidationEvent> {
    try {
      console.log(`🔄 Invalidating cache with pattern: ${pattern}`);
      
      // Find keys matching pattern
      const keys = await redis.keys(pattern);
      
      if (keys.length === 0) {
        console.log(`ℹ️ No keys found for pattern: ${pattern}`);
        return this.createEvent(pattern, reason, triggeredBy, 0);
      }
      
      // Delete keys
      await redis.del(...keys);
      
      console.log(`🗑️ Invalidated ${keys.length} cache keys for pattern: ${pattern}`);
      
      // Create event
      const event = this.createEvent(pattern, reason, triggeredBy, keys.length);
      
      // Notify subscribers
      this.notifySubscribers(event);
      
      return event;
      
    } catch (error) {
      console.error(`❌ Cache invalidation failed for pattern ${pattern}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate cache for specific entity
   */
  async invalidateEntity(
    entityType: string,
    entityId: string,
    reason: string,
    triggeredBy: string = 'system'
  ): Promise<CacheInvalidationEvent> {
    try {
      // Define patterns for different entity types
      const patterns: Record<string, string[]> = {
        user: [
          `user:profile:${entityId}`,
          `user:sessions:${entityId}`,
          `session:${entityId}:*`,
          `api:*:user:${entityId}:*`,
        ],
        ps: [
          `api:ps:*:${entityId}:*`,
          `api:ps-list:*:*${entityId}*`,
          `api:dashboard:*ps*${entityId}*`,
        ],
        carbon: [
          `api:carbon-projects:*:${entityId}:*`,
          `api:dashboard:*carbon*${entityId}*`,
        ],
        dashboard: [
          `api:dashboard:*`,
          `api:dashboard:stats:*`,
          `api:dashboard:aggregates:*`,
        ],
      };
      
      const entityPatterns = patterns[entityType] || [`*:${entityType}:${entityId}:*`];
      let totalInvalidated = 0;
      
      for (const pattern of entityPatterns) {
        const event = await this.invalidateByPattern(pattern, reason, triggeredBy);
        totalInvalidated += event.affectedKeys || 0;
      }
      
      return this.createEvent(
        `${entityType}:${entityId}`,
        reason,
        triggeredBy,
        totalInvalidated
      );
      
    } catch (error) {
      console.error(`❌ Entity invalidation failed for ${entityType} ${entityId}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate cache after data mutation
   */
  async invalidateAfterMutation(
    mutationType: string,
    data: any,
    userId: string
  ): Promise<CacheInvalidationEvent[]> {
    const events: CacheInvalidationEvent[] = [];
    
    try {
      // Determine invalidation based on mutation type
      switch (mutationType) {
        case 'profile_update':
          events.push(
            await this.invalidateEntity('user', data.id || userId, 'Profile updated', userId)
          );
          events.push(
            await this.invalidateByPattern(
              InvalidationPattern.PROFILE,
              'User profile updated',
              userId
            )
          );
          break;
          
        case 'ps_create':
        case 'ps_update':
        case 'ps_delete':
          events.push(
            await this.invalidateEntity('ps', data.id, 'PS data modified', userId)
          );
          events.push(
            await this.invalidateByPattern(
              InvalidationPattern.PS_DATA,
              'PS data changed',
              userId
            )
          );
          events.push(
            await this.invalidateByPattern(
              InvalidationPattern.DASHBOARD,
              'Dashboard stats outdated',
              userId
            )
          );
          break;
          
        case 'carbon_project_create':
        case 'carbon_project_update':
        case 'carbon_project_delete':
          events.push(
            await this.invalidateEntity('carbon', data.id, 'Carbon project modified', userId)
          );
          events.push(
            await this.invalidateByPattern(
              InvalidationPattern.CARBON_DATA,
              'Carbon data changed',
              userId
            )
          );
          events.push(
            await this.invalidateByPattern(
              InvalidationPattern.DASHBOARD,
              'Dashboard stats outdated',
              userId
            )
          );
          break;
          
        case 'data_import':
          // Invalidate all relevant data after import
          events.push(
            await this.invalidateByPattern(
              InvalidationPattern.PS_DATA,
              'Data import completed',
              userId
            )
          );
          events.push(
            await this.invalidateByPattern(
              InvalidationPattern.CARBON_DATA,
              'Data import completed',
              userId
            )
          );
          events.push(
            await this.invalidateByPattern(
              InvalidationPattern.DASHBOARD,
              'Data import completed',
              userId
            )
          );
          break;
          
        default:
          console.warn(`⚠️ Unknown mutation type: ${mutationType}`);
      }
      
      console.log(`✅ Invalidated cache for ${mutationType} by user ${userId}`);
      return events;
      
    } catch (error) {
      console.error(`❌ Cache invalidation after mutation failed:`, error);
      return events;
    }
  }

  /**
   * Subscribe to cache invalidation events
   */
  subscribe(callback: (event: CacheInvalidationEvent) => void): () => void {
    this.subscribers.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Get invalidation statistics
   */
  async getStats(): Promise<{
    totalInvalidations: number;
    lastHourInvalidations: number;
    mostInvalidatedPattern: string;
    patterns: Record<string, number>;
  }> {
    try {
      // In a real implementation, you would track these metrics
      // For now, return placeholder stats
      return {
        totalInvalidations: 0,
        lastHourInvalidations: 0,
        mostInvalidatedPattern: 'unknown',
        patterns: {}
      };
    } catch (error) {
      console.error('❌ Failed to get invalidation stats:', error);
      return {
        totalInvalidations: 0,
        lastHourInvalidations: 0,
        mostInvalidatedPattern: 'unknown',
        patterns: {}
      };
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  async clearAll(reason: string = 'Manual cleanup', triggeredBy: string = 'system'): Promise<CacheInvalidationEvent> {
    try {
      console.warn('⚠️ Clearing ALL cache - this is a destructive operation');
      
      const event = await this.invalidateByPattern(
        InvalidationPattern.ALL,
        reason,
        triggeredBy
      );
      
      console.log('🧹 All cache cleared');
      return event;
      
    } catch (error) {
      console.error('❌ Failed to clear all cache:', error);
      throw error;
    }
  }

  /**
   * Private helper: Create invalidation event
   */
  private createEvent(
    pattern: string | InvalidationPattern,
    reason: string,
    triggeredBy: string,
    affectedKeys: number
  ): CacheInvalidationEvent {
    return {
      pattern,
      reason,
      timestamp: Date.now(),
      triggeredBy,
      affectedKeys,
      strategy: InvalidationStrategy.IMMEDIATE
    };
  }

  /**
   * Private helper: Notify subscribers
   */
  private notifySubscribers(event: CacheInvalidationEvent): void {
    this.subscribers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('❌ Error in cache invalidation subscriber:', error);
      }
    });
  }
}

/**
 * Default cache invalidation manager instance
 */
export const cacheInvalidator = CacheInvalidationManager.getInstance();

/**
 * Real-time cache invalidation using Redis Pub/Sub
 */
export class RealTimeCacheInvalidator {
  private publisher = redis.duplicate();
  private subscriber = redis.duplicate();
  private channels = new Set<string>();
  
  constructor() {
    this.setupSubscriber();
  }
  
  /**
   * Publish cache invalidation event
   */
  async publishInvalidation(
    channel: string,
    event: CacheInvalidationEvent
  ): Promise<number> {
    try {
      const message = JSON.stringify(event);
      const result = await this.publisher.publish(channel, message);
      
      console.log(`📢 Published invalidation to channel ${channel}:`, event.reason);
      return result;
      
    } catch (error) {
      console.error(`❌ Failed to publish to channel ${channel}:`, error);
      return 0;
    }
  }
  
  /**
   * Subscribe to cache invalidation channel
   */
  async subscribeToChannel(
    channel: string,
    handler: (event: CacheInvalidationEvent) => void
  ): Promise<void> {
    try {
      if (!this.channels.has(channel)) {
        await this.subscriber.subscribe(channel);
        this.channels.add(channel);
      }
      
      // Add message handler
      this.subscriber.on('message', (ch, message) => {
        if (ch === channel) {
          try {
            const event: CacheInvalidationEvent = JSON.parse(message);
            handler(event);
          } catch (error) {
            console.error(`❌ Failed to parse message from channel ${channel}:`, error);
          }
        }
      });
      
      console.log(`👂 Subscribed to cache invalidation channel: ${channel}`);
      
    } catch (error) {
      console.error(`❌ Failed to subscribe to channel ${channel}:`, error);
    }
  }
  
  /**
   * Unsubscribe from channel
   */
  async unsubscribeFromChannel(channel: string): Promise<void> {
    try {
      await this.subscriber.unsubscribe(channel);
      this.channels.delete(channel);
      console.log(`👋 Unsubscribed from channel: ${channel}`);
    } catch (error) {
      console.error(`❌ Failed to unsubscribe from channel ${channel}:`, error);
    }
  }
  
  /**
   * Get active channels
   */
  getActiveChannels(): string[] {
    return Array.from(this.channels);
  }
  
  /**
   * Close connections
   */
  async close(): Promise<void> {
    try {
      await this.publisher.quit();
      await this.subscriber.quit();
      this.channels.clear();
      console.log('🔌 Closed Pub/Sub connections');
    } catch (error) {
      console.error('❌ Error closing Pub/Sub connections:', error);
      this.publisher.disconnect();
      this.subscriber.disconnect();
    }
  }
  
  /**
   * Private helper: Setup subscriber event handlers
   */
  private setupSubscriber(): void {
    this.subscriber.on('subscribe', (channel, count) => {
      console.log(`✅ Subscribed to channel ${channel} (total: ${count})`);
    });
    
    this.subscriber.on('unsubscribe', (channel, count) => {
      console.log(`✅ Unsubscribed from channel ${channel} (total: ${count})`);
    });
    
    this.subscriber.on('error', (error) => {
      console.error('❌ Redis Pub/Sub error:', error);
    });
    
    this.subscriber.on('end', () => {
      console.log('🔌 Redis Pub/Sub connection ended');
    });
  }
}

/**
 * Default real-time cache invalidator instance
 */
export const realTimeInvalidator = new RealTimeCacheInvalidator();

/**
 * Channel names for cache invalidation
 */
export const CacheChannels = {
  GLOBAL_INVALIDATION: 'cache:invalidation:global',
  USER_INVALIDATION: 'cache:invalidation:user',
  PS_INVALIDATION: 'cache:invalidation:ps',
  CARBON_INVALIDATION: 'cache:invalidation:carbon',
  DASHBOARD_INVALIDATION: 'cache:invalidation:dashboard',
  SYSTEM_EVENTS: 'cache:system:events'
} as const;