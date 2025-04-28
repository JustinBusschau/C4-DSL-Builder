import { OutputType, ProcessorBase } from './processor-base.js';
import { SafeFiles } from './safe-files.js';
import { CliLogger } from './cli-logger.js';
import { MermaidProcessor } from './mermaid-processor.js';
import { BuildConfig } from '../types/build-config.js';
import chalk from 'chalk';
import { TreeItem } from '../types/tree-item.js';

export class SiteProcessor extends ProcessorBase {
  constructor(
    protected readonly safeFiles: SafeFiles = new SafeFiles(),
    protected readonly logger: CliLogger = new CliLogger(SiteProcessor.name),
    protected readonly mermaid: MermaidProcessor = new MermaidProcessor(),
  ) {
    super(safeFiles, logger, mermaid);
  }

  async generateSiteFromTree(tree: TreeItem[], buildConfig: BuildConfig): Promise<void> {
    buildConfig.embedMermaidDiagrams = false;

    const SITE = this.generateDocumentHeader(tree, buildConfig);
    console.log(SITE);
  }

  async prepareSite(buildConfig: BuildConfig): Promise<void> {
    if (!(await this.prepareOutputFolder(OutputType.site, buildConfig))) {
      this.logger.warn('Output folder preparation failed.');
      return;
    }

    const tree = await this.generateSourceTree(buildConfig);
    await this.generateSiteFromTree(tree, buildConfig);

    this.logger.log(chalk.green(`\nSITE documentation generated successfully!`));
  }
}
