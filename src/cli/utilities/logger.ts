import chalk from 'chalk';
import { LogLevel } from '../types/logLevel.js';

const write = (message: string): void => {
  process.stdout.write(message + '\n');
};

const formatMessage = (level: LogLevel, message: string, error: unknown = null): string => {
  const timestamp = new Date().toISOString();
  switch (level) {
    case 'debug':
      return chalk.gray(`[${timestamp}] [DEBUG] ${message}`);
    case 'info':
      return chalk.white(`[${timestamp}] [INFO] ${message}`);
    case 'warn':
      return chalk.yellow(`[${timestamp}] [WARN] ${message}`);
    case 'error':
      if (error instanceof Error) {
        return chalk.red(`[${timestamp}] [ERROR] ${message}\n\n${error.message}`);
      }
      return chalk.red(`[${timestamp}] [ERROR] ${message}`);
    case 'log':
      return message;
  }
};

export const createLogger = (level: LogLevel = (process.env.LOG_LEVEL as LogLevel) ?? 'log') => ({
  debug: (msg: string) => {
    if (level === 'debug') {
      write(formatMessage('debug', msg));
    }
  },
  info: (msg: string) => {
    if (level === 'debug' || level === 'info') {
      write(formatMessage('info', msg));
    }
  },
  warn: (msg: string) => {
    if (level === 'debug' || level === 'info' || level === 'warn') {
      write(formatMessage('warn', msg));
    }
  },
  error: (msg: string, error: unknown = null) => {
    if (level !== 'log') {
      write(formatMessage('error', msg, error));
    }
  },
  log: (msg: string) => write(formatMessage('log', msg)),
});
