import { jest } from '@jest/globals';
import { SpyInstance } from 'jest-mock';
import { logger } from './logger.js';
import chalk from 'chalk';

describe('logger', () => {
  let stdoutSpy: SpyInstance<
    (str: string | Uint8Array, encoding?: BufferEncoding, cb?: (err?: Error) => void) => boolean
  >;

  beforeEach(() => {
    stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const getLastLoggedString = (): string => (stdoutSpy.mock.calls.at(-1) as [string])?.[0] ?? '';

  it('logs a debug message with gray color and DEBUG label', () => {
    logger.debug('This is a debug message');
    const output = getLastLoggedString();

    expect(output).toContain('[DEBUG]');
    expect(output).toContain('This is a debug message');
    expect(output).toContain(chalk.gray(''));
  });

  it('logs an info message with white color and INFO label', () => {
    logger.info('Hello, world!');
    const output = getLastLoggedString();
    expect(output).toContain('[INFO]');
    expect(output).toContain('Hello, world!');
    expect(output).toContain(chalk.white(''));
  });

  it('logs a warning message with yellow color and WARN label', () => {
    logger.warn('Something might be wrong');
    const output = getLastLoggedString();
    expect(output).toContain('[WARN]');
    expect(output).toContain('Something might be wrong');
    expect(output).toContain(chalk.yellow(''));
  });

  it('logs an error message with red color and ERROR label', () => {
    logger.error('Something went wrong!');
    const output = getLastLoggedString();
    expect(output).toContain('[ERROR]');
    expect(output).toContain('Something went wrong!');
    expect(output).toContain(chalk.red(''));
  });

  it('logs an error message with red color and ERROR label, and error message if present', () => {
    logger.error('Something went wrong!', new Error('Error details'));
    const output = getLastLoggedString();
    expect(output).toContain('[ERROR]');
    expect(output).toContain('Something went wrong!');
    expect(output).toContain('Error details');
    expect(output).toContain(chalk.red(''));
  });

  it('logs an undecorated message with no label', () => {
    logger.log('A message for the CLI');
    const output = getLastLoggedString();
    expect(output).toContain('A message for the CLI');
  });
});
