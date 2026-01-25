import { redis } from './client';

/**
 * Notification types
 */
export enum NotificationType {
  SYSTEM = 'system',
  USER = 'user',
  DATA = 'data',
  AUDIT = 'audit',
  ALERT = 'alert',
  REMINDER = 'reminder'
}

/**
 * Notification priority levels
 */
export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

/**
 * Notification status
 */
export enum NotificationStatus {
  UNREAD = 'unread',
  READ = 'read',
  ARCHIVED = 'archived',
  DELETED = 'deleted'
}

/**
 * Notification data structure
 */
export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, any>;
  recipientId: string; // User ID or 'system' for broadcast
  senderId?: string; // User ID or system service name
  createdAt: number; // Unix timestamp in milliseconds
  expiresAt?: number; // Unix timestamp in milliseconds
  status: NotificationStatus;
  readAt?: number; // Unix timestamp in milliseconds
  actionUrl?: string; // URL for action button
  actionLabel?: string; // Label for action button
  metadata?: Record<string, any>;
}

/**
 * Notification subscription
 */
export interface NotificationSubscription {
  userId: string;
  channels: string[];
  preferences: {
    email: boolean;
    push: boolean;
    inApp: boolean;
    webhook?: string;
  };
  filters?: {
    types?: NotificationType[];
    minPriority?: NotificationPriority;
    keywords?: string[];
  };
}

/**
 * Notification manager for Redis Pub/Sub
 */
export class NotificationManager {
  private publisher = redis.duplicate();
  private subscriber = redis.duplicate();
  private channels = new Map<string, Set<(notification: Notification) => void>>();

  constructor() {
    this.setupSubscriber();
  }

  /**
   * Send a notification
   */
  async sendNotification(notification: Notification): Promise<void> {
    try {
      // Store notification in Redis
      const notificationKey = `notification:${notification.id}`;
      await redis.setex(
        notificationKey,
        30 * 24 * 60 * 60, // 30 days TTL
        JSON.stringify(notification)
      );

      // Add to user's notification list
      const userNotificationsKey = `user:notifications:${notification.recipientId}`;
      await redis.zadd(userNotificationsKey, notification.createdAt, notification.id);
      await redis.expire(userNotificationsKey, 30 * 24 * 60 * 60); // 30 days

      // Add to type-based index
      const typeIndexKey = `notifications:by_type:${notification.type}`;
      await redis.zadd(typeIndexKey, notification.createdAt, notification.id);
      await redis.expire(typeIndexKey, 30 * 24 * 60 * 60); // 30 days

      // Publish to relevant channels
      const channel = this.getNotificationChannel(notification);
      await this.publisher.publish(channel, JSON.stringify(notification));

      console.log(`📤 Notification sent: ${notification.id} to ${notification.recipientId}`);
      
    } catch (error) {
      console.error('❌ Failed to send notification:', error);
      throw error;
    }
  }

  /**
   * Create and send a notification
   */
  async createAndSend(
    recipientId: string,
    type: NotificationType,
    title: string,
    message: string,
    options: {
      priority?: NotificationPriority;
      data?: Record<string, any>;
      senderId?: string;
      expiresInHours?: number;
      actionUrl?: string;
      actionLabel?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<Notification> {
    const now = Date.now();
    const notificationId = this.generateNotificationId();

    const notification: Notification = {
      id: notificationId,
      type,
      priority: options.priority || NotificationPriority.MEDIUM,
      title,
      message,
      data: options.data,
      recipientId,
      senderId: options.senderId || 'system',
      createdAt: now,
      expiresAt: options.expiresInHours ? now + (options.expiresInHours * 60 * 60 * 1000) : undefined,
      status: NotificationStatus.UNREAD,
      actionUrl: options.actionUrl,
      actionLabel: options.actionLabel,
      metadata: options.metadata
    };

    await this.sendNotification(notification);
    return notification;
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      status?: NotificationStatus;
      type?: NotificationType;
      unreadOnly?: boolean;
    } = {}
  ): Promise<Notification[]> {
    try {
      const userNotificationsKey = `user:notifications:${userId}`;
      
      // Determine which set to query
      let notificationIds: string[];
      
      if (options.type) {
        const typeIndexKey = `notifications:by_type:${options.type}`;
        notificationIds = await redis.zrevrange(typeIndexKey, 0, -1);
        
        // Filter by user
        const userSet = new Set(await redis.zrange(userNotificationsKey, 0, -1));
        notificationIds = notificationIds.filter(id => userSet.has(id));
      } else {
        notificationIds = await redis.zrevrange(userNotificationsKey, 0, -1);
      }
      
      // Apply pagination
      const start = options.offset || 0;
      const end = options.limit ? start + options.limit - 1 : -1;
      const paginatedIds = notificationIds.slice(start, end + 1);
      
      if (paginatedIds.length === 0) {
        return [];
      }
      
      // Fetch notification data
      const notificationKeys = paginatedIds.map(id => `notification:${id}`);
      const notificationData = await redis.mget(...notificationKeys);
      
      const notifications: Notification[] = [];
      
      for (const data of notificationData) {
        if (data) {
          try {
            const notification = JSON.parse(data);
            
            // Apply filters
            if (options.status && notification.status !== options.status) {
              continue;
            }
            
            if (options.unreadOnly && notification.status !== NotificationStatus.UNREAD) {
              continue;
            }
            
            notifications.push(notification);
          } catch (error) {
            console.error('❌ Failed to parse notification:', error);
          }
        }
      }
      
      return notifications;
      
    } catch (error) {
      console.error('❌ Failed to get user notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      const notificationKey = `notification:${notificationId}`;
      const notificationData = await redis.get(notificationKey);
      
      if (!notificationData) {
        throw new Error('Notification not found');
      }
      
      const notification: Notification = JSON.parse(notificationData);
      
      // Verify ownership
      if (notification.recipientId !== userId && userId !== 'system') {
        throw new Error('Not authorized to modify this notification');
      }
      
      // Update notification
      notification.status = NotificationStatus.READ;
      notification.readAt = Date.now();
      
      await redis.setex(
        notificationKey,
        30 * 24 * 60 * 60,
        JSON.stringify(notification)
      );
      
      console.log(`✅ Notification ${notificationId} marked as read`);
      
    } catch (error) {
      console.error(`❌ Failed to mark notification ${notificationId} as read:`, error);
      throw error;
    }
  }

  /**
   * Archive notification
   */
  async archiveNotification(notificationId: string, userId: string): Promise<void> {
    await this.updateNotificationStatus(notificationId, userId, NotificationStatus.ARCHIVED);
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      const notificationKey = `notification:${notificationId}`;
      const notificationData = await redis.get(notificationKey);
      
      if (!notificationData) {
        return; // Already deleted
      }
      
      const notification: Notification = JSON.parse(notificationData);
      
      // Verify ownership
      if (notification.recipientId !== userId && userId !== 'system') {
        throw new Error('Not authorized to delete this notification');
      }
      
      // Delete from Redis
      await redis.del(notificationKey);
      
      // Remove from user's notification list
      const userNotificationsKey = `user:notifications:${notification.recipientId}`;
      await redis.zrem(userNotificationsKey, notificationId);
      
      // Remove from type index
      const typeIndexKey = `notifications:by_type:${notification.type}`;
      await redis.zrem(typeIndexKey, notificationId);
      
      console.log(`🗑️ Notification ${notificationId} deleted`);
      
    } catch (error) {
      console.error(`❌ Failed to delete notification ${notificationId}:`, error);
      throw error;
    }
  }

  /**
   * Get notification statistics for a user
   */
  async getUserNotificationStats(userId: string): Promise<{
    total: number;
    unread: number;
    byType: Record<NotificationType, number>;
    byPriority: Record<NotificationPriority, number>;
  }> {
    try {
      const userNotificationsKey = `user:notifications:${userId}`;
      const notificationIds = await redis.zrange(userNotificationsKey, 0, -1);
      
      if (notificationIds.length === 0) {
        return {
          total: 0,
          unread: 0,
          byType: {} as Record<NotificationType, number>,
          byPriority: {} as Record<NotificationPriority, number>
        };
      }
      
      const notificationKeys = notificationIds.map(id => `notification:${id}`);
      const notificationData = await redis.mget(...notificationKeys);
      
      const stats = {
        total: 0,
        unread: 0,
        byType: {} as Record<NotificationType, number>,
        byPriority: {} as Record<NotificationPriority, number>
      };
      
      for (const data of notificationData) {
        if (data) {
          try {
            const notification: Notification = JSON.parse(data);
            stats.total++;
            
            if (notification.status === NotificationStatus.UNREAD) {
              stats.unread++;
            }
            
            // Count by type
            stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
            
            // Count by priority
            stats.byPriority[notification.priority] = (stats.byPriority[notification.priority] || 0) + 1;
          } catch (error) {
            console.error('❌ Failed to parse notification for stats:', error);
          }
        }
      }
      
      return stats;
      
    } catch (error) {
      console.error('❌ Failed to get notification stats:', error);
      return {
        total: 0,
        unread: 0,
        byType: {} as Record<NotificationType, number>,
        byPriority: {} as Record<NotificationPriority, number>
      };
    }
  }

  /**
   * Subscribe to notifications
   */
  async subscribe(
    userId: string,
    callback: (notification: Notification) => void
  ): Promise<() => void> {
    const channel = `notifications:user:${userId}`;
    
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
      await this.subscriber.subscribe(channel);
    }
    
    const channelCallbacks = this.channels.get(channel)!;
    channelCallbacks.add(callback);
    
    console.log(`👂 User ${userId} subscribed to notifications`);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.channels.get(channel);
      if (callbacks) {
        callbacks.delete(callback);
        
        if (callbacks.size === 0) {
          this.channels.delete(channel);
          this.subscriber.unsubscribe(channel);
        }
      }
    };
  }

  /**
   * Broadcast system notification
   */
  async broadcastSystemNotification(
    title: string,
    message: string,
    options: {
      priority?: NotificationPriority;
      data?: Record<string, any>;
      expiresInHours?: number;
    } = {}
  ): Promise<void> {
    // In a real system, you would get all active users
    // For now, we'll publish to system channel
    const notification = await this.createAndSend(
      'system',
      NotificationType.SYSTEM,
      title,
      message,
      {
        ...options,
        senderId: 'system'
      }
    );
    
    // Publish to system broadcast channel
    await this.publisher.publish('notifications:system:broadcast', JSON.stringify(notification));
    
    console.log(`📢 System broadcast: ${title}`);
  }

  /**
   * Clean up expired notifications
   */
  async cleanupExpiredNotifications(): Promise<number> {
    try {
      const now = Date.now();
      let cleanedCount = 0;
      
      // Scan all notifications
      const notificationKeys = await redis.keys('notification:*');
      
      for (const key of notificationKeys) {
        const notificationData = await redis.get(key);
        
        if (notificationData) {
          try {
            const notification: Notification = JSON.parse(notificationData);
            
            // Check if expired
            if (notification.expiresAt && notification.expiresAt < now) {
              await this.deleteNotification(notification.id, 'system');
              cleanedCount++;
            }
          } catch (error) {
            console.error('❌ Failed to parse notification during cleanup:', error);
          }
        }
      }
      
      console.log(`🧹 Cleaned up ${cleanedCount} expired notifications`);
      return cleanedCount;
      
    } catch (error) {
      console.error('❌ Failed to cleanup expired notifications:', error);
      return 0;
    }
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    try {
      await this.publisher.quit();
      await this.subscriber.quit();
      this.channels.clear();
      console.log('🔌 Closed notification manager connections');
    } catch (error) {
      console.error('❌ Error closing notification manager:', error);
      this.publisher.disconnect();
      this.subscriber.disconnect();
    }
  }

  /**
   * Private helper: Generate notification ID
   */
  private generateNotificationId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `notif_${timestamp}_${random}`;
  }

  /**
   * Private helper: Get notification channel
   */
  private getNotificationChannel(notification: Notification): string {
    if (notification.recipientId === 'system') {
      return 'notifications:system:broadcast';
    }
    
    return `notifications:user:${notification.recipientId}`;
  }

  /**
   * Private helper: Update notification status
   */
  private async updateNotificationStatus(
    notificationId: string,
    userId: string,
    status: NotificationStatus
  ): Promise<void> {
    try {
      const notificationKey = `notification:${notificationId}`;
      const notificationData = await redis.get(notificationKey);
      
      if (!notificationData) {
        throw new Error('Notification not found');
      }
      
      const notification: Notification = JSON.parse(notificationData);
      
      // Verify ownership
      if (notification.recipientId !== userId && userId !== 'system') {
        throw new Error('Not authorized to modify this notification');
      }
      
      // Update notification
      notification.status = status;
      
      await redis.setex(
        notificationKey,
        30 * 24 * 60 * 60,
        JSON.stringify(notification)
      );
      
      console.log(`✅ Notification ${notificationId} status updated to ${status}`);
      
    } catch (error) {
      console.error(`❌ Failed to update notification ${notificationId} status:`, error);
      throw error;
    }
  }

  /**
   * Private helper: Setup subscriber event handlers
   */
  private setupSubscriber(): void {
    this.subscriber.on('message', (channel, message) => {
      try {
        const notification: Notification = JSON.parse(message);
        
        // Notify channel subscribers
        const channelCallbacks = this.channels.get(channel);
        if (channelCallbacks) {
          channelCallbacks.forEach(callback => {
            try {
              callback(notification);
            } catch (error) {
              console.error('❌ Error in notification callback:', error);
            }
          });
        }
        
        // Also notify system broadcast subscribers
        if (channel !== 'notifications:system:broadcast') {
          const systemCallbacks = this.channels.get('notifications:system:broadcast');
          if (systemCallbacks) {
            systemCallbacks.forEach(callback => {
              try {
                callback(notification);
              } catch (error) {
                console.error('❌ Error in system notification callback:', error);
              }
            });
          }
        }
        
      } catch (error) {
        console.error('❌ Failed to parse notification message:', error);
      }
    });
    
    this.subscriber.on('subscribe', (channel, count) => {
      console.log(`✅ Subscribed to channel ${channel} (total: ${count})`);
    });
    
    this.subscriber.on('unsubscribe', (channel, count) => {
      console.log(`✅ Unsubscribed from channel ${channel} (total: ${count})`);
    });
    
    this.subscriber.on('error', (error) => {
      console.error('❌ Redis Pub/Sub error:', error);
    });
  }
}

/**
 * Default notification manager instance
 */
export const notificationManager = new NotificationManager();

/**
 * Predefined notification templates
 */
export const NotificationTemplates = {
  // System notifications
  SYSTEM_UPDATE: (version: string) => ({
    title: 'System Update',
    message: `System has been updated to version ${version}. New features are available.`,
    type: NotificationType.SYSTEM,
    priority: NotificationPriority.MEDIUM
  }),
  
  MAINTENANCE_SCHEDULED: (startTime: string, duration: string) => ({
    title: 'Maintenance Scheduled',
    message: `System maintenance scheduled for ${startTime}. Expected downtime: ${duration}.`,
    type: NotificationType.SYSTEM,
    priority: NotificationPriority.HIGH
  }),
  
  // User notifications
  WELCOME: (userName: string) => ({
    title: 'Welcome to the System',
    message: `Welcome ${userName}! Your account has been successfully created.`,
    type: NotificationType.USER,
    priority: NotificationPriority.LOW
  }),
  
  PASSWORD_CHANGED: () => ({
    title: 'Password Changed',
    message: 'Your password has been successfully changed.',
    type: NotificationType.USER,
    priority: NotificationPriority.MEDIUM
  }),
  
  // Data notifications
  DATA_IMPORT_COMPLETE: (fileName: string, recordCount: number) => ({
    title: 'Data Import Complete',
    message: `Import of ${fileName} completed successfully. ${recordCount} records imported.`,
    type: NotificationType.DATA,
    priority: NotificationPriority.MEDIUM
  }),
  
  DATA_IMPORT_FAILED: (fileName: string, error: string) => ({
    title: 'Data Import Failed',
    message: `Import of ${fileName} failed: ${error}`,
    type: NotificationType.DATA,
    priority: NotificationPriority.HIGH
  }),
  
  PS_CREATED: (psName: string) => ({
    title: 'New Perhutanan Sosial Created',
    message: `New Perhutanan Sosial "${psName}" has been created.`,
    type: NotificationType.DATA,
    priority: NotificationPriority.MEDIUM,
    actionUrl: '/dashboard/ps',
    actionLabel: 'View PS'
  }),
  
  CARBON_PROJECT_CREATED: (projectName: string) => ({
    title: 'New Carbon Project Created',
    message: `New carbon project "${projectName}" has been created.`,
    type: NotificationType.DATA,
    priority: NotificationPriority.MEDIUM,
    actionUrl: '/dashboard/carbon',
    actionLabel: 'View Project'
  }),
  
  // Audit notifications
  AUDIT_LOG_CREATED: (action: string, user: string) => ({
    title: 'Audit Log Entry',
    message: `User ${user} performed action: ${action}`,
    type: NotificationType.AUDIT,
    priority: NotificationPriority.LOW
  }),
  
  // Alert notifications
  RATE_LIMIT_EXCEEDED: (userId: string, endpoint: string) => ({
    title: 'Rate Limit Exceeded',
    message: `User ${userId} exceeded rate limit for endpoint ${endpoint}`,
    type: NotificationType.ALERT,
    priority: NotificationPriority.HIGH
  }),
  
  SYSTEM_ERROR: (error: string) => ({
    title: 'System Error',
    message: `System error occurred: ${error}`,
    type: NotificationType.ALERT,
    priority: NotificationPriority.URGENT
  }),
  
  // Reminder notifications
  DATA_BACKUP_REMINDER: () => ({
    title: 'Data Backup Reminder',
    message: 'Weekly data backup is due. Please ensure all data is backed up.',
    type: NotificationType.REMINDER,
    priority: NotificationPriority.MEDIUM
  }),
  
  REPORT_DUE_REMINDER: (reportName: string, dueDate: string) => ({
    title: 'Report Due Soon',
    message: `Report "${reportName}" is due on ${dueDate}. Please complete it soon.`,
    type: NotificationType.REMINDER,
    priority: NotificationPriority.MEDIUM,
    actionUrl: '/dashboard/reports',
    actionLabel: 'View Reports'
  })
};

/**
 * Helper function to send templated notification
 */
export async function sendTemplatedNotification(
  template: ReturnType<typeof NotificationTemplates[keyof typeof NotificationTemplates]>,
  recipientId: string,
  options?: {
    senderId?: string;
    data?: Record<string, any>;
    metadata?: Record<string, any>;
  }
): Promise<Notification> {
  return notificationManager.createAndSend(
    recipientId,
    template.type,
    template.title,
    template.message,
    {
      priority: template.priority,
      senderId: options?.senderId,
      data: options?.data,
      actionUrl: 'actionUrl' in template ? template.actionUrl : undefined,
      actionLabel: 'actionLabel' in template ? template.actionLabel : undefined,
      metadata: options?.metadata
    }
  );
}