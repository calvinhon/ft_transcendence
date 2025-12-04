import { PerformanceManager } from '../../managers/PerformanceManager';
import { performanceMonitor } from '../../utils/PerformanceMonitor';

describe('PerformanceManager', () => {
  let perfManager: PerformanceManager;

  beforeEach(() => {
    perfManager = PerformanceManager.getInstance();
  });

  afterEach(() => {
    // Clear metrics between tests
    performanceMonitor.clearOldMetrics(0);
  });

  test('should initialize performance manager', () => {
    expect(perfManager).toBeDefined();
    expect(typeof perfManager.initialize).toBe('function');
  });

  test('should track manager initialization', () => {
    perfManager.trackManagerInit('TestManager', 50.5);

    const metric = performanceMonitor.getMetric('manager_init_TestManager');
    expect(metric).toBeDefined();
    expect(metric.value.initTime).toBe(50.5);
    expect(metric.value.manager).toBe('TestManager');
  });

  test('should generate performance report', () => {
    // Add some test metrics
    performanceMonitor.setMetric('test_metric', { value: 'test' });

    const report = perfManager.generatePerformanceReport();
    expect(report).toBeDefined();
    expect(report.summary).toBeDefined();
    expect(typeof report.summary.totalMetrics).toBe('number');
  });

  test('should export performance data', () => {
    const data = perfManager.exportPerformanceData();
    expect(typeof data).toBe('string');

    const parsed = JSON.parse(data);
    expect(parsed).toBeDefined();
    expect(parsed.timestamp).toBeDefined();
    expect(parsed.generatedAt).toBeDefined();
    expect(parsed.insights).toBeDefined();
  });

  test('should provide performance recommendations', () => {
    const recommendations = perfManager.getPerformanceRecommendations();
    expect(Array.isArray(recommendations)).toBeTruthy();
  });

  test('should start operation timing', () => {
    const endTiming = perfManager.startOperationMonitoring('test_operation');
    expect(typeof endTiming).toBe('function');

    // Simulate ending the operation
    setTimeout(() => {
      endTiming();
      const metric = performanceMonitor.getMetric('operation_test_operation');
      expect(metric).toBeDefined();
    }, 10);
  });

  test('should track custom metrics', () => {
    const testData = { custom: 'value', number: 42 };
    perfManager.trackCustomMetric('custom_test', testData);

    const metric = performanceMonitor.getMetric('custom_test');
    expect(metric).toBeDefined();
    expect(metric.value).toEqual(testData);
  });
});