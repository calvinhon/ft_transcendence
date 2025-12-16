import { logger } from './Logger';

/**
 * Performance monitoring and metrics collection for the frontend application
 * Tracks bundle size, load times, memory usage, and runtime performance
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, any> = new Map();
  private observers: Set<(metric: string, value: any) => void> = new Set();

  private constructor() {
    this.initializePerformanceTracking();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Initialize performance tracking
   */
  private initializePerformanceTracking(): void {
    // Track page load performance
    if (window.performance && window.performance.timing) {
      window.addEventListener('load', () => {
        this.trackPageLoadPerformance();
      });
    }

    // Track memory usage if available
    if (window.performance && (window.performance as any).memory) {
      this.trackMemoryUsage();
      setInterval(() => this.trackMemoryUsage(), 30000); // Every 30 seconds
    }

    // Track bundle size and loading
    this.trackBundleMetrics();

    logger.info('PerformanceMonitor', 'Performance tracking initialized');
  }

  /**
   * Track page load performance metrics
   */
  private trackPageLoadPerformance(): void {
    const timing = window.performance.timing;
    const navigation = window.performance.navigation;

    const metrics = {
      // DNS lookup time
      dnsLookup: timing.domainLookupEnd - timing.domainLookupStart,

      // TCP connection time
      tcpConnect: timing.connectEnd - timing.connectStart,

      // Server response time
      serverResponse: timing.responseStart - timing.requestStart,

      // Page load time
      pageLoad: timing.loadEventEnd - timing.navigationStart,

      // DOM processing time
      domProcessing: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,

      // Total time to interactive
      timeToInteractive: timing.domContentLoadedEventEnd - timing.navigationStart,

      // Navigation type
      navigationType: navigation.type === 0 ? 'navigate' :
        navigation.type === 1 ? 'reload' :
          navigation.type === 2 ? 'back_forward' : 'unknown'
    };

    this.setMetric('pageLoad', metrics);
    logger.info('PerformanceMonitor', 'Page load performance tracked', metrics);
  }

  /**
   * Track memory usage
   */
  private trackMemoryUsage(): void {
    const memory = (window.performance as any).memory;
    if (memory) {
      const metrics = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usedMB: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        totalMB: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        limitMB: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
      };

      this.setMetric('memoryUsage', metrics);

      // Warn if memory usage is high
      const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      if (usagePercent > 80) {
        logger.warn('PerformanceMonitor', `High memory usage: ${usagePercent.toFixed(1)}%`, metrics);
      }
    }
  }

  /**
   * Track bundle and asset loading metrics
   */
  private trackBundleMetrics(): void {
    // Check if PerformanceObserver is available
    if (typeof PerformanceObserver === 'undefined') {
      logger.debug('PerformanceMonitor', 'PerformanceObserver not available, skipping resource tracking');
      return;
    }

    try {
      // Track resource loading times
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name.includes('.js') || entry.name.includes('.css')) {
            const metric = {
              name: entry.name,
              duration: entry.duration,
              size: (entry as any).transferSize || 0,
              type: entry.name.includes('.js') ? 'javascript' : 'stylesheet'
            };

            this.setMetric(`asset_${entry.name.replace(/[^a-zA-Z0-9]/g, '_')}`, metric);
          }
        });
      });

      observer.observe({ entryTypes: ['resource'] });

      // Track navigation timing
      const navObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.setMetric('navigation', {
            name: entry.name,
            duration: entry.duration,
            type: (entry as any).type || 'unknown'
          });
        });
      });

      navObserver.observe({ entryTypes: ['navigation'] });
    } catch (error) {
      logger.warn('PerformanceMonitor', 'Failed to setup performance observers', error);
    }
  }

  /**
   * Track custom performance metrics
   */
  public trackOperation(operationName: string, startTime: number, metadata?: any): void {
    const duration = performance.now() - startTime;
    const metric = {
      operation: operationName,
      duration,
      timestamp: Date.now(),
      metadata
    };

    this.setMetric(`operation_${operationName}`, metric);

    // Log slow operations
    if (duration > 100) { // More than 100ms
      logger.warn('PerformanceMonitor', `Slow operation: ${operationName}`, {
        duration: `${duration.toFixed(2)}ms`,
        ...metadata
      });
    }
  }

  /**
   * Start timing an operation
   */
  public startTiming(operationName: string): () => void {
    const startTime = performance.now();
    return () => this.trackOperation(operationName, startTime);
  }

  /**
   * Track manager initialization performance
   */
  public trackManagerInit(managerName: string, initTime: number): void {
    this.setMetric(`manager_init_${managerName}`, {
      manager: managerName,
      initTime,
      timestamp: Date.now()
    });

    logger.debug('PerformanceMonitor', `Manager ${managerName} initialized in ${initTime.toFixed(2)}ms`);
  }

  /**
   * Track game performance metrics
   */
  public trackGameMetrics(fps: number, frameTime: number, gameState: string): void {
    const metric = {
      fps,
      frameTime,
      gameState,
      timestamp: Date.now()
    };

    this.setMetric('game_performance', metric);

    // Warn about low FPS
    if (fps < 30) {
      logger.warn('PerformanceMonitor', `Low FPS detected: ${fps}`, metric);
    }
  }

  /**
   * Track API call performance
   */
  public trackApiCall(endpoint: string, method: string, duration: number, status: number): void {
    const metric = {
      endpoint,
      method,
      duration,
      status,
      timestamp: Date.now()
    };

    this.setMetric(`api_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`, metric);

    // Log slow API calls
    if (duration > 1000) { // More than 1 second
      logger.warn('PerformanceMonitor', `Slow API call: ${method} ${endpoint}`, {
        duration: `${duration.toFixed(2)}ms`,
        status
      });
    }
  }

  /**
   * Set a metric value
   */
  public setMetric(key: string, value: any): void {
    this.metrics.set(key, {
      value,
      timestamp: Date.now()
    });

    // Notify observers
    this.observers.forEach(observer => {
      try {
        observer(key, value);
      } catch (error) {
        logger.error('PerformanceMonitor', 'Error in metric observer', error);
      }
    });
  }

  /**
   * Get a metric value
   */
  public getMetric(key: string): any {
    return this.metrics.get(key);
  }

  /**
   * Get all metrics
   */
  public getAllMetrics(): Map<string, any> {
    return new Map(this.metrics);
  }

  /**
   * Add a metric observer
   */
  public addObserver(callback: (metric: string, value: any) => void): void {
    this.observers.add(callback);
  }

  /**
   * Remove a metric observer
   */
  public removeObserver(callback: (metric: string, value: any) => void): void {
    this.observers.delete(callback);
  }

  /**
   * Generate performance report
   */
  public generateReport(): any {
    const report = {
      timestamp: Date.now(),
      pageLoad: this.getMetric('pageLoad')?.value,
      memoryUsage: this.getMetric('memoryUsage')?.value,
      gamePerformance: this.getMetric('game_performance')?.value,
      summary: {
        totalMetrics: this.metrics.size,
        observers: this.observers.size
      }
    };

    logger.info('PerformanceMonitor', 'Performance report generated', report);
    return report;
  }

  /**
   * Export metrics for external analysis
   */
  public exportMetrics(): string {
    const data = {
      timestamp: Date.now(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      metrics: Array.from(this.metrics.entries()).map(([key, data]) => ({
        key,
        ...data
      }))
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Clear old metrics (older than specified hours)
   */
  public clearOldMetrics(olderThanHours: number = 24): void {
    const cutoff = Date.now() - (olderThanHours * 60 * 60 * 1000);
    let cleared = 0;

    for (const [key, data] of this.metrics) {
      if (data.timestamp < cutoff) {
        this.metrics.delete(key);
        cleared++;
      }
    }

    if (cleared > 0) {
      logger.info('PerformanceMonitor', `Cleared ${cleared} old metrics`);
    }
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();