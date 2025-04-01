jest.mock('./logger.js');

import { promises as fs } from 'fs';
import fsExtra from 'fs-extra';
import {
  generateTree,
  safeReadDir,
  safeStat,
  safeReadFile,
  safeCopyFile,
  safeEnsureDir,
} from './tree';
import Configstore from 'configstore';
import { logger as mockLogger } from './logger';

jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    stat: jest.fn(),
    readFile: jest.fn(),
  },
}));

jest.mock('fs-extra', () => ({
  copy: jest.fn(),
  ensureDir: jest.fn(),
}));

describe('tree.ts', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('safeReadDir', () => {
    it('should return filtered directory contents', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue(['file1.md', '_file2.md', 'file3.mmd']);
      const result = await safeReadDir('/test/dir');
      expect(result).toEqual(['file1.md', 'file3.mmd']);
    });

    it('should log an error and return an empty array on failure', async () => {
      (fs.readdir as jest.Mock).mockRejectedValue(new Error('Permission denied'));
      const result = await safeReadDir('/test/dir');
      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error reading directory /test/dir: Permission denied',
      );
    });
  });

  describe('safeStat', () => {
    it('should return file stats', async () => {
      const mockStats = { isDirectory: () => true };
      (fs.stat as jest.Mock).mockResolvedValue(mockStats);
      const result = await safeStat('/test/file');
      expect(result).toEqual(mockStats);
    });

    it('should log an error and return null on failure', async () => {
      (fs.stat as jest.Mock).mockRejectedValue(new Error('File not found'));
      const result = await safeStat('/test/file');
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error getting stats for file /test/file: File not found',
      );
    });
  });

  describe('safeReadFile', () => {
    it('should return file contents', async () => {
      const mockBuffer = Buffer.from('file contents');
      (fs.readFile as jest.Mock).mockResolvedValue(mockBuffer);
      const result = await safeReadFile('/test/file.md');
      expect(result).toEqual(mockBuffer);
    });

    it('should log an error and return null on failure', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('Permission denied'));
      const result = await safeReadFile('/test/file.md');
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error reading file /test/file.md: Permission denied',
      );
    });
  });

  describe('safeCopyFile', () => {
    it('should copy a file successfully', async () => {
      await safeCopyFile('/src/file', '/dest/file');
      expect(fsExtra.copy).toHaveBeenCalledWith('/src/file', '/dest/file');
    });

    it('should log an error on failure', async () => {
      (fsExtra.copy as jest.Mock).mockRejectedValue(new Error('Copy failed'));
      await safeCopyFile('/src/file', '/dest/file');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error copying file from /src/file to /dest/file: Copy failed',
      );
    });
  });

  describe('safeEnsureDir', () => {
    it('should ensure a directory exists', async () => {
      await safeEnsureDir('/test/dir');
      expect(fsExtra.ensureDir).toHaveBeenCalledWith('/test/dir');
    });

    it('should log an error on failure', async () => {
      (fsExtra.ensureDir as jest.Mock).mockRejectedValue(new Error('Ensure failed'));
      await safeEnsureDir('/test/dir');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error ensuring directory /test/dir: Ensure failed',
      );
    });
  });

  describe('generateTree', () => {
    type ConfigKeys =
      | 'rootFolder'
      | 'homepageName'
      | 'distFolder'
      | 'excludeOtherFiles'
      | 'generateCompleteMdFile';
    type ConfigValues = string | boolean;

    const mockConfigstore = {
      get: jest.fn() as jest.Mock<(key: ConfigKeys) => ConfigValues>,
    } as unknown as Configstore;

    beforeEach(() => {
      (mockConfigstore.get as jest.Mock).mockImplementation((key: ConfigKeys) => {
        const config = {
          rootFolder: '/root',
          homepageName: 'Home',
          distFolder: '/dist',
          excludeOtherFiles: false,
          generateCompleteMdFile: false,
        };
        return config[key];
      });
    });

    it('should generate a tree structure for a directory', async () => {
      (fs.readdir as jest.Mock)
        .mockResolvedValueOnce(['subdir', 'file1.md', 'file2.mmd'])
        .mockResolvedValueOnce(['nested.md']);
      (fs.stat as jest.Mock)
        .mockResolvedValueOnce({ isDirectory: () => true })
        .mockResolvedValueOnce({ isDirectory: () => false })
        .mockResolvedValueOnce({ isDirectory: () => false })
        .mockResolvedValueOnce({ isDirectory: () => false });
      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('file contents'));

      const tree = await generateTree('/root', mockConfigstore);

      expect(tree).toEqual([
        {
          dir: '/root',
          name: 'Home',
          level: 1,
          parent: null,
          mdFiles: [Buffer.from('file contents')],
          mmdFiles: [{ name: 'file2.mmd', content: 'file contents' }],
          descendants: ['subdir'],
        },
        {
          dir: '/root/subdir',
          name: 'subdir',
          level: 2,
          parent: '/root',
          mdFiles: [Buffer.from('file contents')],
          mmdFiles: [],
          descendants: [],
        },
      ]);
    });

    it('should handle empty directories gracefully', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue([]);
      const tree = await generateTree('/root', mockConfigstore);
      expect(tree).toEqual([
        {
          dir: '/root',
          name: 'Home',
          level: 1,
          parent: null,
          mdFiles: [],
          mmdFiles: [],
          descendants: [],
        },
      ]);
    });
  });
});
