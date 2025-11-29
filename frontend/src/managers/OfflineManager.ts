import { logger } from '../utils/Logger';

/**
 * Offline Support Manager - Handles offline functionality and data synchronization
 * Provides seamless offline/online transitions with data persistence and sync
 */
export class OfflineManager {
  private static instance: OfflineManager;
  private isOnline: boolean = navigator.onLine;
  private syncQueue: Array<{ id: string; action: string; data: any; timestamp: number }> = [];
  private syncInProgress: boolean = false;
  private observers: Set<(online: boolean) => void> = new Set();

  private constructor() {
    this.initializeOfflineSupport();
  }

  public static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  /**
   * Initialize offline support functionality
   */
  private initializeOfflineSupport(): void {
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Check initial online status
    this.isOnline = navigator.onLine;

    // Setup service worker for caching (if available)
    this.registerServiceWorker();

    // Load pending sync queue from storage
    this.loadSyncQueue();

    // Setup periodic sync attempts
    this.setupPeriodicSync();

    logger.info('OfflineManager', `Offline support initialized. Online: ${this.isOnline}`);
  }

  /**
   * Register service worker for caching
   */
  private async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        logger.info('OfflineManager', 'Service worker registered successfully');

        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available
                this.notifyUpdateAvailable();
              }
            });
          }
        });
      } catch (error) {
        logger.warn('OfflineManager', 'Service worker registration failed', error);
      }
    }
  }

  /**
   * Handle coming online
   */
  private handleOnline(): void {
    const wasOffline = !this.isOnline;
    this.isOnline = true;

    logger.info('OfflineManager', 'Device came online');

    if (wasOffline) {
      // Notify observers
      this.observers.forEach(observer => {
        try {
          observer(true);
        } catch (error) {
          logger.error('OfflineManager', 'Error in online observer', error);
        }
      });

      // Start syncing pending data
      this.syncPendingData();
    }
  }

  /**
   * Handle going offline
   */
  private handleOffline(): void {
    this.isOnline = false;

    logger.info('OfflineManager', 'Device went offline');

    // Notify observers
    this.observers.forEach(observer => {
      try {
        observer(false);
      } catch (error) {
        logger.error('OfflineManager', 'Error in offline observer', error);
      }
    });
  }

  /**
   * Check if device is online
   */
  public isDeviceOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Add observer for online/offline status changes
   */
  public addStatusObserver(callback: (online: boolean) => void): void {
    this.observers.add(callback);
  }

  /**
   * Remove observer
   */
  public removeStatusObserver(callback: (online: boolean) => void): void {
    this.observers.delete(callback);
  }

  /**
   * Queue action for later sync when online
   */
  public queueForSync(action: string, data: any): string {
    const syncItem = {
      id: this.generateId(),
      action,
      data,
      timestamp: Date.now()
    };

    this.syncQueue.push(syncItem);
    this.saveSyncQueue();

    logger.debug('OfflineManager', `Queued action for sync: ${action}`, syncItem);

    // Try to sync immediately if online
    if (this.isOnline) {
      this.syncPendingData();
    }

    return syncItem.id;
  }

  /**
   * Remove item from sync queue
   */
  public removeFromSyncQueue(syncId: string): void {
    const index = this.syncQueue.findIndex(item => item.id === syncId);
    if (index > -1) {
      this.syncQueue.splice(index, 1);
      this.saveSyncQueue();
      logger.debug('OfflineManager', `Removed sync item: ${syncId}`);
    }
  }

  /**
   * Sync pending data with server
   */
  private async syncPendingData(): Promise<void> {
    if (this.syncInProgress || this.syncQueue.length === 0 || !this.isOnline) {
      return;
    }

    this.syncInProgress = true;
    logger.info('OfflineManager', `Starting sync of ${this.syncQueue.length} pending items`);

    const itemsToSync = [...this.syncQueue];

    for (const item of itemsToSync) {
      try {
        await this.syncItem(item);
        // Remove successfully synced item
        this.removeFromSyncQueue(item.id);
        logger.debug('OfflineManager', `Successfully synced item: ${item.action}`);
      } catch (error) {
        logger.warn('OfflineManager', `Failed to sync item ${item.action}:`, error);

        // If it's a permanent failure (4xx), remove it
        if (error && typeof error === 'object' && 'status' in error && (error as any).status >= 400 && (error as any).status < 500) {
          this.removeFromSyncQueue(item.id);
          logger.warn('OfflineManager', `Removed permanently failed sync item: ${item.action}`);
        }
        // Otherwise, keep it for retry
      }
    }

    this.syncInProgress = false;
    logger.info('OfflineManager', 'Sync completed');
  }

  /**
   * Sync individual item
   */
  private async syncItem(item: any): Promise<void> {
    switch (item.action) {
      case 'game_result':
        await this.syncGameResult(item.data);
        break;
      case 'user_stats':
        await this.syncUserStats(item.data);
        break;
      case 'tournament_action':
        await this.syncTournamentAction(item.data);
        break;
      default:
        logger.warn('OfflineManager', `Unknown sync action: ${item.action}`);
    }
  }

  /**
   * Sync game result
   */
  private async syncGameResult(data: any): Promise<void> {
    const response = await fetch(`/api/game/update-stats/${data.userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.token}`
      },
      body: JSON.stringify(data.stats)
    });

    if (!response.ok) {
      throw response;
    }
  }

  /**
   * Sync user stats
   */
  private async syncUserStats(data: any): Promise<void> {
    const response = await fetch(`/api/user/update-stats/${data.userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.token}`
      },
      body: JSON.stringify(data.stats)
    });

    if (!response.ok) {
      throw response;
    }
  }

  /**
   * Sync tournament action
   */
  private async syncTournamentAction(data: any): Promise<void> {
    // Implementation depends on tournament API
    const response = await fetch(`/api/tournament/${data.action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.token}`
      },
      body: JSON.stringify(data.payload)
    });

    if (!response.ok) {
      throw response;
    }
  }

  /**
   * Setup periodic sync attempts
   */
  private setupPeriodicSync(): void {
    // Try to sync every 30 seconds when online
    setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.syncPendingData();
      }
    }, 30000);
  }

  /**
   * Save sync queue to localStorage
   */
  private saveSyncQueue(): void {
    try {
      localStorage.setItem('offline_sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      logger.error('OfflineManager', 'Failed to save sync queue', error);
    }
  }

  /**
   * Load sync queue from localStorage
   */
  private loadSyncQueue(): void {
    try {
      const stored = localStorage.getItem('offline_sync_queue');
      if (stored) {
        this.syncQueue = JSON.parse(stored);
        logger.info('OfflineManager', `Loaded ${this.syncQueue.length} pending sync items`);
      }
    } catch (error) {
      logger.error('OfflineManager', 'Failed to load sync queue', error);
      this.syncQueue = [];
    }
  }

  /**
   * Generate unique ID for sync items
   */
  private generateId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cache data for offline use
   */
  public cacheData(key: string, data: any): void {
    try {
      const cacheKey = `offline_cache_${key}`;
      const cacheData = {
        data,
        timestamp: Date.now(),
        expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };

      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      logger.debug('OfflineManager', `Cached data: ${key}`);
    } catch (error) {
      logger.error('OfflineManager', `Failed to cache data: ${key}`, error);
    }
  }

  /**
   * Get cached data
   */
  public getCachedData(key: string): any | null {
    try {
      const cacheKey = `offline_cache_${key}`;
      const stored = localStorage.getItem(cacheKey);

      if (!stored) return null;

      const cacheData = JSON.parse(stored);

      // Check if expired
      if (cacheData.expires < Date.now()) {
        localStorage.removeItem(cacheKey);
        return null;
      }

      return cacheData.data;
    } catch (error) {
      logger.error('OfflineManager', `Failed to get cached data: ${key}`, error);
      return null;
    }
  }

  /**
   * Clear expired cache
   */
  public clearExpiredCache(): void {
    try {
      const keys = Object.keys(localStorage);
      let cleared = 0;

      keys.forEach(key => {
        if (key.startsWith('offline_cache_')) {
          try {
            const data = JSON.parse(localStorage.getItem(key)!);
            if (data.expires < Date.now()) {
              localStorage.removeItem(key);
              cleared++;
            }
          } catch (error) {
            // Invalid cache data, remove it
            localStorage.removeItem(key);
            cleared++;
          }
        }
      });

      if (cleared > 0) {
        logger.info('OfflineManager', `Cleared ${cleared} expired cache items`);
      }
    } catch (error) {
      logger.error('OfflineManager', 'Failed to clear expired cache', error);
    }
  }

  /**
   * Get sync queue status
   */
  public getSyncStatus(): {
    pendingItems: number;
    isOnline: boolean;
    syncInProgress: boolean;
    oldestItem?: number;
  } {
    return {
      pendingItems: this.syncQueue.length,
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      oldestItem: this.syncQueue.length > 0 ? Math.min(...this.syncQueue.map(item => item.timestamp)) : undefined
    };
  }

  /**
   * Force sync attempt
   */
  public async forceSync(): Promise<void> {
    if (this.isOnline) {
      await this.syncPendingData();
    } else {
      throw new Error('Device is offline');
    }
  }

  /**
   * Notify about available app update
   */
  private notifyUpdateAvailable(): void {
    logger.info('OfflineManager', 'New app version available');

    // Could show a toast notification here
    // For now, just log it
  }

  /**
   * Check if background sync is supported
   */
  public isBackgroundSyncSupported(): boolean {
    try {
      return 'serviceWorker' in navigator && 'sync' in (globalThis as any).ServiceWorkerRegistration.prototype;
    } catch (e) {
      return false;
    }
  }

  /**
   * Register background sync
   */
  public async registerBackgroundSync(): Promise<void> {
    if (!this.isBackgroundSyncSupported()) {
      logger.warn('OfflineManager', 'Background sync not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register('background-sync');
      logger.info('OfflineManager', 'Background sync registered');
    } catch (error) {
      logger.error('OfflineManager', 'Failed to register background sync', error);
    }
  }
}

// Export singleton instance
export const offlineManager = OfflineManager.getInstance();