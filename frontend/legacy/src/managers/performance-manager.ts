import { performanceMonitor } from '../utils/PerformanceMonitor';
import { logger } from '../utils/Logger';

/**
 * Performance Manager - Integrates performance monitoring into the app architecture
 * Provides high-level performance management and reporting for the application
 */
export class PerformanceManager {
  private static instance: PerformanceManager;
  private initialized: boolean = false;

  private constructor() {}

  public static getInstance(): PerformanceManager {
    if (!PerformanceManager.instance) {
      PerformanceManager.instance = new PerformanceManager();
    }
    return PerformanceManager.instance;
  }

  /**
   * Initialize the performance manager
   */
  public initialize(): void {
    if (this.initialized) return;

    // Add custom observers for app-specific metrics
    this.setupAppObservers();

    this.initialized = true;
    logger.info('performance-manager', 'Performance Manager initialized');
  }

  /**
   * Setup application-specific performance observers
   */
  private setupAppObservers(): void {
    // Observe manager initialization performance
    performanceMonitor.addObserver((metric, value) => {
      if (metric.startsWith('manager_init_')) {
        this.handleManagerInitMetric(metric, value);
      }
    });

    // Observe game performance
    performanceMonitor.addObserver((metric, value) => {
      if (metric === 'game_performance') {
        this.handleGamePerformanceMetric(value);
      }
    });

    // Observe API performance
    performanceMonitor.addObserver((metric, value) => {
      if (metric.startsWith('api_')) {
        this.handleApiPerformanceMetric(metric, value);
      }
    });
  }

  /**
   * Handle manager initialization metrics
   */
  private handleManagerInitMetric(metric: string, value: any): void {
    const managerName = metric.replace('manager_init_', '');

    // Log initialization times for monitoring
    if (value.initTime > 50) { // More than 50ms
      logger.warn('performance-manager', `Slow manager initialization: ${managerName}`, {
        initTime: `${value.initTime.toFixed(2)}ms`
      });
    }

    // Track initialization order and timing
    this.trackManagerInitOrder(managerName, value.initTime);
  }

  /**
   * Handle game performance metrics
   */
  private handleGamePerformanceMetric(value: any): void {
    // Analyze game performance trends
    if (value.fps < 30) {
      this.handleLowFps(value);
    }

    // Track performance over time
    this.trackGamePerformanceTrend(value);
  }

  /**
   * Handle low FPS situations
   */
  private handleLowFps(metric: any): void {
    logger.warn('performance-manager', 'Low FPS detected, analyzing causes...', metric);

    // Check memory usage
    const memoryUsage = performanceMonitor.getMetric('memoryUsage');
    if (memoryUsage && memoryUsage.value) {
      const usagePercent = (memoryUsage.value.usedJSHeapSize / memoryUsage.value.jsHeapSizeLimit) * 100;
      if (usagePercent > 90) {
        logger.error('performance-manager', 'High memory usage may be causing low FPS', {
          memoryUsage: usagePercent.toFixed(1) + '%',
          fps: metric.fps
        });
      }
    }

    // Suggest optimizations
    this.suggestPerformanceOptimizations(metric);
  }

  /**
   * Handle API performance metrics
   */
  private handleApiPerformanceMetric(metric: string, value: any): void {
    // Track API performance trends
    this.trackApiPerformanceTrend(value);

    // Alert on consistently slow endpoints
    if (value.duration > 2000) { // More than 2 seconds
      this.handleSlowApiCall(value);
    }
  }

  /**
   * Track manager initialization order and timing
   */
  private managerInitTimes: Map<string, number> = new Map();

  private trackManagerInitOrder(managerName: string, initTime: number): void {
    this.managerInitTimes.set(managerName, initTime);

    // Log initialization summary when all managers are initialized
    if (this.managerInitTimes.size >= 10) { // Assuming we have around 10+ managers
      this.logManagerInitSummary();
    }
  }

  /**
   * Log summary of manager initialization times
   */
  private logManagerInitSummary(): void {
    const sortedManagers = Array.from(this.managerInitTimes.entries())
      .sort(([, a], [, b]) => b - a); // Sort by init time descending

    const totalTime = Array.from(this.managerInitTimes.values()).reduce((sum, time) => sum + time, 0);

    logger.info('performance-manager', 'Manager initialization summary', {
      totalManagers: this.managerInitTimes.size,
      totalInitTime: `${totalTime.toFixed(2)}ms`,
      slowestManager: sortedManagers[0] ? `${sortedManagers[0][0]}: ${sortedManagers[0][1].toFixed(2)}ms` : 'N/A',
      fastestManager: sortedManagers[sortedManagers.length - 1] ?
        `${sortedManagers[sortedManagers.length - 1][0]}: ${sortedManagers[sortedManagers.length - 1][1].toFixed(2)}ms` : 'N/A'
    });
  }

  /**
   * Track game performance trends
   */
  private gamePerformanceHistory: Array<{fps: number, timestamp: number}> = [];

  private trackGamePerformanceTrend(currentMetric: any): void {
    this.gamePerformanceHistory.push({
      fps: currentMetric.fps,
      timestamp: currentMetric.timestamp
    });

    // Keep only last 100 measurements
    if (this.gamePerformanceHistory.length > 100) {
      this.gamePerformanceHistory.shift();
    }

    // Analyze trend
    if (this.gamePerformanceHistory.length >= 10) {
      this.analyzeGamePerformanceTrend();
    }
  }

  /**
   * Analyze game performance trends
   */
  private analyzeGamePerformanceTrend(): void {
    const recent = this.gamePerformanceHistory.slice(-10);
    const avgFps = recent.reduce((sum, m) => sum + m.fps, 0) / recent.length;
    const minFps = Math.min(...recent.map(m => m.fps));

    if (avgFps < 50 && minFps < 30) {
      logger.warn('performance-manager', 'Consistent low game performance detected', {
        averageFps: avgFps.toFixed(1),
        minimumFps: minFps,
        samples: recent.length
      });
    }
  }

  /**
   * Track API performance trends
   */
  private apiPerformanceHistory: Map<string, Array<{duration: number, timestamp: number}>> = new Map();

  private trackApiPerformanceTrend(metric: any): void {
    const endpoint = metric.endpoint;
    if (!this.apiPerformanceHistory.has(endpoint)) {
      this.apiPerformanceHistory.set(endpoint, []);
    }

    const history = this.apiPerformanceHistory.get(endpoint)!;
    history.push({
      duration: metric.duration,
      timestamp: metric.timestamp
    });

    // Keep only last 20 calls per endpoint
    if (history.length > 20) {
      history.shift();
    }

    // Analyze trend for this endpoint
    if (history.length >= 5) {
      this.analyzeApiPerformanceTrend(endpoint, history);
    }
  }

  /**
   * Analyze API performance trends for a specific endpoint
   */
  private analyzeApiPerformanceTrend(endpoint: string, history: Array<{duration: number, timestamp: number}>): void {
    const avgDuration = history.reduce((sum, m) => sum + m.duration, 0) / history.length;
    const maxDuration = Math.max(...history.map(m => m.duration));

    // Alert if average response time is consistently high
    if (avgDuration > 1000 && history.length >= 10) { // 1 second average over 10+ calls
      logger.warn('performance-manager', `Consistently slow API endpoint: ${endpoint}`, {
        averageDuration: `${avgDuration.toFixed(2)}ms`,
        maxDuration: `${maxDuration.toFixed(2)}ms`,
        callCount: history.length
      });
    }
  }

  /**
   * Handle slow API calls
   */
  private handleSlowApiCall(metric: any): void {
    logger.error('performance-manager', 'Very slow API call detected', {
      endpoint: metric.endpoint,
      method: metric.method,
      duration: `${metric.duration.toFixed(2)}ms`,
      status: metric.status
    });

    // Could implement circuit breaker logic here
    this.checkApiHealth(metric.endpoint);
  }

  /**
   * Check API endpoint health
   */
  private async checkApiHealth(endpoint: string): Promise<void> {
    // Simple health check - could be expanded
    try {
      const response = await fetch(endpoint, { method: 'HEAD' });
      if (!response.ok) {
        logger.error('performance-manager', `API endpoint health check failed: ${endpoint}`, {
          status: response.status
        });
      }
    } catch (error) {
      logger.error('performance-manager', `API endpoint unreachable: ${endpoint}`, error);
    }
  }

  /**
   * Suggest performance optimizations based on metrics
   */
  private suggestPerformanceOptimizations(metric: any): void {
    const suggestions: string[] = [];

    // Memory-related suggestions
    const memoryUsage = performanceMonitor.getMetric('memoryUsage');
    if (memoryUsage && memoryUsage.value) {
      const usagePercent = (memoryUsage.value.usedJSHeapSize / memoryUsage.value.jsHeapSizeLimit) * 100;
      if (usagePercent > 85) {
        suggestions.push('High memory usage detected - consider implementing object pooling or cleanup');
      }
    }

    // FPS-related suggestions
    if (metric.fps < 30) {
      suggestions.push('Low FPS detected - consider reducing visual effects or implementing frame rate limiting');
      suggestions.push('Check for memory leaks in game loops or event listeners');
    }

    // Bundle size suggestions
    const bundleMetrics = performanceMonitor.getAllMetrics();
    let totalBundleSize = 0;
    bundleMetrics.forEach((data, key) => {
      if (key.startsWith('asset_') && data.value.size) {
        totalBundleSize += data.value.size;
      }
    });

    if (totalBundleSize > 1024 * 1024) { // Over 1MB
      suggestions.push(`Large bundle size (${(totalBundleSize / 1024 / 1024).toFixed(2)}MB) - consider code splitting or lazy loading`);
    }

    if (suggestions.length > 0) {
      logger.info('performance-manager', 'Performance optimization suggestions', { suggestions });
    }
  }

  /**
   * Generate comprehensive performance report
   */
  public generatePerformanceReport(): any {
    const baseReport = performanceMonitor.generateReport();

    // Add manager-specific insights
    const insights = {
      managerInitSummary: {
        totalManagers: this.managerInitTimes.size,
        totalInitTime: Array.from(this.managerInitTimes.values()).reduce((sum, time) => sum + time, 0)
      },
      gamePerformance: {
        averageFps: this.gamePerformanceHistory.length > 0 ?
          this.gamePerformanceHistory.reduce((sum, m) => sum + m.fps, 0) / this.gamePerformanceHistory.length : 0,
        minFps: this.gamePerformanceHistory.length > 0 ?
          Math.min(...this.gamePerformanceHistory.map(m => m.fps)) : 0,
        samples: this.gamePerformanceHistory.length
      },
      apiPerformance: {
        endpoints: Array.from(this.apiPerformanceHistory.keys()),
        totalCalls: Array.from(this.apiPerformanceHistory.values()).reduce((sum, calls) => sum + calls.length, 0)
      }
    };

    return {
      ...baseReport,
      insights,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Export performance data for external analysis
   */
  public exportPerformanceData(): string {
    const report = this.generatePerformanceReport();
    return JSON.stringify(report, null, 2);
  }

  /**
   * Get performance recommendations
   */
  public getPerformanceRecommendations(): string[] {
    const recommendations: string[] = [];

    // Analyze current metrics and provide recommendations
    const memoryUsage = performanceMonitor.getMetric('memoryUsage');
    if (memoryUsage && memoryUsage.value) {
      const usagePercent = (memoryUsage.value.usedJSHeapSize / memoryUsage.value.jsHeapSizeLimit) * 100;
      if (usagePercent > 80) {
        recommendations.push('Memory usage is high. Consider implementing object cleanup and reducing DOM manipulations.');
      }
    }

    const pageLoad = performanceMonitor.getMetric('pageLoad');
    if (pageLoad && pageLoad.value && pageLoad.value.pageLoad > 3000) {
      recommendations.push('Page load time is slow. Consider implementing lazy loading and optimizing bundle size.');
    }

    if (this.gamePerformanceHistory.length > 0) {
      const avgFps = this.gamePerformanceHistory.reduce((sum, m) => sum + m.fps, 0) / this.gamePerformanceHistory.length;
      if (avgFps < 50) {
        recommendations.push('Game performance is suboptimal. Consider reducing particle effects and optimizing render loops.');
      }
    }

    return recommendations;
  }

  /**
   * Start performance monitoring for a specific operation
   */
  public startOperationMonitoring(operationName: string): () => void {
    return performanceMonitor.startTiming(operationName);
  }

  /**
   * Track manager initialization performance
   */
  public trackManagerInit(managerName: string, initTime: number): void {
    performanceMonitor.trackManagerInit(managerName, initTime);
  }

  /**
   * Track custom performance metric
   */
  public trackCustomMetric(key: string, value: any): void {
    performanceMonitor.setMetric(key, value);
  }
}

// Export singleton instance
export const performanceManager = PerformanceManager.getInstance();