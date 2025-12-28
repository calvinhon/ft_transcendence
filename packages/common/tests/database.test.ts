// packages/common/tests/database.test.ts
import { createDatabaseConfig, promisifyDbRun, promisifyDbGet, promisifyDbAll } from '../dist/index';
import sqlite3 from 'sqlite3';

describe('Database Utilities', () => {
  let testDb: sqlite3.Database;

  beforeAll((done) => {
    testDb = new sqlite3.Database(':memory:', done);
  });

  afterAll((done) => {
    testDb.close(done);
  });

  beforeEach((done) => {
    testDb.run('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)', done);
  });

  afterEach((done) => {
    testDb.run('DROP TABLE test', done);
  });

  describe('promisifyDbRun', () => {
    it('should execute INSERT statement and return result', async () => {
      const result = await promisifyDbRun(testDb, 'INSERT INTO test (name) VALUES (?)', ['Test Item']);

      expect(result.lastID).toBe(1);
      expect(result.changes).toBe(1);
    });
  });

  describe('promisifyDbGet', () => {
    it('should retrieve a single row', async () => {
      await promisifyDbRun(testDb, 'INSERT INTO test (name) VALUES (?)', ['Test Item']);

      const result = await promisifyDbGet(testDb, 'SELECT * FROM test WHERE id = ?', [1]);

      expect(result).toEqual({
        id: 1,
        name: 'Test Item'
      });
    });

    it('should return undefined for non-existent row', async () => {
      const result = await promisifyDbGet(testDb, 'SELECT * FROM test WHERE id = ?', [999]);

      expect(result).toBeUndefined();
    });
  });

  describe('promisifyDbAll', () => {
    it('should retrieve all rows', async () => {
      await promisifyDbRun(testDb, 'INSERT INTO test (name) VALUES (?)', ['Item 1']);
      await promisifyDbRun(testDb, 'INSERT INTO test (name) VALUES (?)', ['Item 2']);

      const results = await promisifyDbAll(testDb, 'SELECT * FROM test ORDER BY id');

      expect(results).toEqual([
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' }
      ]);
    });

    it('should return empty array for no results', async () => {
      const results = await promisifyDbAll(testDb, 'SELECT * FROM test WHERE id > ?', [10]);

      expect(results).toEqual([]);
    });
  });

  describe('createDatabaseConfig', () => {
    it('should create database config with correct path', () => {
      const config = createDatabaseConfig('test-service', 'test.db');

      expect(config.dbPath).toContain('test.db');
      expect(config.serviceName).toBe('TEST_SERVICE');
      expect(config.enableTestMode).toBe(true);
      expect(config.lazyLoad).toBe(false);
    });

    it('should support custom options', () => {
      const config = createDatabaseConfig('test-service', 'test.db', {
        enableTestMode: false,
        lazyLoad: true
      });

      expect(config.enableTestMode).toBe(false);
      expect(config.lazyLoad).toBe(true);
    });
  });
});