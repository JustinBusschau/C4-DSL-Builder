import { jest } from '@jest/globals';
import type { SpyInstance } from 'jest-mock';
import chalk from 'chalk';
import { createLogger } from './logger.js';

// First: mock the config module BEFORE anything imports it
jest.unstable_mockModule('./config.js', () => ({
  getStrConfig: jest.fn(),
}));

describe('logger', () => {
  let logger = createLogger('log');
  let stdoutSpy: SpyInstance<typeof process.stdout.write>;

  const getLastLoggedString = (): string => (stdoutSpy.mock.calls.at(-1) as [string])?.[0] ?? '';

  const levels = ['debug', 'info', 'warn', 'error', 'log'] as const;

  beforeEach(async () => {
    await jest.isolateModulesAsync(async () => {
      stdoutSpy = jest.spyOn(process.stdout, 'write') as SpyInstance<typeof process.stdout.write>;
      stdoutSpy.mockImplementation(() => true);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each(levels)('logs a debug message only if level is debug', (level) => {
    logger = createLogger(level);
    logger.debug('Debug test');
    if (level === 'debug') {
      expect(getLastLoggedString()).toContain('[DEBUG]');
    } else {
      expect(stdoutSpy).not.toHaveBeenCalled();
    }
  });

  it.each(levels)('logs an info message if level is debug or info', (level) => {
    logger = createLogger(level);
    logger.info('Info test');
    if (['debug', 'info'].includes(level)) {
      expect(getLastLoggedString()).toContain('[INFO]');
    } else {
      expect(stdoutSpy).not.toHaveBeenCalled();
    }
  });

  it.each(levels)('logs a warning message if level is debug, info or warn', (level) => {
    logger = createLogger(level);
    logger.warn('Warning test');
    if (['debug', 'info', 'warn'].includes(level)) {
      expect(getLastLoggedString()).toContain('[WARN]');
    } else {
      expect(stdoutSpy).not.toHaveBeenCalled();
    }
  });

  it.each(levels)('logs an error message unless level is log', (level) => {
    logger = createLogger(level);
    logger.error('Error test');
    if (level !== 'log') {
      expect(getLastLoggedString()).toContain('[ERROR]');
    } else {
      expect(stdoutSpy).not.toHaveBeenCalled();
    }
  });

  it('logs error with error object when provided', () => {
    logger = createLogger('debug');
    logger.error('Failed!', new Error('Boom'));
    const output = getLastLoggedString();
    expect(output).toContain('[ERROR]');
    expect(output).toContain('Failed!');
    expect(output).toContain('Boom');
  });

  it('always logs a plain log message (log level independent)', () => {
    for (const level of levels) {
      logger = createLogger(level);
      logger.log('Plain output');
      expect(getLastLoggedString()).toContain('Plain output');
    }
  });

  it('formats debug message in gray', () => {
    logger = createLogger('debug');
    logger.debug('gray test');
    expect(getLastLoggedString()).toContain(chalk.gray(''));
  });

  it('formats info message in white', () => {
    logger = createLogger('info');
    logger.info('white test');
    expect(getLastLoggedString()).toContain(chalk.white(''));
  });

  it('formats warning message in yellow', () => {
    logger = createLogger('warn');
    logger.warn('yellow test');
    expect(getLastLoggedString()).toContain(chalk.yellow(''));
  });

  it('formats error message in red', () => {
    logger = createLogger('debug');
    logger.error('red test');
    expect(getLastLoggedString()).toContain(chalk.red(''));
  });
});
