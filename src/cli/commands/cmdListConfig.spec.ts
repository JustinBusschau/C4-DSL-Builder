import { jest } from '@jest/globals';
import chalk from 'chalk';

jest.unstable_mockModule('../utilities/logger.js', () => ({
  createLogger: jest.fn(),
}));

jest.unstable_mockModule('../utilities/config.js', () => ({
  getStrConfig: jest.fn(),
  getBoolConfig: jest.fn(),
}));

let cmdListConfig: typeof import('./cmdListConfig.js').cmdListConfig;
let getStrConfig: jest.Mock;
let getBoolConfig: jest.Mock;
let createLogger: jest.Mock;
const logSpy = jest.fn();

beforeEach(async () => {
  await jest.isolateModulesAsync(async () => {
    const configModule = await import('../utilities/config.js');
    getStrConfig = configModule.getStrConfig as jest.Mock;
    getBoolConfig = configModule.getBoolConfig as jest.Mock;

    const loggerModule = await import('../utilities/logger.js');
    createLogger = loggerModule.createLogger as jest.Mock;
    createLogger.mockReturnValue({
      log: logSpy,
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    });

    ({ cmdListConfig } = await import('./cmdListConfig.js'));
  });

  logSpy.mockClear();
  getStrConfig.mockReset();
  getBoolConfig.mockReset();
});

describe('cmdListConfig', () => {
  it('prints all config keys with correctly formatted values', () => {
    getStrConfig.mockImplementation((key: unknown) => {
      key = key as string;
      const map: Record<string, string> = {
        projectName: 'My Project',
        homepageName: 'undefined',
        rootFolder: '/src',
        distFolder: '/dist',
        webTheme: 'vue',
        docsifyTemplate: 'template.html',
        repoName: 'github.com/me/repo',
        dslCli: 'dsl-cli',
        workspaceDsl: '/workspace.dsl',
        charset: 'utf-8',
        pdfCss: 'pdf.css',
      };
      return map[key as string] ?? 'undefined';
    });

    getBoolConfig.mockImplementation((key: unknown) => {
      const map: Record<string, boolean> = {
        generateWebsite: true,
        embedMermaidDiagrams: true,
        diagramsOnTop: true,
        excludeOtherFiles: false,
      };
      return map[key as string] ?? false;
    });

    cmdListConfig();

    expect(logSpy).toHaveBeenCalledWith(chalk.cyan('Current Configuration\n'));

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Project name'.padEnd(40)));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(chalk.green('My Project')));

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Homepage Name'.padEnd(40)));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(chalk.red('Not set')));

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Embed Mermaid diagrams?'.padEnd(40)),
    );
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(chalk.green('Yes')));
  });
});
