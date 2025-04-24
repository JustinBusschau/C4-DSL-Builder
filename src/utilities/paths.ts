import path from 'path';
import { fileURLToPath } from 'url';
import { CliLogger } from './cli-logger.js';

export class Paths {
  logger: CliLogger;

  constructor() {
    this.logger = new CliLogger(Paths.name);
  }

  getPathFromMeta(metaUrl: string): string {
    if (!metaUrl.startsWith('file://')) {
      this.logger.error(`An invalid path given for getPathFromMeta: ${metaUrl}`);
      throw new Error('Must be a file URL');
    }

    return path.dirname(fileURLToPath(metaUrl));
  }
}
