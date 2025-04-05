import { jest } from '@jest/globals';
import chalk from 'chalk';

const logMock = jest.fn();
const clearMock = jest.fn();

jest.unstable_mockModule('../utilities/logger.js', () => ({
  createLogger: () => ({
    log: logMock,
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.unstable_mockModule('../utilities/config.js', () => ({
  clearConfig: clearMock,
}));

describe('cmdResetConfig', () => {
  let cmdResetConfig: typeof import('./cmdResetConfig.js').cmdResetConfig;

  beforeEach(async () => {
    logMock.mockReset();
    clearMock.mockReset();

    await jest.isolateModulesAsync(async () => {
      const mod = await import('./cmdResetConfig.js');
      cmdResetConfig = mod.cmdResetConfig;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('clears the config and logs a confirmation message', () => {
    cmdResetConfig();

    expect(clearMock).toHaveBeenCalledTimes(1);
    expect(logMock).toHaveBeenCalledWith(chalk.yellow('✅ Configuration has been reset.'));
  });
});
