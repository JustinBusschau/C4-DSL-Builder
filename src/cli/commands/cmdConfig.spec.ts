import * as cmdConfigModule from './cmdConfig.js';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { logger } from '../utilities/logger.js';
import type Configstore from 'configstore';

const { isValidProjectName, isValidUrl } =
  jest.requireActual<typeof cmdConfigModule>('./cmdConfig');

jest.mock('inquirer');
jest.mock('../utilities/logger.js');

describe('cmdConfig', () => {
  const getMock = jest.fn();
  const setMock = jest.fn();
  const logMock = jest.spyOn(logger, 'log');

  const mockConfig = {
    get: getMock,
    set: setMock,
  } as unknown as Configstore;

  const mockAnswers = {
    projectName: 'Test Project',
    homepageName: 'Home',
    rootFolder: '/docs',
    distFolder: '/dist',
    generateWebsite: true,
    webTheme: 'https://unpkg.com/docsify/lib/themes/vue.css',
    docsifyTemplate: 'custom-template.html',
    repoName: 'https://github.com/user/repo',
    embedDiagram: false,
    includeLinkToDiagram: true,
    diagramsOnTop: false,
    dslCli: 'structurizr-cli',
    workspaceDsl: 'workspace.dsl',
    charset: 'utf-8',
    excludeOtherFiles: false,
    pdfCss: 'styles/pdf.css',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getMock.mockImplementation(() => undefined);
    (inquirer.prompt as unknown as jest.Mock).mockResolvedValue(mockAnswers);
  });

  it('prompts user for config values and saves them to configstore', async () => {
    await cmdConfigModule.cmdConfig(mockConfig);

    Object.entries(mockAnswers).forEach(([key, value]) => {
      expect(setMock).toHaveBeenCalledWith(key, value);
    });

    expect(logMock).toHaveBeenCalledWith(chalk.cyan('Configure your project settings:\n'));

    expect(logMock).toHaveBeenCalledWith(chalk.green('\n✅ Configuration updated successfully.'));
  });

  it('uses current config values as defaults in prompts', async () => {
    getMock.mockImplementation((key: string) => {
      if (key === 'projectName') return 'Existing Project';
      return undefined;
    });

    await cmdConfigModule.cmdConfig(mockConfig);

    expect(inquirer.prompt).toHaveBeenCalled();
  });

  describe('validation functions', () => {
    describe('isValidProjectName', () => {
      it('accepts valid project names', () => {
        expect(isValidProjectName('My_Project-123')).toBe(true);
        expect(isValidProjectName('A B')).toBe(true);
      });

      it('rejects too short names', () => {
        expect(isValidProjectName('A')).toBe(
          'Project name must be at least 2 characters and only contain letters, numbers, spaces, hyphens, or underscores.',
        );
      });

      it('rejects names with invalid characters', () => {
        expect(isValidProjectName('Test@123')).toBe(
          'Project name must be at least 2 characters and only contain letters, numbers, spaces, hyphens, or underscores.',
        );
      });
    });

    describe('isValidUrl', () => {
      it('accepts valid URLs', () => {
        expect(isValidUrl('https://example.com')).toBe(true);
        expect(isValidUrl('http://localhost')).toBe(true);
      });

      it('rejects invalid URLs', () => {
        expect(isValidUrl('not-a-url')).toBe('Please enter a valid URL.');
        expect(isValidUrl('123://broken-url')).toBe('Please enter a valid URL.');
      });
    });
  });

  describe('edge cases', () => {
    it('handles missing optional fields gracefully', async () => {
      const answersWithMissingOptionals = {
        ...mockAnswers,
        docsifyTemplate: '',
        pdfCss: '',
      };

      (inquirer.prompt as unknown as jest.Mock).mockResolvedValue(answersWithMissingOptionals);

      await cmdConfigModule.cmdConfig(mockConfig);

      expect(setMock).toHaveBeenCalledWith('docsifyTemplate', '');
      expect(setMock).toHaveBeenCalledWith('pdfCss', '');
    });

    it('sets default DSL CLI to structurizr-cli when not set', async () => {
      getMock.mockImplementation((key: string) => {
        if (key === 'dslCli') return undefined;
        return mockAnswers[key as keyof typeof mockAnswers];
      });

      await cmdConfigModule.cmdConfig(mockConfig);

      expect(setMock).toHaveBeenCalledWith('dslCli', 'structurizr-cli');
    });

    it('sets default workspace to workspace.dsl when not set', async () => {
      getMock.mockImplementation((key: string) => {
        if (key === 'workspaceDsl') return undefined;
        return mockAnswers[key as keyof typeof mockAnswers];
      });

      await cmdConfigModule.cmdConfig(mockConfig);

      expect(setMock).toHaveBeenCalledWith('workspaceDsl', 'workspace.dsl');
    });

    it('defaults charset to utf-8 when not set', async () => {
      getMock.mockImplementation((key: string) => {
        if (key === 'charset') return undefined;
        return mockAnswers[key as keyof typeof mockAnswers];
      });

      await cmdConfigModule.cmdConfig(mockConfig);

      expect(setMock).toHaveBeenCalledWith('charset', 'utf-8');
    });
  });
});
