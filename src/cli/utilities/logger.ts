import chalk from 'chalk';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'log';

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
  debug: (msg: string) => write(formatMessage('debug', msg)),
  info: (msg: string) => write(formatMessage('info', msg)),
  warn: (msg: string) => write(formatMessage('warn', msg)),
  error: (msg: string, error: unknown = null) => write(formatMessage('error', msg, error)),
  log: (msg: string) => write(formatMessage('log', msg)),
};
