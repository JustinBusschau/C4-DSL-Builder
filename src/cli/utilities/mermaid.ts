import { execFile } from 'child_process';
import path from 'path';
import * as fs from 'fs/promises';
import fsExtra from 'fs-extra';
import chalk from 'chalk';
import { getCurrentDir } from '../utilities/paths.js';
import { promisify } from 'util';

const __dirname = getCurrentDir(import.meta.url);
const execFileAsync = promisify(execFile);

export async function generateMermaidDiagram(
  content: string,
  outputPath: string,
): Promise<boolean> {
  const logger = console;
  const packageRoot = path.resolve(__dirname, '../../..');
  const mmdcPath = path.join(packageRoot, 'node_modules/.bin/mmdc');

  try {
    const outputDir = path.dirname(outputPath);
    await fsExtra.ensureDir(outputDir);

    const tempFile = path.join(outputDir, `temp_${Date.now()}.mmd`);
    await fs.writeFile(tempFile, content);

    logger.log(chalk.blue(`Generating Mermaid diagram: ${outputPath}`));

    await execFileAsync('node', [mmdcPath, '-i', tempFile, '-o', outputPath]);

    await fs.unlink(tempFile);

    try {
      await fs.access(outputPath);
      logger.log(chalk.green(`Successfully generated diagram: ${outputPath}`));
      return true;
    } catch (error) {
      logger.error(`Failed to generate diagram: ${outputPath}`, error);
      return false;
    }
  } catch (error) {
    logger.error(chalk.red('Error generating Mermaid diagram:'), error);
    return false;
  }
}
