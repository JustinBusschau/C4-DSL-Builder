import { describe, it, expect, beforeEach, vi, afterEach, type Mock } from 'vitest';

const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn(),
};

vi.mock('fs-extra', () => {
  return {
    default: {
      pathExists: vi.fn(),
      mkdirp: vi.fn(),
      emptyDir: vi.fn(),
      copy: vi.fn(),
      ensureDir: vi.fn(),
    },
  };
});

vi.mock('fs', () => {
  return {
    promises: {
      unlink: vi.fn(),
      access: vi.fn(),
      readdir: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn(),
      stat: vi.fn(),
    },
  };
});

vi.mock('./cli-logger.js', () => ({
  CliLogger: vi.fn(() => mockLogger),
}));

import fsExtra from 'fs-extra';
import { promises as fs, Stats } from 'fs';
import { CliLogger } from './cli-logger.js';
import { SafeFiles } from './safe-files.js';

describe('SafeFiles', () => {
  let logger: CliLogger;
  let safeFiles: SafeFiles;
  const fsError = new Error('FS Error');

  beforeEach(() => {
    logger = new CliLogger('SafeFiles.test', 'debug');
    safeFiles = new SafeFiles(logger);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('getFolderName should return homepage if dir matches root', () => {
    const result = safeFiles.getFolderName('/base', '/base', 'index');
    expect(result).toBe('index');
  });

  it('getFolderName should return folder name if dir != root', () => {
    const result = safeFiles.getFolderName('/base/sub', '/base', 'index');
    expect(result).toBe('sub');
  });

  it('pathExists should return true if path exists', async () => {
    (fsExtra.pathExists as Mock).mockResolvedValue(true);
    const result = await safeFiles.pathExists('/some/path');
    expect(result).toBe(true);
  });

  it('pathExists should log and return false on error', async () => {
    (fsExtra.pathExists as Mock).mockRejectedValue(fsError);
    const result = await safeFiles.pathExists('/bad/path');
    expect(result).toBe(false);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error checking file existence'),
      fsError,
    );
  });

  it('createDir should call mkdirp', async () => {
    await safeFiles.createDir('/some/new/path');
    expect(fsExtra.mkdirp).toHaveBeenCalledWith('/some/new/path');
  });

  it('createDir should fail gracefully with log', async () => {
    (fsExtra.mkdirp as Mock).mockRejectedValue(fsError);
    await safeFiles.createDir('/some/new/path');
    expect(fsExtra.mkdirp).toHaveBeenCalledWith('/some/new/path');
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error creating directory'),
      fsError,
    );
  });

  it('emptySubFolder should not empty paths outside cwd', async () => {
    const result = await safeFiles.emptySubFolder('/etc/passwd');
    expect(result).toBe(false);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Refusing to empty non-subdirectory path'),
    );
  });

  it('emptySubFolder should empty paths inside cwd', async () => {
    const dir = `${process.cwd()}/subfolder`;
    (fsExtra.emptyDir as Mock).mockResolvedValue(true);
    const result = await safeFiles.emptySubFolder(dir);
    expect(result).toBe(true);
  });

  it('emptySubFolder should fail gracefully and log if emptyDir throws', async () => {
    const dir = `${process.cwd()}/subfolder`;
    (fsExtra.emptyDir as Mock).mockRejectedValue(fsError);
    const result = await safeFiles.emptySubFolder(dir);
    expect(result).toBe(false);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error emptying directory'),
      fsError,
    );
  });

  it('copyFile should copy files', async () => {
    await safeFiles.copyFile('/src/file.txt', '/dest/file.txt');
    expect(fsExtra.copy).toHaveBeenCalledWith('/src/file.txt', '/dest/file.txt');
  });

  it('copyFile should log error on failure', async () => {
    (fsExtra.copy as Mock).mockRejectedValue(fsError);
    await safeFiles.copyFile('/bad/src', '/bad/dest');
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error copying file from'),
      fsError,
    );
  });

  it('removeFile should call fs.unlink', async () => {
    await safeFiles.removeFile('/some/file.txt');
    expect(fs.unlink).toHaveBeenCalledWith('/some/file.txt');
  });

  it('removeFile should log error on failure', async () => {
    (fs.unlink as Mock).mockRejectedValue(fsError);
    await safeFiles.removeFile('/bad/file.txt');
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error removing file'),
      fsError,
    );
  });

  it('accessFile should call fs.access', async () => {
    await safeFiles.accessFile('/some/file.txt');
    expect(fs.access).toHaveBeenCalledWith('/some/file.txt');
  });

  it('accessFile should log error on failure', async () => {
    (fs.access as Mock).mockRejectedValue(fsError);
    await safeFiles.accessFile('/inaccessible/file.txt');
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error accessing file'),
      fsError,
    );
  });

  it('readDir should filter out underscore-prefixed files', async () => {
    (fs.readdir as Mock).mockResolvedValue(['a.md', '_hidden.md']);
    const result = await safeFiles.readDir('/some/dir');
    expect(result).toEqual(['a.md']);
  });

  it('readDir should log and return empty array on error', async () => {
    (fs.readdir as Mock).mockRejectedValue(fsError);
    const result = await safeFiles.readDir('/bad/dir');
    expect(result).toEqual([]);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error reading directory'),
      fsError,
    );
  });

  it('readFileAsString should read file content', async () => {
    (fs.readFile as Mock).mockResolvedValue('hello world');
    const result = await safeFiles.readFileAsString('/file.txt');
    expect(result).toBe('hello world');
  });

  it('readFileAsString should log and return null on error', async () => {
    (fs.readFile as Mock).mockRejectedValue(fsError);
    const result = await safeFiles.readFileAsString('/bad/file.txt');
    expect(result).toBeNull();
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error reading file'),
      fsError,
    );
  });

  it('writeFile should call fs.writeFile', async () => {
    await safeFiles.writeFile('/file.txt', 'data');
    expect(fs.writeFile).toHaveBeenCalledWith('/file.txt', 'data');
  });

  it('writeFile should log error on failure', async () => {
    (fs.writeFile as Mock).mockRejectedValue(fsError);
    await safeFiles.writeFile('/bad/file.txt', 'oops');
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error writing file'),
      fsError,
    );
  });

  it('stat should return file stats', async () => {
    const fakeStats = { isDirectory: () => false } as unknown as Stats;
    (fs.stat as Mock).mockResolvedValue(fakeStats);
    const result = await safeFiles.stat('/file.txt');
    expect(result).toEqual(fakeStats);
  });

  it('stat should return null and log error on failure', async () => {
    (fs.stat as Mock).mockRejectedValue(fsError);
    const result = await safeFiles.stat('/bad/stat.txt');
    expect(result).toBeNull();
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error getting stats for file'),
      fsError,
    );
  });

  it('ensureDir should ensure directory exists', async () => {
    await safeFiles.ensureDir('/some/dir');
    expect(fsExtra.ensureDir).toHaveBeenCalledWith('/some/dir');
  });

  it('ensureDir should log error on failure', async () => {
    (fsExtra.ensureDir as Mock).mockRejectedValue(fsError);
    await safeFiles.ensureDir('/bad/dir');
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error ensuring directory'),
      fsError,
    );
  });
});

describe('SafeFiles generateTree', () => {
  let safeFiles: SafeFiles;
  const fsError = new Error('FS Error');

  beforeEach(() => {
    safeFiles = new SafeFiles(new CliLogger('SafeFiles.test'));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const makeStats = (isDir: boolean): Stats => ({ isDirectory: () => isDir }) as Stats;

  it('should build a tree with markdown and mermaid files', async () => {
    (fs.readdir as Mock).mockResolvedValue(['a.md', 'b.mmd']);
    (fs.stat as Mock).mockResolvedValue(makeStats(false));
    (fs.readFile as Mock).mockImplementation(async (file: string) => {
      if (file.endsWith('.md')) return '# Hello';
      if (file.endsWith('.mmd')) return 'graph TD;';
    });

    const tree = await safeFiles.generateTree('/docs', '/docs', 'home');

    expect(tree).toHaveLength(1);
    const root = tree[0];
    expect(root.name).toBe('home');
    expect(root.mdFiles).toEqual([{ name: 'a.md', content: '# Hello' }]);
    expect(root.mmdFiles).toEqual([{ name: 'b.mmd', content: 'graph TD;' }]);
  });

  it('should recurse into subdirectories and aggregate tree items', async () => {
    (fs.readdir as Mock).mockImplementation(async (dir) => {
      if (dir.endsWith('docs')) return ['subfolder'];
      if (dir.endsWith('subfolder')) return ['nested.md'];
      return [];
    });

    (fs.stat as Mock).mockImplementation(async (filePath) => {
      if (filePath.includes('subfolder')) return makeStats(true);
      return makeStats(false);
    });

    (fs.readFile as Mock).mockResolvedValue('# Nested content');

    const tree = await safeFiles.generateTree('/docs', '/docs', 'home');
    expect(tree.length).toBe(2); // subfolder first, then root
    const subItem = tree.find((t) => t.name === 'subfolder');
    expect(subItem?.mdFiles[0].name).toBe('nested.md');
  });

  it('should skip files if stat fails and log error', async () => {
    (fs.readdir as Mock).mockResolvedValue(['a.md']);
    (fs.stat as Mock).mockRejectedValue(fsError);
    const tree = await safeFiles.generateTree('/docs', '/docs', 'home');
    expect(tree).toHaveLength(0);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error getting stats for file'),
      fsError,
    );
  });

  it('should not include empty folders in the tree', async () => {
    (fs.readdir as Mock).mockResolvedValue([]);
    const tree = await safeFiles.generateTree('/empty', '/empty', 'home');
    expect(tree).toHaveLength(0);
  });

  it('should ignore .md files starting with underscore', async () => {
    (fs.readdir as Mock).mockResolvedValue(['_hidden.md']);
    (fs.stat as Mock).mockResolvedValue(makeStats(false));
    (fs.readFile as Mock).mockResolvedValue('# Hidden');
    const tree = await safeFiles.generateTree('/docs', '/docs', 'home');
    expect(tree).toHaveLength(0);
  });

  it('should log errors if readFile fails for markdown or mermaid', async () => {
    (fs.readdir as Mock).mockResolvedValue(['bad.md', 'bad.mmd']);
    (fs.stat as Mock).mockResolvedValue(makeStats(false));
    (fs.readFile as Mock).mockRejectedValue(fsError);
    const tree = await safeFiles.generateTree('/docs', '/docs', 'home');
    expect(tree).toHaveLength(0);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error reading file'),
      fsError,
    );
  });

  it('should call ensureDir when recursing into subfolders', async () => {
    (fs.readdir as Mock).mockImplementation(async (dir) => {
      if (dir === '/docs') return ['sub'];
      if (dir === '/docs/sub') return ['file.md'];
      return [];
    });

    (fs.stat as Mock).mockImplementation(async (filePath) => {
      if (filePath === '/docs/sub') return makeStats(true);
      return makeStats(false);
    });

    (fs.readFile as Mock).mockResolvedValue('# Content');

    const tree = await safeFiles.generateTree('/docs', '/docs', 'home');
    expect(fsExtra.ensureDir).toHaveBeenCalledWith('/docs/sub');
    expect(tree).toHaveLength(2);
  });
});
