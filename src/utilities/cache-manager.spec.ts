import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

import { CacheManager } from './cache-manager.js';
import { SafeFiles } from './safe-files.js';
import { CliLogger } from './cli-logger.js';

const TEST_FILE_NAME = 'test.md';
const TEST_FILE_CONTENT = '# Hello\n\nThis is a test.';
const UPDATED_FILE_CONTENT = '# Hello again\n\nThis has changed.';
const CACHE_FILENAME = '.c4dslbuilder.cache.json';

describe('CacheManager', () => {
  let tmpDir: string;
  let testFilePath: string;
  let cachePath: string;
  let safeFiles: SafeFiles;
  let logger: CliLogger;
  let cacheManager: CacheManager;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cachemanager-test-'));
    testFilePath = path.join(tmpDir, TEST_FILE_NAME);
    cachePath = path.join(tmpDir, CACHE_FILENAME);
    await fs.writeFile(testFilePath, TEST_FILE_CONTENT);

    logger = new CliLogger('TestLogger');
    vi.spyOn(logger, 'info').mockImplementation(() => {});
    vi.spyOn(logger, 'warn').mockImplementation(() => {});
    vi.spyOn(logger, 'error').mockImplementation(() => {});
    safeFiles = new SafeFiles(logger);

    cacheManager = new CacheManager(cachePath, safeFiles, logger);
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
    vi.restoreAllMocks();
  });

  it('should detect unchanged file after marking it processed', async () => {
    await cacheManager.loadCache();

    let changed = await cacheManager.hasChanged(testFilePath);
    expect(changed).toBe(true); // no cache yet

    await cacheManager.markProcessed(testFilePath);
    await cacheManager.persist();

    const freshManager = new CacheManager(cachePath, safeFiles, logger);
    await freshManager.loadCache();

    changed = await freshManager.hasChanged(testFilePath);
    expect(changed).toBe(false); // file unchanged
  });

  it('should detect changed file content after update', async () => {
    await cacheManager.loadCache();
    await cacheManager.markProcessed(testFilePath);
    await cacheManager.persist();

    await fs.writeFile(testFilePath, UPDATED_FILE_CONTENT);

    const freshManager = new CacheManager(cachePath, safeFiles, logger);
    await freshManager.loadCache();

    const changed = await freshManager.hasChanged(testFilePath);
    expect(changed).toBe(true); // file changed
  });

  it('should handle missing cache file gracefully', async () => {
    expect(await fs.pathExists(cachePath)).toBe(false);
    await cacheManager.loadCache(); // should not throw
  });

  it('should skip cache if file is unreadable', async () => {
    await cacheManager.loadCache();
    await fs.remove(testFilePath); // delete it
    const changed = await cacheManager.hasChanged(testFilePath);
    expect(changed).toBe(true);
  });

  it('should write a valid cache file to disk', async () => {
    await cacheManager.markProcessed(testFilePath);
    await cacheManager.persist();

    const fileExists = await fs.pathExists(cachePath);
    expect(fileExists).toBe(true);

    const raw = await fs.readFile(cachePath, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed).toHaveProperty('version', 1);
    expect(parsed.files).toHaveProperty(path.resolve(testFilePath));
  });

  it('should warn if cache file is empty', async () => {
    await fs.writeFile(cachePath, '');
    const warnSpy = vi.spyOn(logger, 'warn');

    await cacheManager.loadCache();

    expect(warnSpy).toHaveBeenCalledWith(`Cache file found but empty or unreadable: ${cachePath}`);
  });

  it('should warn if cache file has version mismatch or corrupt structure', async () => {
    const corruptData = JSON.stringify({ version: 999, data: {} });
    await fs.writeFile(cachePath, corruptData);
    const warnSpy = vi.spyOn(logger, 'warn');

    await cacheManager.loadCache();

    expect(warnSpy).toHaveBeenCalledWith(
      'Cache file version mismatch or corrupt. Ignoring existing cache.',
    );
  });

  it('should log error if cache file JSON is malformed', async () => {
    await fs.writeFile(cachePath, '{ this is not valid JSON');
    const errorSpy = vi.spyOn(logger, 'error');

    await cacheManager.loadCache();

    expect(errorSpy).toHaveBeenCalledWith(
      `Failed to parse cache file: ${cachePath}`,
      expect.any(SyntaxError),
    );
  });

  it('should warn if file is null when marking as processed', async () => {
    const invalidPath = path.join(tmpDir, 'non-existent.md');
    const warnSpy = vi.spyOn(logger, 'warn');

    await cacheManager.markProcessed(invalidPath);

    expect(warnSpy).toHaveBeenCalledWith(`Cannot mark file as processed: ${invalidPath}`);
  });

  it('should log error if persisting cache fails', async () => {
    const errorSpy = vi.spyOn(logger, 'error');

    // Simulate failure by setting directory as file
    await fs.writeFile(cachePath, 'I am not a dir');
    const badPath = path.join(cachePath, 'not-allowed.json');
    const badManager = new CacheManager(badPath, safeFiles, logger);

    await badManager.markProcessed(testFilePath); // should succeed
    await badManager.persist(); // will fail

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error writing file:'),
      expect.any(Error),
    );
  });
});
