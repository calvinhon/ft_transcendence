// user-service/src/routes/utils.ts
import { FastifyReply } from 'fastify';
import sqlite3 from 'sqlite3';

export function handleDatabaseError(reply: FastifyReply, err: Error | null, reject: (reason?: any) => void): boolean {
  if (err) {
    reply.status(500).send({ error: 'Database error' });
    reject(err);
    return true;
  }
  return false;
}

export function promisifyDbRun(db: sqlite3.Database, sql: string, params: any[] = []): Promise<sqlite3.RunResult> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(this: sqlite3.RunResult, err: Error | null) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

export function promisifyDbGet<T>(db: sqlite3.Database, sql: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err: Error | null, row: T) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function promisifyDbAll<T>(db: sqlite3.Database, sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err: Error | null, rows: T[]) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}