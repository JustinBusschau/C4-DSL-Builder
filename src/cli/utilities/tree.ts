import path from 'path';
import fsExtra from 'fs-extra';
import { createLogger } from './logger.js';

export async function safeEmptySubFolder(dir: string): Promise<boolean> {
  const logger = createLogger();
  const resolvedDir = path.resolve(dir);
  const cwd = process.cwd();

  if (!resolvedDir.startsWith(cwd + path.sep)) {
    logger.warn(`Refusing to empty non-subdirectory path: ${resolvedDir}`);
    return false;
  }

  try {
    await fsExtra.emptyDir(dir);
    return true;
  } catch (error) {
    logger.error(`Error emptying directory: ${dir}`, error);
    return false;
  }
}
