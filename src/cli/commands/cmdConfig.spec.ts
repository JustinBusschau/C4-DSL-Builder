import { jest } from '@jest/globals';
import { Question } from 'inquirer';

// ----------------- Mocks -----------------

const getStrConfigMock = jest.fn();
const getBoolConfigMock = jest.fn();
const setConfigMock = jest.fn();
const logMock = jest.fn();
const promptMock = jest.fn();

// Mock modules
jest.unstable_mockModule('../utilities/config.js', () => ({
  getStrConfig: getStrConfigMock,
  getBoolConfig: getBoolConfigMock,
  setConfig: setConfigMock,
}));

jest.unstable_mockModule('../utilities/logger.js', () => ({
  logger: {
    log: logMock,
  },
}));

jest.unstable_mockModule('inquirer', () => ({
  default: {
    prompt: promptMock,
  },
}));

jest.unstable_mockModule('chalk', () => ({
  default: {
    cyan: (s: string) => s,
    green: (s: string) => s,
  },
}));

// Import module under test after mocks
const { cmdConfig, isValidProjectName, isValidUrl } = await import('./cmdConfig.ts');

// ----------------- Tests -----------------

describe('cmdConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should prompt for all config options, store them, and log success', async () => {
    // Provide mocked defaults
    getStrConfigMock.mockImplementation((key) => {
      return {
        projectName: 'Test Project',
        homepageName: 'Home',
        rootFolder: 'src',
        distFolder: 'docs',
        webTheme: 'https://theme.css',
        docsifyTemplate: '',
        repoName: 'https://github.com/test/repo',
        dslCli: 'docker',
        workspaceDsl: 'workspace.dsl',
        charset: 'utf-8',
        pdfCss: '',
      }[key];
    });

    getBoolConfigMock.mockImplementation((key) => {
      return {
        generateWebsite: true,
        embedDiagram: false,
        includeLinkToDiagram: true,
        diagramsOnTop: false,
        excludeOtherFiles: true,
      }[key];
    });

    const mockAnswers = {
      projectName: 'New Project',
      homepageName: 'New Home',
      rootFolder: 'src',
      distFolder: 'docs',
      generateWebsite: true,
      webTheme: 'https://new-theme.css',
      docsifyTemplate: '',
      repoName: 'https://example.com',
      embedDiagram: true,
      includeLinkToDiagram: false,
      diagramsOnTop: true,
      dslCli: 'structurizr-cli',
      workspaceDsl: 'new.dsl',
      charset: 'utf-16',
      excludeOtherFiles: true,
      pdfCss: '',
    };

    promptMock.mockResolvedValue(mockAnswers);

    await cmdConfig();

    // All entries should be passed to setConfig
    Object.entries(mockAnswers).forEach(([key, value]) => {
      expect(setConfigMock).toHaveBeenCalledWith(key, String(value));
    });

    expect(promptMock).toHaveBeenCalled();
    expect(logMock).toHaveBeenCalledWith(
      expect.stringContaining('Configure your project settings:'),
    );
    expect(logMock).toHaveBeenCalledWith(
      expect.stringContaining('✅ Configuration updated successfully.'),
    );
  });

  it('wires up validators in prompt config', async () => {
    getStrConfigMock.mockReturnValue('Something');
    getBoolConfigMock.mockReturnValue(false);

    promptMock.mockResolvedValue({});

    await cmdConfig();

    const promptArgs = promptMock.mock.calls[0][0] as Question[];
    const projectNameField = promptArgs.find((q) => q.name === 'projectName');
    const repoNameField = promptArgs.find((q) => q.name === 'repoName');

    expect(typeof projectNameField?.validate).toBe('function');
    expect(typeof repoNameField?.validate).toBe('function');

    expect(projectNameField?.validate('Valid Name')).toBe(true);
    expect(projectNameField?.validate('!')).toMatch(/at least 2 characters/i);

    expect(repoNameField?.validate('https://example.com')).toBe(true);
    expect(repoNameField?.validate('not-a-url')).toBe('Please enter a valid URL.');
  });
});

// ----------------- Validators -----------------

describe('isValidProjectName', () => {
  it('accepts valid project names', () => {
    expect(isValidProjectName('My Project')).toBe(true);
    expect(isValidProjectName('proj-1')).toBe(true);
    expect(isValidProjectName('proj_1')).toBe(true);
  });

  it('rejects invalid names', () => {
    expect(isValidProjectName('!')).toMatch(/at least 2 characters/);
    expect(isValidProjectName('')).toMatch(/at least 2 characters/);
    expect(isValidProjectName('A')).toMatch(/at least 2 characters/);
  });
});

describe('isValidUrl', () => {
  it('accepts valid URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('http://localhost')).toBe(true);
  });

  it('accepts empty string', () => {
    expect(isValidUrl('')).toBe(true);
    expect(isValidUrl(undefined as unknown as string)).toBe(true);
  });

  it('rejects invalid URLs', () => {
    expect(isValidUrl('not-a-url')).toBe('Please enter a valid URL.');
    expect(isValidUrl('://missing-protocol')).toBe('Please enter a valid URL.');
  });
});
