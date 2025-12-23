// packages/common/tests/responses.test.ts
import { sendSuccess, sendError, validateRequiredFields, validateEmail } from '../dist/index';

describe('Response Utilities', () => {
  let mockReply: any;

  beforeEach(() => {
    mockReply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      header: jest.fn().mockReturnThis(),
    };
  });

  describe('sendSuccess', () => {
    it('should send success response with data', () => {
      const data = { id: 1, name: 'Test' };
      sendSuccess(mockReply, data);

      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: true,
        data
      });
    });

    it('should send success response with message', () => {
      const data = { id: 1, name: 'Test' };
      const message = 'Operation successful';
      sendSuccess(mockReply, data, message);

      expect(mockReply.send).toHaveBeenCalledWith({
        success: true,
        data,
        message
      });
    });
  });

  describe('sendError', () => {
    it('should send error response with message and status code', () => {
      const message = 'Something went wrong';
      const statusCode = 400;
      sendError(mockReply, message, statusCode);

      expect(mockReply.status).toHaveBeenCalledWith(statusCode);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: message
      });
    });

    it('should default to 400 status code', () => {
      const message = 'Internal error';
      sendError(mockReply, message);

      expect(mockReply.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateRequiredFields', () => {
    it('should return null for valid required fields', () => {
      const data = { name: 'Test', email: 'test@example.com' };
      const required = ['name', 'email'];
      const result = validateRequiredFields(data, required);

      expect(result).toBeNull();
    });

    it('should return error message for missing required fields', () => {
      const data = { name: 'Test' };
      const required = ['name', 'email'];
      const result = validateRequiredFields(data, required);

      expect(result).toBe('email is required');
    });

    it('should return error message for empty string values', () => {
      const data = { name: '', email: 'test@example.com' };
      const required = ['name', 'email'];
      const result = validateRequiredFields(data, required);

      expect(result).toBe('name is required');
    });
  });

  describe('validateEmail', () => {
    it('should return true for valid email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@example.co.uk')).toBe(true);
    });

    it('should return false for invalid email addresses', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });
});