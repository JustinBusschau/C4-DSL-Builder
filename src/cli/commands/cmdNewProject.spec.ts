// declare mocks first (so they're available to the mock factory)
const mockConfSet = jest.fn();

// mock 'configstore' BEFORE any imports
const ConfigstoreMock = jest.fn().mockImplementation(() => ({
  set: mockConfSet,
}));
jest.mock('configstore', () => {
  return ConfigstoreMock;
});

import { cmdNewProject, isValidProjectName } from './cmdNewProject.js';
import { logger } from '../utilities/logger.js';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';

jest.mock('inquirer');
jest.mock('fs-extra');
jest.mock('../utilities/logger.js');

const mockPrompt = inquirer.prompt as unknown as jest.Mock;
const mockMkdirp = fs.mkdirp as jest.Mock;
const mockCopy = fs.copy as jest.Mock;
const mockExistsSync = fs.existsSync as jest.Mock;

describe('isValidProjectName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reject invalid project names (too short)', () => {
    expect(isValidProjectName('a')).toContain('at least 2 characters');
  });

  it('should reject names with invalid characters', () => {
    expect(isValidProjectName('my project!')).toContain('only letters');
  });

  it('should reject existing folders', () => {
    mockExistsSync.mockReturnValue(true);
    expect(isValidProjectName('existing-folder')).toContain('already exists');
  });

  it('should accept valid names', () => {
    mockExistsSync.mockReturnValue(false);
    expect(isValidProjectName('valid_name')).toBe(true);
  });
});

describe('cmdNewProject', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMkdirp.mockResolvedValue(undefined);
    mockCopy.mockResolvedValue(undefined);
    mockExistsSync.mockReturnValue(false);
  });

  it('should prompt the user for a project name', async () => {
    mockPrompt.mockResolvedValue({ projectName: 'my-app' });

    await cmdNewProject();

    expect(mockPrompt).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Enter your project name:',
          name: 'projectName',
          type: 'input',
          validate: expect.any(Function) as unknown as (input: string) => boolean | string,
        }),
      ]),
    );
  });

  it('should create project folder, copy the template files and create a config store', async () => {
    mockPrompt.mockResolvedValue({ projectName: 'test-project' });

    const logSpy = jest.spyOn(logger, 'log').mockImplementation(() => {});

    await cmdNewProject();

    expect(ConfigstoreMock).toHaveBeenCalledWith(
      expect.stringContaining(process.cwd().split(path.sep).splice(1).join('_')),
      {
        projectName: 'test-project',
        rootFolder: 'src',
        distFolder: 'docs',
      },
      expect.objectContaining({
        configPath: expect.stringContaining('test-project/.c4dslbuilder') as unknown,
      }),
    );
    expect(mockMkdirp).toHaveBeenCalled();
    expect(mockCopy).toHaveBeenCalled();
    const logs = logSpy.mock.calls.flatMap((args) => args).join('\n');
    expect(logs).toContain("✅ Project 'test-project' created successfully.");
    expect(logs).toContain('Next steps:');
    expect(logs).toContain('cd test-project');
    expect(logs).toContain('c4dslbuilder config');
  });

  it('should log next steps', async () => {
    const logSpy = jest.spyOn(logger, 'log').mockImplementation(() => {});
    mockPrompt.mockResolvedValue({ projectName: 'next-steps' });
    mockExistsSync.mockReturnValue(false);

    await cmdNewProject();

    const logs = logSpy.mock.calls.flatMap((args) => args).join('\n');
    expect(logs).toContain('cd next-steps');
    expect(logs).toContain('c4dslbuilder config');
  });

  it('should handle errors gracefully', async () => {
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    mockPrompt.mockResolvedValue({ projectName: 'fail-project' });
    mockExistsSync.mockReturnValue(false);
    mockMkdirp.mockRejectedValue(new Error('Boom'));

    await cmdNewProject();

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Error creating project: Boom'));
  });
});
