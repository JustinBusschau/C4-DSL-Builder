import chalk from 'chalk';
import { getStrConfig } from './config.js';
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

export const logger = {
  debug: (msg: string) => {
    if (getStrConfig('logLevel') === 'debug') {
      write(formatMessage('debug', msg));
    }
  },
  info: (msg: string) => {
    const logLevel = getStrConfig('logLevel');
    if (logLevel === 'debug' || logLevel === 'info') {
      write(formatMessage('info', msg));
    }
  },
  warn: (msg: string) => {
    const logLevel = getStrConfig('logLevel');
    if (logLevel === 'debug' || logLevel === 'info' || logLevel === 'warn') {
      write(formatMessage('warn', msg));
    }
  },
  error: (msg: string, error: unknown = null) => {
    if (getStrConfig('logLevel') !== 'log') {
      write(formatMessage('error', msg, error));
    }
  },
  log: (msg: string) => write(formatMessage('log', msg)),
};
