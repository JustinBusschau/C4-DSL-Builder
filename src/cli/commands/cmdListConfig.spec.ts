import chalk from 'chalk';
import Configstore from 'configstore';
import { logger } from '../utilities/logger.js';
import { cmdListConfig } from './cmdListConfig.js';

describe('cmdListConfig', () => {
  let mockConfig: Partial<Record<string, unknown>>;
  let configStoreMock: Configstore;

  const logSpy = jest.spyOn(logger, 'log').mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfig = {
      projectName: 'My New Project',
      homepageName: undefined,
      rootFolder: '/docs',
    };

    configStoreMock = {
      get: (key: string) => mockConfig[key],
    } as unknown as Configstore;
  });

  it('prints all config keys with correctly formatted values', () => {
    cmdListConfig();

    expect(logSpy).toHaveBeenCalledWith(chalk.cyan('Current Configuration\n'));

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Project name'.padEnd(40)));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(chalk.green('My New Project')));

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Homepage Name'.padEnd(40)));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(chalk.red('Not set')));

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(chalk.green('/docs')));

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(chalk.green('No')));
  });

  it('prints "Not set" for undefined values', () => {
    mockConfig = {
      projectName: undefined,
      generateWebsite: undefined,
    };

    configStoreMock = {
      get: (key: string) => mockConfig[key],
    } as unknown as Configstore;

    cmdListConfig();

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(chalk.red('Not set')));
  });
});
