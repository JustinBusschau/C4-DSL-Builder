import path from 'path';
import fs from 'fs/promises';
import fsExtra from 'fs-extra';
import { jest } from '@jest/globals';

const warnMock = jest.fn();
const errorMock = jest.fn();

jest.unstable_mockModule('./logger.js', () => ({
  createLogger: () => ({
    warn: warnMock,
    error: errorMock,
  }),
}));

const { safeEmptySubFolder } = await import('./tree.js');

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
    const spy = jest.spyOn(fsExtra, 'emptyDir').mockImplementationOnce(() => {
      throw new Error('Simulated failure');
    });

    const result = await safeEmptySubFolder(testDir);
    expect(result).toBe(false);
    expect(errorMock).toHaveBeenCalledWith(
      expect.stringContaining('Error emptying'),
      expect.any(Error),
    );

    spy.mockRestore();
  });
});
