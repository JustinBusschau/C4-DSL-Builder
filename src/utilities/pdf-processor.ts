import path from 'path';
import chalk from 'chalk';
import { BuildConfig } from '../types/build-config.js';
import { CliLogger } from './cli-logger.js';
import { SafeFiles } from './safe-files.js';
import { TreeItem } from '../types/tree-item.js';
import { OutputType, ProcessorBase } from './processor-base.js';
import { mdToPdf } from 'md-to-pdf';

import { MermaidProcessor } from './mermaid-processor.js';

export class PdfProcessor extends ProcessorBase {
  constructor(
    protected readonly safeFiles: SafeFiles = new SafeFiles(),
    protected readonly logger: CliLogger = new CliLogger(PdfProcessor.name),
    protected readonly mermaid: MermaidProcessor = new MermaidProcessor(),
  ) {
    super(safeFiles, logger, mermaid);
  }

  async generatePdfFromTree(tree: TreeItem[], buildConfig: BuildConfig): Promise<void> {
    buildConfig.embedMermaidDiagrams = false;

    let PDF = this.generateDocumentHeader(tree, buildConfig);
    PDF += await this.buildDocumentBody(tree, buildConfig);

    // temp MD file
    const tmpPath = path.join(buildConfig.distFolder, `${buildConfig.projectName}_TEMP.md`);
    const outPath = path.join(buildConfig.distFolder, `${buildConfig.projectName}.pdf`);
    try {
      await this.safeFiles.writeFile(tmpPath, PDF);
    } catch (err) {
      this.logger.error(`Failed to write temporary file ${buildConfig.projectName}_TEMP.md`, err);
    }

    try {
      await mdToPdf(
        {
          path: tmpPath,
        },
        {
          stylesheet: [buildConfig.pdfCss],
          pdf_options: {
            scale: 1,
            displayHeaderFooter: false,
            printBackground: true,
            landscape: false,
            pageRanges: '',
            format: 'A4',
            width: '',
            height: '',
            margin: {
              top: '1.5cm',
              right: '1cm',
              bottom: '1cm',
              left: '1cm',
            },
          },
          dest: outPath,
        },
      );
      this.logger.info(`Wrote ${buildConfig.projectName}.pdf to ${outPath}`);
    } catch (error) {
      this.logger.error(`Error creating PDF output file: ${outPath}`, error);
      return;
    }

    try {
      await this.safeFiles.removeFile(tmpPath);
    } catch (error) {
      this.logger.error(`Failed to remove temporary file ${tmpPath}`, error);
    }
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
