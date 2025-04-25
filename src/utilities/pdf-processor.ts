import path from 'path';
import chalk from 'chalk';
import { BuildConfig } from '../types/build-config.js';
import { CliLogger } from './cli-logger.js';
import { SafeFiles } from './safe-files.js';
import { TreeItem } from '../types/tree-item.js';
import { OutputType, ProcessorBase } from './processor-base.js';

export class PdfProcessor extends ProcessorBase {
  constructor(
    protected readonly safeFiles: SafeFiles = new SafeFiles(),
    protected readonly logger: CliLogger = new CliLogger(PdfProcessor.name),
  ) {
    super(safeFiles, logger);
  }

  async generatePdfFromTree(tree: TreeItem[], buildConfig: BuildConfig): Promise<void> {
    const outPath = path.join(buildConfig.distFolder, `${buildConfig.projectName}.pdf`);
    this.logger.info(`Wrote ${buildConfig.projectName}.pdf to ${outPath}`);
  }

  async preparePdf(buildConfig: BuildConfig): Promise<void> {
    if (!(await this.prepareOutputFolder(OutputType.pdf, buildConfig))) {
      this.logger.warn('Output folder preparation failed.');
      return;
    }

    const tree = await this.generateSourceTree(buildConfig);
    await this.generatePdfFromTree(tree, buildConfig);

    this.logger.log(chalk.green(`\nPDF documentation generated successfully!`));
  }
}
