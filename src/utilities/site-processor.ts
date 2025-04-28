import { OutputType, ProcessorBase } from './processor-base.js';
import { SafeFiles } from './safe-files.js';
import { CliLogger } from './cli-logger.js';
import { MermaidProcessor } from './mermaid-processor.js';
import { BuildConfig } from '../types/build-config.js';
import chalk from 'chalk';

export class SiteProcessor extends ProcessorBase {
  constructor(
    protected readonly safeFiles: SafeFiles = new SafeFiles(),
    protected readonly logger: CliLogger = new CliLogger(SiteProcessor.name),
    protected readonly mermaid: MermaidProcessor = new MermaidProcessor(),
  ) {
    super(safeFiles, logger, mermaid);
  }

  async prepareSite(buildConfig: BuildConfig): Promise<void> {
    if (!(await this.prepareOutputFolder(OutputType.site, buildConfig))) {
      this.logger.warn('Output folder preparation failed.');
      return;
    }

    const tree = await this.generateSourceTree(buildConfig);
    console.log(tree.length);

    this.logger.log(chalk.green(`\nSITE documentation generated successfully!`));
  }
}
