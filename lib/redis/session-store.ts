import { redis } from './client';
import { encryptData, decryptData, maskSensitiveFields } from './security';

/**
 * User session data interface
 */
export interface UserSession {
  userId: string;
  email?: string;
  fullName?: string;
  role: 'admin' | 'monev' | 'viewer';
  lastActivity: number; // Unix timestamp in milliseconds
  createdAt: number;    // Unix timestamp in milliseconds
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

/**
 * User profile cache interface
 */
export interface UserProfileCache {
  userId: string;
  fullName: string;
  role: 'admin' | 'monev' | 'viewer';
  email?: string;
  phone?: string;
  location?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  preferences?: Record<string, any>;
}

/**
 * Session store configuration
 */
export interface SessionStoreConfig {
  sessionTtl: number;      // Session TTL in seconds (default: 24 hours)
  profileTtl: number;      // Profile cache TTL in seconds (default: 1 hour)
  maxSessionsPerUser: number; // Maximum concurrent sessions per user
  encryptSensitive: boolean; // Whether to encrypt sensitive session data
}

/**
 * Default session store configuration
 */
export const DEFAULT_SESSION_CONFIG: SessionStoreConfig = {
  sessionTtl: 24 * 60 * 60,      // 24 hours
  profileTtl: 60 * 60,           // 1 hour
  maxSessionsPerUser: 5,         // 5 concurrent sessions
  encryptSensitive: true         // Encrypt sensitive data
};

/**
 * Session store for managing user sessions and profile caching in Redis
 */
export class RedisSessionStore {
  private config: SessionStoreConfig;

  constructor(config: Partial<SessionStoreConfig> = {}) {
    this.config = { ...DEFAULT_SESSION_CONFIG, ...config };
  }

  /**
   * Create or update a user session
   */
  async setSession(session: UserSession): Promise<void> {
    try {
      const sessionKey = `session:${session.userId}:${Date.now()}`;
      const userSessionsKey = `user:sessions:${session.userId}`;
      
      // Prepare session data
      let sessionData = { ...session };
      
      // Apply security measures
      sessionData = maskSensitiveFields(sessionData);
      
      let dataToStore: string;
      if (this.config.encryptSensitive) {
        dataToStore = encryptData(sessionData);
      } else {
        dataToStore = JSON.stringify(sessionData);
      }
      
      // Store session
      await redis.setex(
        sessionKey,
        this.config.sessionTtl,
        dataToStore
      );
      
      // Add to user's session list
      await redis.sadd(userSessionsKey, sessionKey);
      await redis.expire(userSessionsKey, this.config.sessionTtl);
      
      // Enforce max sessions per user
      await this.enforceMaxSessions(session.userId);
      
      console.log(`✅ Session created/updated for user ${session.userId}`);
      
    } catch (error) {
      console.error('❌ Failed to set session:', error);
      throw error;
    }
  }

  /**
   * Get a user session
   */
  async getSession(userId: string, sessionId?: string): Promise<UserSession | null> {
    try {
      let sessionKey: string;
      
      if (sessionId) {
        sessionKey = `session:${userId}:${sessionId}`;
      } else {
        // Get the most recent session
        const userSessionsKey = `user:sessions:${userId}`;
        const sessions = await redis.smembers(userSessionsKey);
        
        if (sessions.length === 0) {
          return null;
        }
        
        // Get the most recent session (last in the set)
        sessionKey = sessions[sessions.length - 1];
      }
      
      const sessionData = await redis.get(sessionKey);
      
      if (!sessionData) {
        return null;
      }
      
      let session: UserSession;
      
      if (this.config.encryptSensitive) {
        session = decryptData<UserSession>(sessionData);
      } else {
        session = JSON.parse(sessionData);
      }
      
      // Update last activity
      session.lastActivity = Date.now();
      await this.updateSessionActivity(sessionKey, session);
      
      return session;
      
    } catch (error) {
      console.error('❌ Failed to get session:', error);
      return null;
    }
  }

  /**
   * Delete a user session
   */
  async deleteSession(userId: string, sessionId?: string): Promise<void> {
    try {
      if (sessionId) {
        const sessionKey = `session:${userId}:${sessionId}`;
        await redis.del(sessionKey);
        
        // Remove from user's session list
        const userSessionsKey = `user:sessions:${userId}`;
        await redis.srem(userSessionsKey, sessionKey);
        
        console.log(`🗑️ Session ${sessionId} deleted for user ${userId}`);
      } else {
        // Delete all sessions for user
        await this.deleteAllUserSessions(userId);
      }
    } catch (error) {
      console.error('❌ Failed to delete session:', error);
    }
  }

  /**
   * Delete all sessions for a user
   */
  async deleteAllUserSessions(userId: string): Promise<void> {
    try {
      const userSessionsKey = `user:sessions:${userId}`;
      const sessions = await redis.smembers(userSessionsKey);
      
      if (sessions.length > 0) {
        await redis.del(...sessions);
      }
      
      await redis.del(userSessionsKey);
      console.log(`🗑️ All sessions deleted for user ${userId}`);
    } catch (error) {
      console.error('❌ Failed to delete all user sessions:', error);
    }
  }

  /**
   * Cache user profile data
   */
  async cacheUserProfile(profile: UserProfileCache): Promise<void> {
    try {
      const profileKey = `user:profile:${profile.userId}`;
      
      // Prepare profile data
      let profileData = { ...profile };
      
      // Apply security measures
      profileData = maskSensitiveFields(profileData);
      
      let dataToStore: string;
      if (this.config.encryptSensitive) {
        dataToStore = encryptData(profileData);
      } else {
        dataToStore = JSON.stringify(profileData);
      }
      
      await redis.setex(
        profileKey,
        this.config.profileTtl,
        dataToStore
      );
      
      // Also store in user index for quick lookup
      await redis.zadd(
        'users:index',
        Date.now(),
        profile.userId
      );
      
      console.log(`✅ Profile cached for user ${profile.userId}`);
      
    } catch (error) {
      console.error('❌ Failed to cache user profile:', error);
    }
  }

  /**
   * Get cached user profile
   */
  async getCachedProfile(userId: string): Promise<UserProfileCache | null> {
    try {
      const profileKey = `user:profile:${userId}`;
      const profileData = await redis.get(profileKey);
      
      if (!profileData) {
        return null;
      }
      
      let profile: UserProfileCache;
      
      if (this.config.encryptSensitive) {
        profile = decryptData<UserProfileCache>(profileData);
      } else {
        profile = JSON.parse(profileData);
      }
      
      return profile;
    } catch (error) {
      console.error('❌ Failed to get cached profile:', error);
      return null;
    }
  }

  /**
   * Invalidate user profile cache
   */
  async invalidateProfileCache(userId: string): Promise<void> {
    try {
      const profileKey = `user:profile:${userId}`;
      await redis.del(profileKey);
      console.log(`🔄 Profile cache invalidated for user ${userId}`);
    } catch (error) {
      console.error('❌ Failed to invalidate profile cache:', error);
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<UserSession[]> {
    try {
      const userSessionsKey = `user:sessions:${userId}`;
      const sessionKeys = await redis.smembers(userSessionsKey);
      
      const sessions: UserSession[] = [];
      
      for (const sessionKey of sessionKeys) {
        const sessionData = await redis.get(sessionKey);
        
        if (sessionData) {
          let session: UserSession;
          
          if (this.config.encryptSensitive) {
            session = decryptData<UserSession>(sessionData);
          } else {
            session = JSON.parse(sessionData);
          }
          
          sessions.push(session);
        }
      }
      
      return sessions.sort((a, b) => b.lastActivity - a.lastActivity);
    } catch (error) {
      console.error('❌ Failed to get user sessions:', error);
      return [];
    }
  }

  /**
   * Get active users (users with recent activity)
   */
  async getActiveUsers(limit: number = 100): Promise<string[]> {
    try {
      // Get users with activity in the last hour
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      
      return await redis.zrangebyscore(
        'users:index',
        oneHourAgo,
        '+inf',
        'LIMIT',
        0,
        limit
      );
    } catch (error) {
      console.error('❌ Failed to get active users:', error);
      return [];
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      // This is a simplified cleanup - in production, use Redis TTL
      // or a scheduled job with SCAN
      const userKeys = await redis.keys('user:sessions:*');
      let cleanedCount = 0;
      
      for (const userKey of userKeys) {
        const sessionKeys = await redis.smembers(userKey);
        const validSessions: string[] = [];
        
        for (const sessionKey of sessionKeys) {
          const ttl = await redis.ttl(sessionKey);
          
          if (ttl > 0) {
            validSessions.push(sessionKey);
          } else {
            await redis.del(sessionKey);
            cleanedCount++;
          }
        }
        
        if (validSessions.length === 0) {
          await redis.del(userKey);
        } else {
          // Rebuild the set with only valid sessions
          await redis.del(userKey);
          await redis.sadd(userKey, ...validSessions);
        }
      }
      
      console.log(`🧹 Cleaned up ${cleanedCount} expired sessions`);
      return cleanedCount;
    } catch (error) {
      console.error('❌ Failed to cleanup expired sessions:', error);
      return 0;
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<{
    totalSessions: number;
    activeUsers: number;
    avgSessionsPerUser: number;
    memoryUsage: string;
  }> {
    try {
      const sessionKeys = await redis.keys('session:*');
      const userSessionKeys = await redis.keys('user:sessions:*');
      
      let totalSessions = 0;
      let totalUsers = userSessionKeys.length;
      
      for (const userKey of userSessionKeys) {
        const count = await redis.scard(userKey);
        totalSessions += count;
      }
      
      const avgSessionsPerUser = totalUsers > 0 ? totalSessions / totalUsers : 0;
      
      // Get memory info
      const info = await redis.info();
      const memoryMatch = info.match(/used_memory_human:(\d+\.?\d*[KMG]?B)/);
      const memoryUsage = memoryMatch ? memoryMatch[1] : 'unknown';
      
      return {
        totalSessions,
        activeUsers: totalUsers,
        avgSessionsPerUser: parseFloat(avgSessionsPerUser.toFixed(2)),
        memoryUsage
      };
    } catch (error) {
      console.error('❌ Failed to get session stats:', error);
      return {
        totalSessions: 0,
        activeUsers: 0,
        avgSessionsPerUser: 0,
        memoryUsage: 'unknown'
      };
    }
  }

  /**
   * Private helper: Enforce maximum sessions per user
   */
  private async enforceMaxSessions(userId: string): Promise<void> {
    try {
      const userSessionsKey = `user:sessions:${userId}`;
      const sessionCount = await redis.scard(userSessionsKey);
      
      if (sessionCount > this.config.maxSessionsPerUser) {
        // Remove oldest sessions
        const sessions = await redis.smembers(userSessionsKey);
        const sessionsToRemove = sessions.slice(0, sessionCount - this.config.maxSessionsPerUser);
        
        for (const sessionKey of sessionsToRemove) {
          await redis.del(sessionKey);
          await redis.srem(userSessionsKey, sessionKey);
        }
        
        console.log(`⚠️ Removed ${sessionsToRemove.length} old sessions for user ${userId}`);
      }
    } catch (error) {
      console.error('❌ Failed to enforce max sessions:', error);
    }
  }

  /**
   * Private helper: Update session activity timestamp
   */
  private async updateSessionActivity(sessionKey: string, session: UserSession): Promise<void> {
    try {
      // Update TTL to extend session
      await redis.expire(sessionKey, this.config.sessionTtl);
      
      // Update session data with new timestamp
      let dataToStore: string;
      if (this.config.encryptSensitive) {
        dataToStore = encryptData(session);
      } else {
        dataToStore = JSON.stringify(session);
      }
      
      await redis.setex(
        sessionKey,
        this.config.sessionTtl,
        dataToStore
      );
    } catch (error) {
      console.error('❌ Failed to update session activity:', error);
    }
  }
}

/**
 * Create a default session store instance
 */
export const sessionStore = new RedisSessionStore();

/**
 * Helper function to convert Supabase profile to cache format
 */
export function supabaseProfileToCache(
  supabaseProfile: any,
  userId: string
): UserProfileCache {
  return {
    userId,
    fullName: supabaseProfile.full_name || '',
    role: supabaseProfile.role || 'viewer',
    email: supabaseProfile.email,
    phone: supabaseProfile.phone,
    location: supabaseProfile.location,
    bio: supabaseProfile.bio,
    createdAt: supabaseProfile.created_at || new Date().toISOString(),
    updatedAt: supabaseProfile.updated_at || new Date().toISOString(),
    preferences: supabaseProfile.preferences || {}
  };
}

/**
 * Helper function to create session from auth data
 */
export function createUserSession(
  userId: string,
  userData: {
    email?: string;
    fullName?: string;
    role?: 'admin' | 'monev' | 'viewer';
  },
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    [key: string]: any;
  }
): UserSession {
  const now = Date.now();
  
  return {
    userId,
    email: userData.email,
    fullName: userData.fullName,
    role: userData.role || 'viewer',
    lastActivity: now,
    createdAt: now,
    ipAddress: metadata?.ipAddress,
    userAgent: metadata?.userAgent,
    metadata: metadata
  };
}