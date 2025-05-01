import { createHash } from 'crypto';
import path from 'path';
import { SafeFiles } from './safe-files.js';
import { CliLogger } from './cli-logger.js';

type CacheFileData = {
  version: number;
  files: Record<string, string>;
};

export class CacheManager {
  private readonly cacheVersion = 1;
  private cache: CacheFileData = { version: this.cacheVersion, files: {} };

  constructor(
    private readonly cacheFilePath: string,
    private readonly safeFiles: SafeFiles,
    private readonly logger: CliLogger = new CliLogger(CacheManager.name),
  ) {}

  async loadCache(): Promise<void> {
    const exists = await this.safeFiles.pathExists(this.cacheFilePath);
    if (!exists) {
      this.logger.info(`No existing cache file found at ${this.cacheFilePath}`);
      return;
    }

    const raw = await this.safeFiles.readFileAsString(this.cacheFilePath);
    if (!raw) {
      this.logger.warn(`Cache file found but empty or unreadable: ${this.cacheFilePath}`);
      return;
    }

    try {
      const parsed: CacheFileData = JSON.parse(raw);
      if (parsed.version === this.cacheVersion && typeof parsed.files === 'object') {
        this.cache = parsed;
        this.logger.info(`Loaded cache from ${this.cacheFilePath}`);
      } else {
        this.logger.warn(`Cache file version mismatch or corrupt. Ignoring existing cache.`);
      }
    } catch (error) {
      this.logger.error(`Failed to parse cache file: ${this.cacheFilePath}`, error);
    }
  }

  async hasChanged(filePath: string): Promise<boolean> {
    const absPath = path.resolve(filePath);
    const content = await this.safeFiles.readFileAsString(absPath);
    if (content === null) {
      this.logger.warn(`Cannot determine if file changed: ${filePath}`);
      return true;
    }

    const currentHash = this.hashString(content);
    const cachedHash = this.cache.files[absPath];

    return cachedHash !== currentHash;
  }

  async markProcessed(filePath: string): Promise<void> {
    const absPath = path.resolve(filePath);
    const content = await this.safeFiles.readFileAsString(absPath);
    if (content === null) {
      this.logger.warn(`Cannot mark file as processed: ${filePath}`);
      return;
    }

    const currentHash = this.hashString(content);
    this.cache.files[absPath] = currentHash;
  }

  async persist(): Promise<void> {
    const serialized = JSON.stringify(this.cache, null, 2);
    await this.safeFiles.writeFile(this.cacheFilePath, serialized);
    this.logger.info(`Persisted cache to ${this.cacheFilePath}`);
  }

  private hashString(content: string): string {
    return createHash('sha256').update(content, 'utf8').digest('hex');
  }
}
