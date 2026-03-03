/**
 * Logger minimal pour le développement
 * Log uniquement en mode développement
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
}

class Logger {
  private isDev = __DEV__;

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (data) {
      return `${prefix} ${message} ${JSON.stringify(data, null, 2)}`;
    }
    return `${prefix} ${message}`;
  }

  info(message: string, data?: any): void {
    if (this.isDev) {
      console.log(this.formatMessage('info', message, data));
    }
  }

  warn(message: string, data?: any): void {
    if (this.isDev) {
      console.warn(this.formatMessage('warn', message, data));
    }
  }

  error(message: string, data?: any): void {
    if (this.isDev) {
      console.error(this.formatMessage('error', message, data));
    }
  }

  debug(message: string, data?: any): void {
    if (this.isDev) {
      console.debug(this.formatMessage('debug', message, data));
    }
  }
}

export const logger = new Logger();

