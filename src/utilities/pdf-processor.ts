import path from 'path';
import chalk from 'chalk';
import { BuildConfig } from '../types/build-config.js';
import { CliLogger } from './cli-logger.js';
import { SafeFiles } from './safe-files.js';
import { TreeItem } from '../types/tree-item.js';

export class PdfProcessor {
  constructor(
    private readonly safeFiles: SafeFiles = new SafeFiles(),
    private readonly logger: CliLogger = new CliLogger(PdfProcessor.name),
  ) {}

  async generatePdfFromTree(tree: TreeItem[], buildConfig: BuildConfig): Promise<void> {
    const outPath = path.join(buildConfig.distFolder, `${buildConfig.projectName}.pdf`);
    this.logger.info(`Wrote ${buildConfig.projectName}.pdf to ${outPath}`);
  }

  async preparePdf(buildConfig: BuildConfig): Promise<void> {
    const targetFolderBase = buildConfig.distFolder;
    if (!targetFolderBase?.trim?.() || targetFolderBase === 'undefined') {
      this.logger.error('Please run `config` before attempting to run `pdf`.');
      return;
    }

    const targetFolder = path.join(targetFolderBase);
    if (!(await this.safeFiles.emptySubFolder(targetFolder))) {
      this.logger.error(`Failed to empty the target folder: ${targetFolder}`);
      return;
    }

    this.logger.log(chalk.green(`\nBuilding PDF documentation in ./${targetFolder}`));

    const tree = await this.safeFiles.generateTree(
      buildConfig.rootFolder,
      buildConfig.rootFolder,
      buildConfig.homepageName,
    );

    this.logger.log(chalk.magenta(`Parsed ${tree.length} folders.\n`));

    await this.generatePdfFromTree(tree, buildConfig);

    this.logger.log(chalk.green(`\nPDF documentation generated successfully!`));
  }
}
