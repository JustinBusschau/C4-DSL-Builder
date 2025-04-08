import path from 'path';
import fs from 'fs/promises';
import type { Stats } from 'fs';
import fsExtra from 'fs-extra';
import { jest } from '@jest/globals';
import { TreeItem } from './tree.js';

const warnMock = jest.fn();
const errorMock = jest.fn();
const mockCopy = jest.fn();
const mockEnsureDir = jest.fn();
const mockEmptyDir = jest.fn();
const mockReaddir = jest.fn();
const mockStat = jest.fn();
const mockReadFile = jest.fn();

const configMock = {
  getStrConfig: jest.fn(),
  getBoolConfig: jest.fn(),
};

jest.unstable_mockModule('fs/promises', () => ({
  readdir: mockReaddir,
  stat: mockStat,
  readFile: mockReadFile,
}));

jest.unstable_mockModule('fs-extra', () => ({
  default: {
    copy: mockCopy,
    ensureDir: mockEnsureDir,
    emptyDir: mockEmptyDir,
  },
}));

jest.unstable_mockModule('./config.js', () => configMock);

jest.unstable_mockModule('./logger.js', () => ({
  createLogger: () => ({
    warn: warnMock,
    error: errorMock,
  }),
}));

const {
  getFolderName,
  safeReadDir,
  safeStat,
  safeReadFile,
  safeCopyFile,
  safeEnsureDir,
  safeEmptySubFolder,
  itemiseTreeFolder,
  generateTree,
} = await import('./tree.js');

describe('getFolderName', () => {
  it('returns homepage when dir equals root', () => {
    const result = getFolderName('/my/project', '/my/project', 'home');
    expect(result).toBe('home');
  });

  it('returns folder base name when dir is a subfolder of root', () => {
    const result = getFolderName('/my/project/docs', '/my/project', 'home');
    expect(result).toBe('docs');
  });

  it('resolves relative paths before comparison', () => {
    const result = getFolderName('./docs', '.', 'index');
    expect(result).toBe('docs');
  });

  it('returns homepage when relative dir resolves to same as root', () => {
    const result = getFolderName('./', '.', 'root');
    expect(result).toBe('root');
  });

  it('handles root directory correctly', () => {
    const result = getFolderName('/', '/', 'root');
    expect(result).toBe('root');
  });

  it('returns correct base for deeply nested dirs', () => {
    const result = getFolderName('/a/b/c/d', '/a/b', 'main');
    expect(result).toBe('d');
  });
});

describe('safeReadDir', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns filtered directory contents, excluding items starting with "_"', async () => {
    const mockFiles: string[] = ['docs', '_private', 'about'];
    const readdirSpy = jest.spyOn(fs, 'readdir').mockResolvedValue(mockFiles);

    const result = await safeReadDir('/some/dir');
    expect(result).toEqual(['docs', 'about']);

    readdirSpy.mockRestore();
  });

  it('returns empty array and logs error when readdir throws', async () => {
    const readdirSpy = jest.spyOn(fs, 'readdir').mockRejectedValue(new Error('Simulated failure'));

    const result = await safeReadDir('/bad/dir');
    expect(result).toEqual([]);
    expect(errorMock).toHaveBeenCalledWith(
      expect.stringContaining('Error reading directory'),
      expect.any(Error),
    );

    readdirSpy.mockRestore();
  });
});

describe('safeStat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a Stats object when stat succeeds', async () => {
    const mockStats = {
      isFile: () => true,
      isDirectory: () => false,
      size: 123,
    } as Stats;

    jest.spyOn(fs, 'stat').mockResolvedValue(mockStats);

    const result = await safeStat('/some/path.txt');

    expect(result).toBe(mockStats);
    expect(result?.isFile()).toBe(true);
    expect(errorMock).not.toHaveBeenCalled();
  });

  it('returns null and logs error if stat throws', async () => {
    jest.spyOn(fs, 'stat').mockRejectedValue(new Error('Simulated stat failure'));

    const result = await safeStat('/bad/path.txt');

    expect(result).toBeNull();
    expect(errorMock).toHaveBeenCalledWith(
      expect.stringContaining('Error getting stats for file: /bad/path.txt'),
      expect.any(Error),
    );
  });
});

describe('safeReadFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns file contents as a Buffer', async () => {
    const mockBuffer = Buffer.from('Hello, world!');
    jest.spyOn(fs, 'readFile').mockResolvedValue(mockBuffer);

    const result = await safeReadFile('/fake/file.txt');

    expect(result).toBeInstanceOf(Buffer);
    expect(result?.toString()).toBe('Hello, world!');
    expect(errorMock).not.toHaveBeenCalled();
  });

  it('returns null and logs error if readFile throws', async () => {
    jest.spyOn(fs, 'readFile').mockRejectedValue(new Error('Simulated read failure'));

    const result = await safeReadFile('/bad/file.txt');

    expect(result).toBeNull();
    expect(errorMock).toHaveBeenCalledWith(
      expect.stringContaining('Error reading file: /bad/file.txt'),
      expect.any(Error),
    );
  });
});

describe('safeCopyFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls fsExtra.copy with correct source and destination', async () => {
    mockCopy.mockResolvedValue();

    await safeCopyFile('/path/src.txt', '/path/dest.txt');

    expect(mockCopy).toHaveBeenCalledWith('/path/src.txt', '/path/dest.txt');
    expect(errorMock).not.toHaveBeenCalled();

    mockCopy.mockRestore();
  });

  it('logs an error if fsExtra.copy throws', async () => {
    mockCopy.mockRejectedValue(new Error('Copy failed'));

    await safeCopyFile('/bad/src.txt', '/bad/dest.txt');

    expect(errorMock).toHaveBeenCalledWith(
      expect.stringContaining('Error copying file from /bad/src.txt to /bad/dest.txt'),
      expect.any(Error),
    );
  });
});

describe('safeEnsureDir', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls fsExtra.ensureDir with the correct path', async () => {
    mockEnsureDir.mockResolvedValue();

    await safeEnsureDir('/some/test/path');

    expect(mockEnsureDir).toHaveBeenCalledWith('/some/test/path');
    expect(errorMock).not.toHaveBeenCalled();

    mockEnsureDir.mockRestore();
  });

  it('logs an error if ensureDir throws', async () => {
    mockEnsureDir.mockRejectedValue(new Error('Simulated failure'));

    await safeEnsureDir('/bad/path');

    expect(errorMock).toHaveBeenCalledWith(
      expect.stringContaining('Error ensuring directory: /bad/path'),
      expect.any(Error),
    );

    mockEnsureDir.mockRestore();
  });
});

describe('safeEmptySubFolder', () => {
  const testDir = path.join(process.cwd(), 'test-temp-dir');
  const nestedFile = path.join(testDir, 'test.txt');

  beforeEach(async () => {
    await fsExtra.ensureDir(testDir);
    await fs.writeFile(nestedFile, 'temp data');
    warnMock.mockReset();
    errorMock.mockReset();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await fsExtra.remove(testDir);
  });

  it('empties a valid subdirectory', async () => {
    mockEmptyDir.mockImplementation(async (dir) => {
      await fs.rm(dir, { recursive: true, force: true });
      await fs.mkdir(dir);
    });
    const result = await safeEmptySubFolder(testDir);
    expect(result).toBe(true);
    const contents = await fs.readdir(testDir);
    expect(contents).toHaveLength(0);
  });

  it('refuses to empty "." (current directory)', async () => {
    const result = await safeEmptySubFolder('.');
    expect(result).toBe(false);
    expect(warnMock).toHaveBeenCalledWith(expect.stringContaining('Refusing to empty'));
  });

  it('refuses to empty ".." (parent directory)', async () => {
    const result = await safeEmptySubFolder('..');
    expect(result).toBe(false);
    expect(warnMock).toHaveBeenCalled();
  });

  it('refuses to empty root "/"', async () => {
    const result = await safeEmptySubFolder(path.resolve('/'));
    expect(result).toBe(false);
    expect(warnMock).toHaveBeenCalled();
  });

  it('refuses to empty path outside cwd', async () => {
    const outsideDir = path.resolve('/tmp/some-other-dir');
    const result = await safeEmptySubFolder(outsideDir);
    expect(result).toBe(false);
    expect(warnMock).toHaveBeenCalled();
  });

  it('handles fsExtra.emptyDir throwing an error', async () => {
    mockEmptyDir.mockImplementationOnce(() => {
      throw new Error('Simulated failure');
    });

    const result = await safeEmptySubFolder(testDir);
    expect(result).toBe(false);
    expect(errorMock).toHaveBeenCalledWith(
      expect.stringContaining('Error emptying'),
      expect.any(Error),
    );

    mockEmptyDir.mockRestore();
  });
});

describe('itemiseTreeFolder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a TreeItem from a directory structure with markdown and mermaid files', async () => {
    const baseFolder = '/docs';
    const dir = '/docs';
    const mdFile = 'readme.md';
    const mmdFile = 'diagram.mmd';
    const otherFile = 'image.png';

    jest.spyOn(fs, 'readdir').mockResolvedValue([mdFile, mmdFile, otherFile]);

    jest.spyOn(fs, 'stat').mockImplementation(async (_filePath) => ({
      isDirectory: () => false,
    }));

    jest.spyOn(fs, 'readFile').mockImplementation(async (filePath) => {
      if (String(filePath).endsWith('.md')) return Buffer.from('# Markdown Content');
      if (String(filePath).endsWith('.mmd')) return Buffer.from('graph TD; A-->B');
      return null;
    });

    configMock.getStrConfig.mockImplementation((key) => {
      if (key === 'homepageName') return 'Home';
      if (key === 'rootFolder') return '/docs';
      if (key === 'distFolder') return '/dist';
      return '';
    });

    configMock.getBoolConfig.mockReturnValue(false); // don't exclude other files

    const tree: TreeItem[] = [];

    const treeItem = await itemiseTreeFolder(dir, baseFolder, null, tree);

    expect(treeItem.name).toBe('Home');
    expect(treeItem.mdFiles).toHaveLength(1);
    expect(treeItem.mmdFiles).toHaveLength(1);
    expect(mockCopy).toHaveBeenCalledWith(
      path.join(dir, otherFile),
      path.join(baseFolder, '', otherFile),
    );
  });
});

describe('generateTree', () => {
  it('returns tree structure starting from baseFolder', async () => {
    const baseFolder = '/docs';

    jest.spyOn(fs, 'readdir').mockResolvedValue([]);
    jest.spyOn(fs, 'stat').mockResolvedValue({
      isDirectory: () => false,
    });
    jest.spyOn(fs, 'readFile').mockResolvedValue(Buffer.from(''));

    configMock.getStrConfig.mockImplementation((key) => {
      if (key === 'homepageName') return 'Homepage';
      if (key === 'rootFolder') return '/docs';
      return '';
    });

    configMock.getBoolConfig.mockReturnValue(true);

    const result = await generateTree(baseFolder);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Homepage');
    expect(result[0].mdFiles).toEqual([]);
  });
});
