import { OfflineManager } from './OfflineManager';
import { logger } from '../utils/Logger';
import { expect } from '@jest/globals';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// Mock service worker
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: jest.fn().mockResolvedValue({
      addEventListener: jest.fn()
    }),
    ready: Promise.resolve({
      sync: {
        register: jest.fn().mockResolvedValue(undefined)
      }
    })
  }
});

// Mock ServiceWorkerRegistration
Object.defineProperty(window, 'ServiceWorkerRegistration', {
  value: {
    prototype: {
      sync: {}
    }
  }
});

// Mock fetch
global.fetch = jest.fn();

describe('OfflineManager', () => {
  let offlineManager: OfflineManager;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.removeItem.mockImplementation(() => {});
    // Reset singleton instance for clean tests
    (OfflineManager as any).instance = null;
    // Ensure device is online for tests
    (navigator as any).onLine = true;
    offlineManager = OfflineManager.getInstance();
  });

  afterEach(() => {
    // Reset singleton instance for clean tests
    (OfflineManager as any).instance = null;
  });

  describe('Initialization', () => {
    test('should initialize with online status', () => {
      expect(offlineManager.isDeviceOnline()).toBe(true);
    });

    test('should register service worker', () => {
      expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
    });

    test('should load sync queue from storage', () => {
      const mockQueue = JSON.stringify([{ id: '1', action: 'test', data: {}, timestamp: Date.now() }]);
      localStorageMock.getItem.mockReturnValue(mockQueue);

      const newManager = new (OfflineManager as any)();
      expect(localStorageMock.getItem).toHaveBeenCalledWith('offline_sync_queue');
    });
  });

  describe('Online/Offline Events', () => {
    test('should handle online event', () => {
      const observer = jest.fn();
      offlineManager.addStatusObserver(observer);

      // Simulate going offline first
      (navigator as any).onLine = false;
      window.dispatchEvent(new Event('offline'));

      // Then coming online
      (navigator as any).onLine = true;
      window.dispatchEvent(new Event('online'));

      expect(observer).toHaveBeenCalledWith(true);
    });

    test('should handle offline event', () => {
      const observer = jest.fn();
      offlineManager.addStatusObserver(observer);

      (navigator as any).onLine = false;
      window.dispatchEvent(new Event('offline'));

      expect(observer).toHaveBeenCalledWith(false);
    });

    test('should remove status observer', () => {
      const observer = jest.fn();
      offlineManager.addStatusObserver(observer);
      offlineManager.removeStatusObserver(observer);

      (navigator as any).onLine = false;
      window.dispatchEvent(new Event('offline'));

      expect(observer).not.toHaveBeenCalled();
    });
  });

  describe('Sync Queue Management', () => {
    test('should queue action for sync', () => {
      const syncId = offlineManager.queueForSync('game_result', { userId: 1, stats: {} });

      expect(syncId).toBeDefined();
      expect(typeof syncId).toBe('string');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('offline_sync_queue', expect.any(String));
    });

    test('should remove item from sync queue', () => {
      const syncId = offlineManager.queueForSync('game_result', { userId: 1, stats: {} });
      offlineManager.removeFromSyncQueue(syncId);

      expect(localStorageMock.setItem).toHaveBeenCalledTimes(2); // Once for add, once for remove
    });

    test('should sync pending data when online', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200
      });

      offlineManager.queueForSync('game_result', {
        userId: 1,
        stats: { score: 100 },
        token: 'test-token'
      });

      // Trigger sync manually
      await (offlineManager as any).syncPendingData();

      expect(global.fetch).toHaveBeenCalledWith('/api/game/update-stats/1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({ score: 100 })
      });
    });

    test('should handle sync failure and keep item for retry', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const syncId = offlineManager.queueForSync('game_result', {
        userId: 1,
        stats: { score: 100 },
        token: 'test-token'
      });

      await (offlineManager as any).syncPendingData();

      // Item should still be in queue for retry
      const status = (offlineManager as any).getSyncStatus();
      expect(status.pendingItems).toBe(1);
    });
  });

  describe('Data Caching', () => {
    test('should cache data', () => {
      const testData = { userId: 1, username: 'testuser' };
      offlineManager.cacheData('user_profile', testData);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'offline_cache_user_profile',
        expect.stringContaining(JSON.stringify(testData))
      );
    });

    test('should retrieve cached data', () => {
      const testData = { userId: 1, username: 'testuser' };
      const cacheData = {
        data: testData,
        timestamp: Date.now(),
        expires: Date.now() + (24 * 60 * 60 * 1000)
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(cacheData));

      const result = offlineManager.getCachedData('user_profile');
      expect(result).toEqual(testData);
    });

    test('should return null for expired cache', () => {
      const testData = { userId: 1, username: 'testuser' };
      const cacheData = {
        data: testData,
        timestamp: Date.now(),
        expires: Date.now() - 1000 // Expired
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(cacheData));

      const result = offlineManager.getCachedData('user_profile');
      expect(result).toBeNull();
    });

    test('should clear expired cache', () => {
      const expiredCache = {
        data: { old: 'data' },
        timestamp: Date.now(),
        expires: Date.now() - 1000
      };

      // Mock Object.keys to return cache keys
      const originalKeys = Object.keys;
      Object.keys = jest.fn().mockReturnValue(['offline_cache_test']);

      localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredCache));

      offlineManager.clearExpiredCache();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('offline_cache_test');

      // Restore original Object.keys
      Object.keys = originalKeys;
    });
  });

  describe('Sync Status', () => {
    test('should return sync status', () => {
      const status = offlineManager.getSyncStatus();

      expect(status).toHaveProperty('pendingItems');
      expect(status).toHaveProperty('isOnline');
      expect(status).toHaveProperty('syncInProgress');
      expect(status).toHaveProperty('oldestItem');
    });

    test('should force sync when online', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200
      });

      offlineManager.queueForSync('game_result', {
        userId: 1,
        stats: { score: 100 },
        token: 'test-token'
      });

      await offlineManager.forceSync();

      expect(global.fetch).toHaveBeenCalled();
    });

    test('should reject force sync when offline', async () => {
      (navigator as any).onLine = false;

      await expect(offlineManager.forceSync()).rejects.toThrow('Device is offline');
    });
  });

  describe('Background Sync', () => {
    test('should check background sync support', () => {
      const isSupported = offlineManager.isBackgroundSyncSupported();
      expect(typeof isSupported).toBe('boolean');
    });

    test('should register background sync', async () => {
      await (offlineManager as any).registerBackgroundSync();

      const registration = await (navigator.serviceWorker as any).ready;
      expect(registration.sync.register).toHaveBeenCalledWith('background-sync');
    });
  });

  describe('Error Handling', () => {
    test('should handle service worker registration failure', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      (navigator.serviceWorker.register as jest.Mock).mockRejectedValue(new Error('SW failed'));

      // Create new instance after setting up the mock
      const newManager = new (OfflineManager as any)();

      expect(consoleSpy).toHaveBeenCalledWith('OfflineManager', 'Service worker registration failed', expect.any(Error));
      consoleSpy.mockRestore();
    });

    test('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Should not throw
      expect(() => offlineManager.getCachedData('test')).not.toThrow();

      consoleSpy.mockRestore();
    });
  });
});