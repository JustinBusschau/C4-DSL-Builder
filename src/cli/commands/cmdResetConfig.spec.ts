import { cmdResetConfig } from './cmdResetConfig.js';
import { logger } from '../utilities/logger.js';
import Configstore from 'configstore';
import chalk from 'chalk';

describe('cmdResetConfig', () => {
  let clearMock: jest.Mock;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    clearMock = jest.fn();
    logSpy = jest.spyOn(logger, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('clears the config and logs a confirmation message', () => {
    const mockConfig = {
      clear: clearMock,
    } as unknown as Configstore;

    cmdResetConfig();

    expect(clearMock).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(chalk.yellow('✅ Configuration has been reset.'));
  });
});
