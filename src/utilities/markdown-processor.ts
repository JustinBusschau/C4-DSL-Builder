import path from 'path';
import { BuildConfig } from '../types/build-config.js';
import chalk from 'chalk';
import { SafeFiles } from './safe-files.js';
import { CliLogger } from './cli-logger.js';
import { TreeItem } from '../types/tree-item.js';
import { OutputType, ProcessorBase } from './processor-base.js';

import { MermaidProcessor } from './mermaid-processor.js';

export class MarkdownProcessor extends ProcessorBase {
  constructor(
    protected readonly safeFiles: SafeFiles = new SafeFiles(),
    protected readonly logger: CliLogger = new CliLogger(MarkdownProcessor.name),
    protected readonly mermaid: MermaidProcessor = new MermaidProcessor(),
  ) {
    super(safeFiles, logger, mermaid);
  }

  async generateMarkdownFromTree(tree: TreeItem[], buildConfig: BuildConfig): Promise<void> {
    let MD = this.generateDocumentHeader(tree, buildConfig);
    MD += await this.buildDocumentBody(tree, buildConfig);

    const outPath = path.join(buildConfig.distFolder, 'README.md');
    try {
      await this.safeFiles.writeFile(outPath, MD);
      this.logger.info(`Wrote README.md to ${outPath}`);
    } catch (err) {
      this.logger.error(`Failed to write README.md`, err);
    }
  }

  async prepareMarkdown(buildConfig: BuildConfig): Promise<void> {
    console.log('7');
    console.log(buildConfig);
    if (!(await this.prepareOutputFolder(OutputType.md, buildConfig))) {
      this.logger.warn('Output folder preparation failed.');
      return;
    }

    const tree = await this.generateSourceTree(buildConfig);
    await this.generateMarkdownFromTree(tree, buildConfig);

    this.logger.log(chalk.green(`\nMarkdown documentation generated successfully!`));
  }
}
