// Stub file - error-tracker module
// frontend/src/error-tracker.ts - TypeScript version of error tracker

interface ErrorLog {
  timestamp: string;
  message: string;
  stack?: string;
  url: string;
  line?: number;
  column?: number;
  userAgent: string;
  userId?: number | undefined;
}

export class ErrorTracker {
  private errors: ErrorLog[] = [];
  private maxErrors: number = 100;
  private isLogging: boolean = false; // Prevent recursion
  private originalConsoleError: typeof console.error;

  constructor() {
    this.originalConsoleError = console.error;
    this.setupErrorHandlers();
  }

  private setupErrorHandlers(): void {
    // Global error handler
    window.addEventListener('error', (event: ErrorEvent) => {
      this.logError({
        timestamp: new Date().toISOString(),
        message: event.message,
        stack: event.error?.stack,
        url: event.filename || window.location.href,
        line: event.lineno,
        column: event.colno,
        userAgent: navigator.userAgent,
        userId: this.getCurrentUserId()
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      this.logError({
        timestamp: new Date().toISOString(),
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        userId: this.getCurrentUserId()
      });
    });

    // Console error override (optional - captures console.error calls)
    console.error = (...args: any[]) => {
      if (!this.isLogging) {
        this.logError({
          timestamp: new Date().toISOString(),
          message: `Console Error: ${args.join(' ')}`,
          url: window.location.href,
          userAgent: navigator.userAgent,
          userId: this.getCurrentUserId()
        });
      }
      this.originalConsoleError.apply(console, args);
    };
  }

  private getCurrentUserId(): number | undefined {
    const authManager = (window as any).authManager;
    const user = authManager?.getCurrentUser();
    return user?.userId;
  }

  private logError(error: ErrorLog): void {
    // Prevent recursion
    if (this.isLogging) {
      return;
    }

    this.isLogging = true;

    try {
      // Add to local error log
      this.errors.push(error);
      
      // Keep only the last maxErrors entries
      if (this.errors.length > this.maxErrors) {
        this.errors = this.errors.slice(-this.maxErrors);
      }

      // Log to console for debugging using original console.error to avoid recursion
      this.originalConsoleError('Error tracked:', error);

      // Send to server (optional)
      this.reportErrorToServer(error);
    } finally {
      this.isLogging = false;
    }
  }

  private async reportErrorToServer(error: ErrorLog): Promise<void> {
    try {
      const authManager = (window as any).authManager;
      const headers = authManager ? authManager.getAuthHeaders() : {};
      
      await fetch('/api/error-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(error)
      });
    } catch (reportError) {
      // Don't log this error to avoid infinite loops
      console.warn('Failed to report error to server:', reportError);
    }
  }

  public getErrors(): ErrorLog[] {
    return [...this.errors];
  }

  public clearErrors(): void {
    this.errors = [];
  }

  public getErrorCount(): number {
    return this.errors.length;
  }

  public getRecentErrors(count: number = 10): ErrorLog[] {
    return this.errors.slice(-count);
  }

  public exportErrors(): string {
    return JSON.stringify(this.errors, null, 2);
  }

  // Manual error reporting method
  public reportError(message: string, details?: any): void {
    this.logError({
      timestamp: new Date().toISOString(),
      message: `Manual Report: ${message}`,
      stack: details?.stack || new Error().stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: this.getCurrentUserId()
    });
  }

  // Debug method to display errors in console
  public debugErrors(): void {
    console.group('Error Tracker Debug');
    console.log(`Total errors: ${this.errors.length}`);
    console.log('Recent errors:', this.getRecentErrors(5));
    console.groupEnd();
  }
}

// Global error tracker instance
(window as any).errorTracker = new ErrorTracker();