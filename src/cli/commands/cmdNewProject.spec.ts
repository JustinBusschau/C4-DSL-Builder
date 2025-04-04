import { jest } from '@jest/globals';
import path from 'path';

const pathExistsMock = jest.fn<(path: string) => Promise<boolean>>();
const mkdirpMock = jest.fn<(dir: string) => Promise<void>>();
const copyMock = jest.fn<(src: string, dest: string) => Promise<void>>();
const promptMock =
  jest.fn<
    (
      questions: Parameters<typeof import('inquirer').default.prompt>[0],
    ) => Promise<{ projectName: string }>
  >();
const logMock = jest.fn();
const errorMock = jest.fn();
const configstoreConstructorMock = jest.fn();

jest.unstable_mockModule('fs-extra', () => ({
  pathExists: pathExistsMock,
  mkdirp: mkdirpMock,
  copy: copyMock,
}));

jest.unstable_mockModule('inquirer', () => ({
  default: {
    prompt: promptMock,
  },
}));

jest.unstable_mockModule('chalk', () => ({
  default: {
    green: (s: string) => s,
    blue: (s: string) => s,
    white: (s: string) => s,
    red: (s: string) => s,
  },
}));

jest.unstable_mockModule('configstore', () => ({
  default: class MockConfigstore {
    constructor(...args: unknown[]) {
      configstoreConstructorMock(...args);
    }
  },
}));

jest.unstable_mockModule('../utilities/logger.js', () => ({
  logger: {
    log: logMock,
    error: errorMock,
  },
}));

// Import module under test after mocks
const { isValidProjectName, cmdNewProject } = await import('./cmdNewProject.ts');

describe('isValidProjectName', () => {
  it('rejects names shorter than 2 characters', async () => {
    const result = await isValidProjectName('a');
    expect(typeof result).toBe('string');
    expect(result).toMatch(/at least 2 characters/i);
  });

  it('rejects names with invalid characters', async () => {
    const result = await isValidProjectName('bad!name');
    expect(typeof result).toBe('string');
    expect(result).toMatch(/only letters/i);
  });

  it('rejects existing folder name', async () => {
    pathExistsMock.mockResolvedValueOnce(true);
    const result = await isValidProjectName('existing-folder');
    expect(result).toBe('A folder with this name already exists');
  });

  it('accepts valid name and non-existing folder', async () => {
    pathExistsMock.mockResolvedValueOnce(false);
    const result = await isValidProjectName('my_project');
    expect(result).toBe(true);
  });
});

describe('cmdNewProject', () => {
  const projectName = 'test-project';
  const targetPath = path.resolve(process.cwd(), projectName);

  beforeEach(() => {
    jest.clearAllMocks();
    promptMock.mockResolvedValue({ projectName });
    mkdirpMock.mockResolvedValue(undefined);
    copyMock.mockResolvedValue(undefined);
  });

  it('creates project structure and logs success', async () => {
    await cmdNewProject();

    expect(mkdirpMock).toHaveBeenCalledWith(targetPath);
    expect(copyMock).toHaveBeenCalled();

    expect(configstoreConstructorMock).toHaveBeenCalledWith(
      expect.any(String),
      {
        projectName,
        rootFolder: 'src',
        distFolder: 'docs',
      },
      {
        configPath: path.join(targetPath, '.c4dslbuilder'),
      },
    );

    expect(logMock).toHaveBeenCalledWith(
      expect.stringContaining(`✅ Project '${projectName}' created successfully.`),
    );
  });

  it('logs error if mkdirp fails', async () => {
    mkdirpMock.mockRejectedValueOnce(new Error('mkdir failed'));

    await cmdNewProject();

    expect(errorMock).toHaveBeenCalledWith(
      expect.stringContaining('Error creating project.'),
      Error('mkdir failed'),
    );
  });

  it('handles unknown errors gracefully', async () => {
    mkdirpMock.mockRejectedValueOnce('💥');

    await cmdNewProject();

    expect(errorMock).toHaveBeenCalledWith(
      expect.stringContaining('Error creating project.'),
      '💥',
    );
  });
});
