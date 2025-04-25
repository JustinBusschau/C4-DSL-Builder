import { BuildConfig } from '../types/build-config.js';
import { CliLogger } from './cli-logger.js';
import { SafeFiles } from './safe-files.js';

export class PdfProcessor {
  constructor(
    private readonly safeFiles: SafeFiles = new SafeFiles(),
    private readonly logger: CliLogger = new CliLogger(PdfProcessor.name),
  ) {}

  async preparePdf(buildConfig: BuildConfig): Promise<void> {
    this.logger.log(`We have a PDF processor ... ${buildConfig.projectName}`);
  }
}
