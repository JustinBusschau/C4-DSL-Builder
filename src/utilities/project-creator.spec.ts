import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import path from 'node:path';
import { ProjectCreator } from './project-creator.js';
import { SafeFiles } from './safe-files.js';
import { Paths } from './paths.js';
import Configstore from 'configstore';
import * as Constants from '../types/constants.js';

const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn(),
};

const configStoreInstance = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
};

vi.mock('./cli-logger.js', () => ({
  CliLogger: vi.fn(() => mockLogger),
}));

vi.mock('./paths.js', () => ({
  Paths: vi.fn(() => ({
    getPathFromMeta: vi.fn().mockReturnValue('/some/base/path/src/project-creator.js'),
  })),
}));

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

let mockPrompt: Mock;

describe('ProjectCreator', () => {
  let safeFiles: SafeFiles;
  let creator: ProjectCreator;

  beforeEach(async () => {
    vi.clearAllMocks();
    const inquirer = await import('inquirer');
    mockPrompt = inquirer.default.prompt as unknown as Mock;
    safeFiles = {
      pathExists: vi.fn().mockResolvedValue(false),
      createDir: vi.fn().mockResolvedValue(undefined),
      copyFile: vi.fn().mockResolvedValue(undefined),
    } as unknown as SafeFiles;

    creator = new ProjectCreator(safeFiles, new Paths(), Configstore);
  });

  describe('isValidProjectFolderName', () => {
    it('rejects too-short or invalid names', async () => {
      expect(await creator.isValidProjectFolderName('a')).toMatch(/at least 2 characters/);
      expect(await creator.isValidProjectFolderName('???')).toMatch(/only letters, numbers/);
    });

    it('rejects names if folder already exists', async () => {
      vi.spyOn(safeFiles, 'pathExists').mockResolvedValueOnce(true);
      const result = await creator.isValidProjectFolderName('my-project');
      expect(result).toBe('A folder with this name already exists');
    });

    it('accepts valid and available names', async () => {
      const result = await creator.isValidProjectFolderName('project_01');
      expect(result).toBe(true);
    });
  });

  describe('promptForProjectName', () => {
    it('prompts for name and returns it', async () => {
      mockPrompt.mockResolvedValueOnce({ projectName: 'cli-project' });
      const result = await creator.promptForProjectName();
      expect(result).toBe('cli-project');
      expect(mockPrompt).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ name: 'projectName', type: 'input' })]),
      );
    });
  });

  describe('promptForProjectTemplate', () => {
    it('offers sample, clean and empty templates', async () => {
      mockPrompt.mockResolvedValueOnce({ projectTemplate: 'empty' });

      const result = await creator.promptForProjectTemplate();

      expect(result).toBe('empty');
      const questions = mockPrompt.mock.calls[0][0] as Array<{
        name: string;
        choices: Array<{ name: string; value: string }>;
      }>;
      expect(questions[0].name).toBe('projectTemplate');
      expect(questions[0].choices.map((choice) => choice.value)).toEqual([
        'sample',
        'clean',
        'empty',
      ]);
      expect(questions[0].choices.map((choice) => choice.name)).toContain(
        "Leave the folder empty, I'll create the folder structure myself",
      );
    });
  });

  describe('createNewProject', () => {
    beforeEach(() => {
      mockPrompt
        .mockResolvedValueOnce({ projectName: 'newproj' })
        .mockResolvedValue({ projectTemplate: 'sample' });
    });

    it('creates a new project and logs steps', async () => {
      const result = await creator.createNewProject();

      const projectPath = path.resolve(process.cwd(), 'newproj');
      expect(result).toBe(projectPath);

      expect(safeFiles.createDir).toHaveBeenCalledWith(projectPath);
      expect(safeFiles.copyFile).toHaveBeenCalledWith(
        path.resolve('/some/base/path/src/project-creator.js', '../../template'),
        projectPath,
      );

      expect(Configstore).toHaveBeenCalledWith(
        expect.stringContaining('_'),
        expect.objectContaining({
          projectName: 'newproj',
          rootFolder: Constants.DEFAULT_ROOT,
          distFolder: Constants.DEFAULT_DIST,
        }),
        expect.objectContaining({
          configPath: path.join(projectPath, Constants.CONFIG_FILENAME),
        }),
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("Project 'newproj' created successfully"),
      );
    });

    it('copies the template without sample documents for a clean project', async () => {
      mockPrompt.mockReset();
      mockPrompt
        .mockResolvedValueOnce({ projectName: 'newproj' })
        .mockResolvedValue({ projectTemplate: 'clean' });
      const templatePath = path.resolve('/some/base/path/src/project-creator.js', '../../template');

      await creator.createNewProject();

      expect(safeFiles.copyFile).toHaveBeenCalledTimes(1);
      const call = (safeFiles.copyFile as Mock).mock.calls[0];
      expect(call[0]).toBe(templatePath);
      expect(call[1]).toBe(path.resolve(process.cwd(), 'newproj'));
      expect(call[2]).toBeTypeOf('function');

      const filter = call[2] as (source: string) => boolean;
      expect(filter(path.join(templatePath, 'src/context.md'))).toBe(false);
      expect(filter(path.join(templatePath, 'src/Other Files'))).toBe(false);
      expect(filter(path.join(templatePath, 'src/_dsl/workspace.dsl'))).toBe(true);
    });

    it('does not copy the template for an empty project', async () => {
      mockPrompt.mockReset();
      mockPrompt
        .mockResolvedValueOnce({ projectName: 'newproj' })
        .mockResolvedValue({ projectTemplate: 'empty' });

      const result = await creator.createNewProject();

      expect(result).toBe(path.resolve(process.cwd(), 'newproj'));
      expect(safeFiles.createDir).toHaveBeenCalledWith(path.resolve(process.cwd(), 'newproj'));
      expect(safeFiles.copyFile).not.toHaveBeenCalled();
    });

    it('refuses to create a project outside the current folder', async () => {
      mockPrompt.mockReset();
      mockPrompt
        .mockResolvedValueOnce({ projectName: '../escape' })
        .mockResolvedValue({ projectTemplate: 'sample' });

      const result = await creator.createNewProject();

      expect(result).toBeNull();
      expect(safeFiles.createDir).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith('Error creating project.', expect.any(Error));
    });

    it('refuses to overwrite an existing folder', async () => {
      vi.spyOn(safeFiles, 'pathExists').mockResolvedValueOnce(true);

      const result = await creator.createNewProject();

      expect(result).toBeNull();
      expect(safeFiles.createDir).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith('Error creating project.', expect.any(Error));
    });

    it('logs and returns null on error', async () => {
      vi.spyOn(safeFiles, 'copyFile').mockRejectedValueOnce(new Error('copy failed'));

      const result = await creator.createNewProject();
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Error creating project.', expect.any(Error));
    });
  });
});
