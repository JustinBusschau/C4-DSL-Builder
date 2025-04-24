import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { CliLogger } from './cli-logger.js'; // Adjust path as needed
import type { LogLevel } from '../types/log-level.js';

const TAG = 'TestLogger';

describe('CliLogger', () => {
  let writeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    writeSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true) as unknown as ReturnType<typeof vi.spyOn>;
  });

  afterEach(() => {
    writeSpy.mockRestore();
  });

  const logLevels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'log'];

  const sampleMessage = 'Hello world';

  it('should log messages at or above the set log level', () => {
    const logger = new CliLogger(TAG, 'info');

    logger.debug(sampleMessage);
    expect(writeSpy).not.toHaveBeenCalled();

    logger.info(sampleMessage);
    expect(writeSpy).toHaveBeenCalledOnce();

    writeSpy.mockClear();
    logger.warn(sampleMessage);
    expect(writeSpy).toHaveBeenCalledOnce();

    writeSpy.mockClear();
    logger.error(sampleMessage);
    expect(writeSpy).toHaveBeenCalledOnce();

    writeSpy.mockClear();
    logger.log(sampleMessage);
    expect(writeSpy).toHaveBeenCalledOnce();
  });

  it('should log all levels when log level is set to debug', () => {
    const logger = new CliLogger(TAG, 'debug');
    for (const level of logLevels) {
      writeSpy.mockClear();
      logger[level](sampleMessage);
      expect(writeSpy).toHaveBeenCalledOnce();
    }
  });

  it('should format error messages when an Error is passed', () => {
    const logger = new CliLogger(TAG, 'debug');
    const err = new Error('Something went wrong');
    logger.error('An error occurred', err);
    const output = writeSpy.mock.calls[0][0] as string;

    expect(output).toContain('An error occurred');
    expect(output).toContain(err.message);
    expect(output).toContain('ERROR');
  });

  it('should fallback to default log formatting for "log" level', () => {
    const logger = new CliLogger(TAG, 'log');
    logger.log('Plain log message');
    const output = writeSpy.mock.calls[0][0] as string;

    expect(output).toContain('Plain log message');
    expect(output).not.toContain('[');
  });

  it('should use process.env.LOG_LEVEL as fallback if no level is provided', () => {
    process.env.LOG_LEVEL = 'warn';
    const logger = new CliLogger(TAG);
    logger.info('This should not log');
    expect(writeSpy).not.toHaveBeenCalled();

    logger.warn('This should log');
    expect(writeSpy).toHaveBeenCalledOnce();
  });
});
