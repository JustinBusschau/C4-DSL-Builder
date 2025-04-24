import chalk from 'chalk';
import { LogLevel } from '../types/log-level.js';

const logLevelPriority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  log: 4,
};

export class CliLogger {
  _tag: string;
  _level: LogLevel;

  /* c8 ignore next -- @preserve -- not explicitly testing the LOG_LEVEL env var */
  constructor(tag: string, level: LogLevel = (process.env.LOG_LEVEL as LogLevel) ?? 'log') {
    this._tag = tag;
    this._level = level;
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private colour(level: LogLevel, message: string): string {
    switch (level) {
      case 'debug':
        return chalk.gray(message);
      case 'info':
        return chalk.white(message);
      case 'warn':
        return chalk.yellow(message);
      case 'error':
        return chalk.red(message);
      default:
        return message;
    }
  }

  private formatMessage(level: LogLevel, message: string, error: unknown = null): string {
    const timestamp = this.getTimestamp();
    let baseMessage = message;
    if (level != 'log') {
      baseMessage = `[${timestamp}] [${level.toUpperCase()}] {${this._tag}} : ${message}`;
    }
    if (level === 'error' && error instanceof Error) {
      baseMessage += `\n\n${error.message}`;
    }

    return this.colour(level, baseMessage);
  }

  private write(message: string): void {
    process.stdout.write(message + '\n');
  }

  debug(msg: string): void {
    if (logLevelPriority[this._level] <= logLevelPriority['debug']) {
      this.write(this.formatMessage('debug', msg));
    }
  }

  info(msg: string): void {
    if (logLevelPriority[this._level] <= logLevelPriority['info']) {
      this.write(this.formatMessage('info', msg));
    }
  }

  warn(msg: string): void {
    if (logLevelPriority[this._level] <= logLevelPriority['warn']) {
      this.write(this.formatMessage('warn', msg));
    }
  }

  error(msg: string, error: unknown = null): void {
    if (logLevelPriority[this._level] <= logLevelPriority['error']) {
      this.write(this.formatMessage('error', msg, error));
    }
  }

  log(msg: string): void {
    this.write(this.formatMessage('log', msg));
  }
}
