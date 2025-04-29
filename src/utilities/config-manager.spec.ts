import { describe, it, beforeEach, afterEach, expect, vi, type Mock } from 'vitest';
import { CliLogger } from './cli-logger.js';
import type { BuildConfig } from '../types/build-config.js';
import inquirer from 'inquirer';

const configStoreInstance = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
};

vi.mock('configstore', () => {
  return {
    default: vi.fn(() => configStoreInstance),
  };
});

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}));

const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn(),
};

vi.mock('../utilities/cli-logger.js', () => ({
  CliLogger: vi.fn(() => mockLogger),
}));

import { ConfigManager } from './config-manager.js';

const answers: BuildConfig = {
  projectName: 'Demo',
  homepageName: 'Home',
  rootFolder: './src',
  distFolder: './dist',
  docsifyTemplate: '',
  embedMermaidDiagrams: false,
  dslCli: 'docker',
  workspaceDsl: 'workspace.dsl',
  pdfCss: '_resources/pdf.css',
  serve: false,
  servePort: 4000,
  repoName: 'https://github.com/user/repo',
  webTheme: 'https://theme.css',
  generateWebsite: false,
};

describe('ConfigManager', () => {
  const logSpy = new CliLogger('ConfigManager.test', 'debug');
  let manager: ConfigManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new ConfigManager(logSpy);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('runs full setConfig flow and stores answers', async () => {
    (inquirer.prompt as unknown as Mock).mockResolvedValue(answers);

    await manager.setConfig();

    for (const [key, value] of Object.entries(answers)) {
      expect(configStoreInstance.set).toHaveBeenCalledWith(key, String(value));
    }

    expect(logSpy.log).toHaveBeenCalledTimes(2);
    expect(logSpy.log).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('Configure your project settings'),
    );
    expect(logSpy.log).toHaveBeenNthCalledWith(2, expect.stringContaining('Configuration updated'));
  });

  it('should correctly validate project name', async () => {
    const promptSpy = vi.spyOn(inquirer, 'prompt').mockResolvedValue({} as BuildConfig);

    await manager.setConfig();

    const prompts = promptSpy.mock.calls[0][0] as unknown as Array<{
      name: string;
      validate?: (input: string) => string | boolean;
    }>;

    const projectNamePrompt = prompts.find((q) => q.name === 'projectName');

    expect(projectNamePrompt).toBeDefined();

    const validate = projectNamePrompt?.validate;
    expect(validate).toBeDefined();

    if (validate) {
      expect(validate('Valid Name')).toBe(true);
      expect(validate('A')).toBe(
        'Project name must be at least 2 characters and only contain letters, numbers, spaces, hyphens, or underscores.',
      );
      expect(validate('Invalid@Name')).toBe(
        'Project name must be at least 2 characters and only contain letters, numbers, spaces, hyphens, or underscores.',
      );
      expect(validate('folder/sub')).toBe(
        'Project name must be at least 2 characters and only contain letters, numbers, spaces, hyphens, or underscores.',
      );
      expect(validate('directory\\folder')).toBe(
        'Project name must be at least 2 characters and only contain letters, numbers, spaces, hyphens, or underscores.',
      );
      expect(validate('Valid_Name-2')).toBe(true);
    }
  });

  it('should correctly validate URLs', async () => {
    const promptSpy = vi.spyOn(inquirer, 'prompt').mockResolvedValue({} as BuildConfig);

    await manager.setConfig();

    const prompts = promptSpy.mock.calls[0][0] as unknown as Array<{
      name: string;
      validate?: (input: string) => string | boolean;
    }>;

    const repoUrlPrompt = prompts.find((q) => q.name === 'repoName');

    expect(repoUrlPrompt).toBeDefined();

    const validate = repoUrlPrompt?.validate;
    expect(validate).toBeDefined();

    if (validate) {
      expect(validate('')).toBe(true);
      expect(validate('https://example.com')).toBe(true);
      expect(validate('not-a-url')).toBe('Please enter a valid URL.');
      expect(validate('ftp://example.com')).toBe(true);
    }
  });

  it('gets string config value when valid', () => {
    configStoreInstance.get.mockReturnValue('my-value');
    expect(manager.getStrConfigValue('myKey')).toBe('my-value');
  });

  it('logs and returns empty string for non-string config value', () => {
    configStoreInstance.get.mockReturnValue(true);
    const result = manager.getStrConfigValue('someKey');
    expect(result).toBe('');
    expect(logSpy.info).toHaveBeenCalledWith(expect.stringContaining('Expected string'));
  });

  it('gets boolean config value when valid boolean', () => {
    configStoreInstance.get.mockReturnValue(true);
    expect(manager.getBoolConfigValue('boolKey')).toBe(true);
  });

  it('parses "yes"/"no" strings as booleans', () => {
    configStoreInstance.get.mockReturnValue('yes');
    expect(manager.getBoolConfigValue('boolKey')).toBe(true);

    configStoreInstance.get.mockReturnValue('no');
    expect(manager.getBoolConfigValue('boolKey')).toBe(false);
  });

  it('logs and returns false for invalid boolean value', () => {
    configStoreInstance.get.mockReturnValue('maybe');
    const result = manager.getBoolConfigValue('boolKey');
    expect(result).toBe(false);
    expect(logSpy.info).toHaveBeenCalledWith(expect.stringContaining('Expected boolean'));
  });

  it('gets number config value when valid', () => {
    configStoreInstance.get.mockReturnValue(12345);
    expect(manager.getNumConfigValue('myKey')).toBe(12345);
  });

  it('logs and returns empty string for non-string config value', () => {
    configStoreInstance.get.mockReturnValue('someValue');
    const result = manager.getNumConfigValue('someKey');
    expect(result).toBe(0);
    expect(logSpy.info).toHaveBeenCalledWith(expect.stringContaining('Expected number'));
  });

  it('calls setConfigValue correctly', () => {
    manager.setConfigValue('someKey', 'someValue');
    expect(configStoreInstance.set).toHaveBeenCalledWith('someKey', 'someValue');
  });

  it('calls deleteConfig correctly', () => {
    manager.deleteConfig('someKey');
    expect(configStoreInstance.delete).toHaveBeenCalledWith('someKey');
  });

  it('resets config and logs confirmation', () => {
    configStoreInstance.get.mockReturnValue('DemoProject');
    manager.resetConfig();
    expect(configStoreInstance.clear).toHaveBeenCalled();
    expect(configStoreInstance.set).toHaveBeenCalledWith('projectName', 'DemoProject');

    expect(logSpy.log).toHaveBeenCalledWith(
      expect.stringContaining('Configuration has been reset for project DemoProject'),
    );
  });

  it('prints all config values in listConfig()', () => {
    configStoreInstance.get.mockReturnValueOnce(answers.projectName);
    configStoreInstance.get.mockReturnValueOnce(answers.homepageName);
    configStoreInstance.get.mockReturnValueOnce(answers.rootFolder);
    configStoreInstance.get.mockReturnValueOnce(answers.distFolder);
    configStoreInstance.get.mockReturnValueOnce(answers.dslCli);
    configStoreInstance.get.mockReturnValueOnce(answers.workspaceDsl);
    configStoreInstance.get.mockReturnValueOnce(answers.embedMermaidDiagrams);
    configStoreInstance.get.mockReturnValueOnce(answers.pdfCss);
    configStoreInstance.get.mockReturnValueOnce(answers.serve);
    configStoreInstance.get.mockReturnValueOnce(answers.servePort);
    configStoreInstance.get.mockReturnValueOnce(answers.repoName);
    configStoreInstance.get.mockReturnValueOnce(answers.webTheme);
    configStoreInstance.get.mockReturnValueOnce(answers.generateWebsite);
    manager.listConfig();

    expect(logSpy.log).toHaveBeenCalledTimes(14); // 13 for the config values, 1 for the header
    expect(logSpy.log).toHaveBeenNthCalledWith(1, expect.stringContaining('Current Configuration'));
    expect(logSpy.log).toHaveBeenNthCalledWith(
      2,
      `${'Project name'.padEnd(40)} : ${answers.projectName}`,
    );
    expect(logSpy.log).toHaveBeenNthCalledWith(
      3,
      `${'Homepage Name'.padEnd(40)} : ${answers.homepageName}`,
    );
    expect(logSpy.log).toHaveBeenNthCalledWith(
      4,
      `${'Root Folder'.padEnd(40)} : ${answers.rootFolder}`,
    );
    expect(logSpy.log).toHaveBeenNthCalledWith(
      5,
      `${'Destination Folder'.padEnd(40)} : ${answers.distFolder}`,
    );
    expect(logSpy.log).toHaveBeenNthCalledWith(
      6,
      `${'Structurizr DSL CLI to use'.padEnd(40)} : ${answers.dslCli}`,
    );
    expect(logSpy.log).toHaveBeenNthCalledWith(
      7,
      `${'Where Structurizr starts looking for diagrams to extract'.padEnd(40)} : ${answers.workspaceDsl}`,
    );
    expect(logSpy.log).toHaveBeenNthCalledWith(
      8,
      `${'Embed Mermaid diagrams?'.padEnd(40)} : ${answers.embedMermaidDiagrams ? 'Yes' : 'No'}`,
    );
    expect(logSpy.log).toHaveBeenNthCalledWith(9, `${'PDF CSS'.padEnd(40)} : ${answers.pdfCss}`);
    expect(logSpy.log).toHaveBeenNthCalledWith(
      10,
      `${'Serve Docsify Website?'.padEnd(40)} : ${answers.serve ? 'Yes' : 'No'}`,
    );
    expect(logSpy.log).toHaveBeenNthCalledWith(
      11,
      `${'Port Number'.padEnd(40)} : ${answers.servePort}`,
    );
    expect(logSpy.log).toHaveBeenNthCalledWith(
      12,
      `${'Repo URL'.padEnd(40)} : ${answers.repoName}`,
    );
    expect(logSpy.log).toHaveBeenNthCalledWith(
      13,
      `${'Docsify stylesheet'.padEnd(40)} : ${answers.webTheme}`,
    );
    expect(logSpy.log).toHaveBeenNthCalledWith(
      14,
      `${'Generate website'.padEnd(40)} : ${answers.generateWebsite ? 'Yes' : 'No'}`,
    );
  });

  it('prints "Not set" when config value is empty or invalid in listConfig', () => {
    configStoreInstance.get.mockImplementation((key: string) => {
      if (['projectName', 'homepageName'].includes(key)) return '';
      if (['rootFolder'].includes(key)) return 'undefined';
      return undefined;
    });

    manager.listConfig();

    expect(logSpy.log).toHaveBeenCalledWith(expect.stringMatching(/Project name.*Not set/));
    expect(logSpy.log).toHaveBeenCalledWith(expect.stringMatching(/Homepage Name.*Not set/));
    expect(logSpy.log).toHaveBeenCalledWith(expect.stringMatching(/Root Folder.*Not set/));
  });

  it('handles invalid config store instance gracefully', () => {
    const err = new Error('Config store error');
    configStoreInstance.get.mockImplementation(() => {
      throw err;
    });
    const result = manager.getStrConfigValue('someKey');
    expect(result).toBe('');
    expect(logSpy.error).toHaveBeenCalledWith('Error retrieving config value for someKey.', err);
  });

  it('gets all stored config values correctly', async () => {
    configStoreInstance.get
      .mockReturnValueOnce('DemoProject')
      .mockReturnValueOnce('Home')
      .mockReturnValueOnce('./src')
      .mockReturnValueOnce('./dist')
      .mockReturnValueOnce('docker')
      .mockReturnValueOnce('workspace.dsl')
      .mockReturnValueOnce(true)
      .mockReturnValueOnce('_resources/pdf.css')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(8000)
      .mockReturnValueOnce('https://github.com/user/repo')
      .mockReturnValueOnce('https://theme.css');

    const config = await manager.getAllStoredConfig();

    expect(config).toEqual<BuildConfig>({
      projectName: 'DemoProject',
      homepageName: 'Home',
      rootFolder: './src',
      distFolder: './dist',
      dslCli: 'docker',
      workspaceDsl: 'workspace.dsl',
      embedMermaidDiagrams: true,
      pdfCss: '_resources/pdf.css',
      serve: false,
      servePort: 8000,
      repoName: 'https://github.com/user/repo',
      webTheme: 'https://theme.css',
      generateWebsite: false,
    });
  });

  it('defaults dslCli to structurizr-cli when not docker', async () => {
    configStoreInstance.get
      .mockReturnValueOnce('DemoProject')
      .mockReturnValueOnce('Home')
      .mockReturnValueOnce('./src')
      .mockReturnValueOnce('./dist')
      .mockReturnValueOnce('something-else')
      .mockReturnValueOnce('workspace.dsl')
      .mockReturnValueOnce(true)
      .mockReturnValueOnce('_resources/pdf.css')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(8000);

    const config = await manager.getAllStoredConfig();

    expect(config.dslCli).toBe('structurizr-cli');
  });
  it('should print valid number when a `number` config value is a number', () => {
    configStoreInstance.get
      .mockReturnValueOnce('DemoProject')
      .mockReturnValueOnce('Home')
      .mockReturnValueOnce('./src')
      .mockReturnValueOnce('./dist')
      .mockReturnValueOnce('structurizr-cli')
      .mockReturnValueOnce('workspace.dsl')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce('_resources/pdf.css')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(4000)
      .mockReturnValueOnce('')
      .mockReturnValueOnce('')
      .mockReturnValueOnce(false);

    manager.listConfig();

    expect(logSpy.log).toHaveBeenCalledWith(
      expect.stringContaining('Port Number'.padEnd(40) + ' : 4000'),
    );
  });

  it('should print valid number when a `number` config value is a numeric string', () => {
    configStoreInstance.get
      .mockReturnValueOnce('DemoProject')
      .mockReturnValueOnce('Home')
      .mockReturnValueOnce('./src')
      .mockReturnValueOnce('./dist')
      .mockReturnValueOnce('structurizr-cli')
      .mockReturnValueOnce('workspace.dsl')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce('_resources/pdf.css')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce('4000')
      .mockReturnValueOnce(false);

    manager.listConfig();

    expect(logSpy.log).toHaveBeenCalledWith(
      expect.stringContaining('Port Number'.padEnd(40) + ' : 4000'),
    );
  });

  it('should print empty when a `number` config value is non-numeric and log an error', () => {
    configStoreInstance.get
      .mockReturnValueOnce('DemoProject')
      .mockReturnValueOnce('Home')
      .mockReturnValueOnce('./src')
      .mockReturnValueOnce('./dist')
      .mockReturnValueOnce('structurizr-cli')
      .mockReturnValueOnce('workspace.dsl')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce('_resources/pdf.css')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce('not-a-number')
      .mockReturnValueOnce(false);

    manager.listConfig();

    expect(logSpy.log).toHaveBeenCalledWith(
      expect.stringContaining('Port Number'.padEnd(40) + ' : '),
    );
    expect(logSpy.info).toHaveBeenCalledWith('Expected number for servePort, but got string');
  });

  it('should print empty when a `number` config value is empty string and log an error', () => {
    configStoreInstance.get
      .mockReturnValueOnce('DemoProject')
      .mockReturnValueOnce('Home')
      .mockReturnValueOnce('./src')
      .mockReturnValueOnce('./dist')
      .mockReturnValueOnce('structurizr-cli')
      .mockReturnValueOnce('workspace.dsl')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce('_resources/pdf.css')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(undefined);

    manager.listConfig();

    expect(logSpy.log).toHaveBeenCalledWith(
      expect.stringContaining('Port Number'.padEnd(40) + ' : '),
    );
    expect(logSpy.info).toHaveBeenCalledWith('Expected number for servePort, but got undefined');
  });

  it('listConfig correctly prints "No" when a boolean value is false', () => {
    configStoreInstance.get.mockImplementation((key: string) => {
      if (key === 'embedMermaidDiagrams') return false;
      return 'dummy';
    });

    manager.listConfig();

    expect(logSpy.log).toHaveBeenCalledWith(
      expect.stringContaining('Embed Mermaid diagrams?'.padEnd(40) + ' : No'),
    );
  });
});
