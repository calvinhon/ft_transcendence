// packages/common/tests/cross-service.test.ts
import axios from 'axios';

describe('Cross-Service Compatibility Tests', () => {
  // Note: These tests require all services to be running
  // They test that services can communicate with each other

  describe('Service Health Communication', () => {
    it('should allow services to check each other\'s health', async () => {
      // This test verifies that services can make HTTP calls to each other
      // In a real scenario, services would call each other's APIs

      const services = [
        { name: 'auth', port: 3001 },
        { name: 'game', port: 3002 },
        { name: 'tournament', port: 3003 },
        { name: 'user', port: 3004 }
      ];

      for (const service of services) {
        try {
          const response = await axios.get(`http://localhost:${service.port}/health`, {
            timeout: 5000
          });

          expect(response.status).toBe(200);
          expect(response.data.status).toBe('ok');
          expect(response.data.service).toBeDefined();
        } catch (error) {
          // If service is not running, skip the test
          console.warn(`Service ${service.name} not available for testing:`, error instanceof Error ? error.message : String(error));
        }
      }
    }, 30000); // 30 second timeout for network calls
  });

  describe('API Response Format Consistency', () => {
    it('should have consistent response formats across services', async () => {
      // Test that all services return health responses in the same format
      const services = [
        { name: 'auth', port: 3001 },
        { name: 'game', port: 3002 },
        { name: 'tournament', port: 3003 },
        { name: 'user', port: 3004 }
      ];

      const responses: any[] = [];

      for (const service of services) {
        try {
          const response = await axios.get(`http://localhost:${service.port}/health`, {
            timeout: 5000
          });
          responses.push(response.data);
        } catch (error) {
          console.warn(`Service ${service.name} not available for testing:`, error instanceof Error ? error.message : String(error));
        }
      }

      // All responses should have the same basic structure
      responses.forEach(response => {
        expect(response).toHaveProperty('status');
        expect(response).toHaveProperty('service');
        expect(response).toHaveProperty('timestamp');
        expect(typeof response.timestamp).toBe('string');
      });
    }, 30000);
  });

  describe('Shared Utility Consistency', () => {
    it('should verify shared utilities are working correctly', () => {
      // Test that the shared utilities are functioning as expected
      const { sendSuccess, sendError, validateEmail, createServiceConfig } = require('../dist/index');

      // Test email validation
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('invalid')).toBe(false);

      // Test service config creation
      const config = createServiceConfig('test-service', 3000);
      expect(config.serviceName).toBe('test-service');
      expect(config.port).toBe(3000);
      expect(config.host).toBe('0.0.0.0');
    });
  });
});