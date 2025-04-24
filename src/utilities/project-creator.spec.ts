import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import path from 'path';
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

  describe('createNewProject', () => {
    beforeEach(() => {
      mockPrompt.mockResolvedValue({ projectName: 'newproj' });
    });

    it('creates a new project and logs steps', async () => {
      const result = await creator.createNewProject();
      expect(result).toBe(true);

      const projectPath = path.resolve(process.cwd(), 'newproj');

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
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Next steps:'));
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('cd newproj'));
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('c4dslbuilder config'));
    });

    it('logs and returns false on error', async () => {
      vi.spyOn(safeFiles, 'copyFile').mockRejectedValueOnce(new Error('copy failed'));

      const result = await creator.createNewProject();
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Error creating project.', expect.any(Error));
    });
  });
});
