// packages/common/src/logger.ts
// Shared logging utilities for all services

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export class Logger {
  private serviceName: string;
  private level: LogLevel = LogLevel.INFO;

  constructor(serviceName: string = 'SERVICE') {
    this.serviceName = serviceName;
    this.setLevelFromEnv();
  }

  private setLevelFromEnv(): void {
    if (process.env.LOG_LEVEL === 'debug') {
      this.level = LogLevel.DEBUG;
    } else {
      this.level = LogLevel.WARN;
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (this.level < level) return;

    const timestamp = new Date().toISOString();
    const levelEmoji = this.getLevelEmoji(level);
    const logMessage = `[${this.serviceName}] [${timestamp}] [${levelEmoji}] ${message}`;

    const logMethod = level === LogLevel.ERROR ? console.error :
                     level === LogLevel.WARN ? console.warn : console.log;

    logMethod(logMessage, ...args);
  }

  private getLevelEmoji(level: LogLevel): string {
    switch (level) {
      case LogLevel.ERROR: return '🚨 ERROR';
      case LogLevel.WARN: return '⚠️ WARN';
      case LogLevel.INFO: return 'ℹ️ INFO';
      case LogLevel.DEBUG: return '🔍 DEBUG';
      default: return 'ℹ️ INFO';
    }
  }

  error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  // Game-specific logging methods for backward compatibility
  game(gameId: number | string, message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, `[GAME:${gameId}] ${message}`, ...args);
  }

  gameDebug(gameId: number | string, message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, `[GAME:${gameId}] ${message}`, ...args);
  }

  matchmaking(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, `[MATCHMAKING] ${message}`, ...args);
  }

  db(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, `[DB] ${message}`, ...args);
  }

  ws(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, `[WS] ${message}`, ...args);
  }

  // Legacy methods for backward compatibility
  request(method: string, url: string, body?: any): void {
    this.info(`← ${method} ${url}`, body);
  }

  response(method: string, url: string, statusCode: number, data?: any): void {
    this.info(`→ ${method} ${url} - Status: ${statusCode}`, data);
  }
}

export function createLogger(serviceName: string): Logger {
  return new Logger(serviceName);
}