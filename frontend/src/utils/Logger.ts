// frontend/src/utils/Logger.ts
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
  stack?: string;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;
  private modules: Set<string> = new Set();

  private constructor() {
    // Load log level from localStorage or default to INFO
    const savedLevel = localStorage.getItem('logLevel');
    if (savedLevel) {
      this.logLevel = parseInt(savedLevel) as LogLevel;
    }

    // Load enabled modules from localStorage
    const savedModules = localStorage.getItem('enabledLogModules');
    if (savedModules) {
      try {
        const modules = JSON.parse(savedModules);
        this.modules = new Set(modules);
      } catch (e) {
        console.warn('Failed to parse saved log modules');
      }
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    localStorage.setItem('logLevel', level.toString());
  }

  enableModule(module: string): void {
    this.modules.add(module);
    this.saveModules();
  }

  disableModule(module: string): void {
    this.modules.delete(module);
    this.saveModules();
  }

  private saveModules(): void {
    localStorage.setItem('enabledLogModules', JSON.stringify(Array.from(this.modules)));
  }

  private shouldLog(level: LogLevel, module: string): boolean {
    return level >= this.logLevel && (this.modules.size === 0 || this.modules.has(module));
  }

  private createLogEntry(level: LogLevel, module: string, message: string, data?: any): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message
    };

    if (data !== undefined) {
      entry.data = data;
    }

    if (level === LogLevel.ERROR && data instanceof Error) {
      entry.stack = data.stack;
    }

    return entry;
  }

  private addLog(entry: LogEntry): void {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  debug(module: string, message: string, data?: any): void {
    if (this.shouldLog(LogLevel.DEBUG, module)) {
      const entry = this.createLogEntry(LogLevel.DEBUG, module, message, data);
      this.addLog(entry);
      console.debug(`[${entry.timestamp}] [${module}] ${message}`, data || '');
    }
  }

  info(module: string, message: string, data?: any): void {
    if (this.shouldLog(LogLevel.INFO, module)) {
      const entry = this.createLogEntry(LogLevel.INFO, module, message, data);
      this.addLog(entry);
      console.info(`[${entry.timestamp}] [${module}] ${message}`, data || '');
    }
  }

  warn(module: string, message: string, data?: any): void {
    if (this.shouldLog(LogLevel.WARN, module)) {
      const entry = this.createLogEntry(LogLevel.WARN, module, message, data);
      this.addLog(entry);
      console.warn(`[${entry.timestamp}] [${module}] ${message}`, data || '');
    }
  }

  error(module: string, message: string, error?: Error | any): void {
    if (this.shouldLog(LogLevel.ERROR, module)) {
      const entry = this.createLogEntry(LogLevel.ERROR, module, message, error);
      this.addLog(entry);
      console.error(`[${entry.timestamp}] [${module}] ${message}`, error || '');
    }
  }

  getLogs(module?: string, level?: LogLevel): LogEntry[] {
    return this.logs.filter(log => {
      if (module && log.module !== module) return false;
      if (level !== undefined && log.level < level) return false;
      return true;
    });
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  getEnabledModules(): string[] {
    return Array.from(this.modules);
  }

  getLogLevel(): LogLevel {
    return this.logLevel;
  }
}

// Global logger instance
export const logger = Logger.getInstance();

// Convenience functions for global use
export const log = {
  debug: (module: string, message: string, data?: any) => logger.debug(module, message, data),
  info: (module: string, message: string, data?: any) => logger.info(module, message, data),
  warn: (module: string, message: string, data?: any) => logger.warn(module, message, data),
  error: (module: string, message: string, data?: any) => logger.error(module, message, data)
};