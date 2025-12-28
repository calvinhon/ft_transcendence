// packages/common/tests/integration.test.ts
import { createServer } from '../dist/index';
import { createServiceConfig } from '../dist/index';

describe('Integration Tests', () => {
  describe('Service Configuration', () => {
    it('should create valid service configurations', () => {
      const config1 = createServiceConfig('test-service-1', 3001);
      const config2 = createServiceConfig('test-service-2', 3002);

      expect(config1.port).toBe(3001);
      expect(config1.serviceName).toBe('test-service-1');
      expect(config1.host).toBe('0.0.0.0');

      expect(config2.port).toBe(3002);
      expect(config2.serviceName).toBe('test-service-2');
      expect(config2.host).toBe('0.0.0.0');
    });

    it('should use environment variables when available', () => {
      process.env.PORT = '4000';
      process.env.HOST = '127.0.0.1';

      const config = createServiceConfig('test-service', 3000);

      expect(config.port).toBe(4000);
      expect(config.host).toBe('127.0.0.1');

      // Cleanup
      delete process.env.PORT;
      delete process.env.HOST;
    });
  });

  describe('Server Creation', () => {
    it('should create server instances without throwing', async () => {
      const config = createServiceConfig('test-service', 3000);

      // This should not throw an error
      expect(() => {
        createServer(config, async () => {});
      }).not.toThrow();
    });
  });
});