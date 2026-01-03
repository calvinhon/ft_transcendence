// packages/common/tests/health.test.ts
import { sendHealthCheck } from '../dist/index';

describe('Health Check Utilities', () => {
  let mockReply: any;

  beforeEach(() => {
    mockReply = {
      code: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      header: jest.fn().mockReturnThis(),
    };
  });

  describe('sendHealthCheck', () => {
    it('should send healthy response with default modules', () => {
      sendHealthCheck(mockReply, 'test-service');

      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'ok',
        service: 'test-service',
        timestamp: expect.any(String)
      });
    });

    it('should send healthy response with custom modules', () => {
      const modules = ['database', 'cache'];

      sendHealthCheck(mockReply, 'test-service', { modules });

      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'ok',
        service: 'test-service',
        timestamp: expect.any(String),
        modules
      });
    });

    it('should include version if provided', () => {
      sendHealthCheck(mockReply, 'test-service', { version: '1.0.0' });

      expect(mockReply.send).toHaveBeenCalledWith({
        status: 'ok',
        service: 'test-service',
        version: '1.0.0',
        timestamp: expect.any(String)
      });
    });
  });
});