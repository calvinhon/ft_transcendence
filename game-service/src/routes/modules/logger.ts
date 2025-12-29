// game-service/src/routes/modules/logger.ts
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

class Logger {
  private level: LogLevel = LogLevel.INFO; // Default to INFO level

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  error(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.ERROR) {
      console.error(`🚨 [ERROR] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.WARN) {
      console.warn(`⚠️ [WARN] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.INFO) {
      console.log(`ℹ️ [INFO] ${message}`, ...args);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.DEBUG) {
      console.log(`🔍 [DEBUG] ${message}`, ...args);
    }
  }

  // Game-specific logging methods
  game(gameId: number, message: string, ...args: any[]): void {
    if (this.level >= LogLevel.INFO) {
      console.log(`🎮 [GAME-${gameId}] ${message}`, ...args);
    }
  }

  gameDebug(gameId: number, message: string, ...args: any[]): void {
    if (this.level >= LogLevel.DEBUG) {
      console.log(`🎮 [GAME-${gameId}] ${message}`, ...args);
    }
  }

  ws(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.INFO) {
      console.log(`🔵 [WS] ${message}`, ...args);
    }
  }

  matchmaking(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.INFO) {
      console.log(`👥 [MATCHMAKING] ${message}`, ...args);
    }
  }

  db(message: string, ...args: any[]): void {
    if (this.level >= LogLevel.INFO) {
      console.log(`💾 [DB] ${message}`, ...args);
    }
  }
}

export const logger = new Logger();

// Set log level based on environment
if (process.env.NODE_ENV === 'production') {
  logger.setLevel(LogLevel.WARN);
} else if (process.env.LOG_LEVEL === 'debug') {
  logger.setLevel(LogLevel.DEBUG);
} else {
  logger.setLevel(LogLevel.INFO);
}
