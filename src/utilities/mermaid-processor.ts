import path from 'path';
import chalk from 'chalk';
import { promisify } from 'util';
import { execFile } from 'child_process';
import { CliLogger } from './cli-logger.js';
import { Paths } from './paths.js';
import { SafeFiles } from './safe-files.js';

export class MermaidProcessor {
  constructor(
    private readonly safeFiles: SafeFiles = new SafeFiles(),
    private readonly paths: Paths = new Paths(),
    private readonly logger: CliLogger = new CliLogger(MermaidProcessor.name),
  ) {}

  async generateUniqueMmdFilename(directory: string): Promise<string> {
    let index = 1;
    let name = `mmd_${index}.svg`;
    let fullPath = `${directory}/${name}`;

    while (await this.safeFiles.pathExists(fullPath)) {
      index++;
      name = `mmd_${index}.svg`;
      fullPath = `${directory}/${name}`;
    }

    return name;
  }

  async diagramFromMermaidString(content: string, outputPath: string): Promise<boolean> {
    const packageRoot = path.resolve(this.paths.getPathFromMeta(import.meta.url), '../..');
    const mmdcPath = path.join(packageRoot, 'node_modules/.bin/mmdc');
    const execFileAsync = promisify(execFile);
    let tempFile: string;

    try {
      const outputDir = path.dirname(outputPath);
      await this.safeFiles.ensureDir(outputDir);

      tempFile = path.join(outputDir, `temp_${Date.now()}.mmd`);
      await this.safeFiles.writeFile(tempFile, content);

      this.logger.log(chalk.blue(`Generating Mermaid diagram: ${outputPath}`));

      await execFileAsync('node', [mmdcPath, '-i', tempFile, '-o', outputPath]);
    } catch (error) {
      this.logger.error(chalk.red('Error generating Mermaid diagram:'), error);
      return false;
    }

    // cleanup
    try {
      await this.safeFiles.removeFile(tempFile);
    } catch (error) {
      this.logger.error(`Failed to delete temporary file ${tempFile}`, error);
    }

    // validate
    try {
      await this.safeFiles.accessFile(outputPath);
      this.logger.log(chalk.green(`Successfully generated diagram: ${outputPath}`));
      return true;
    } catch (error) {
      this.logger.error(`Failed to generate diagram: ${outputPath}`, error);
      return false;
    }
  }
}
