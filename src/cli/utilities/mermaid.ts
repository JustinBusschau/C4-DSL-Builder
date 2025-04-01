import { execSync } from 'child_process';
import path from 'path';
import __dirname from '../utilities/anchor.cjs';
import * as fs from 'fs';
import fsExtra from 'fs-extra';
import chalk from 'chalk';

export async function generateMermaidDiagram(content: string, outputPath: string) {
  try {
    const packageRoot = path.resolve(__dirname, '../../..');

    // Ensure output directory exists
    await fsExtra.ensureDir(path.dirname(outputPath));

    // Create a temporary .mmd file
    const tempFile = path.join(path.dirname(outputPath), `temp_${Date.now()}.mmd`);
    fs.writeFileSync(tempFile, content);

    console.log(chalk.blue(`Generating Mermaid diagram: ${outputPath}`));

    // Escape paths with spaces
    const escapedTempFile = `"${tempFile}"`;
    const escapedOutputPath = `"${outputPath}"`;
    execSync(
      `node ${path.join(packageRoot, 'node_modules/.bin/mmdc')} -i ${escapedTempFile} -o ${escapedOutputPath}`,
    );

    // Clean up temp file
    fs.unlinkSync(tempFile);

    if (fs.existsSync(outputPath)) {
      console.log(chalk.green(`Successfully generated diagram: ${outputPath}`));
      return true;
    } else {
      console.error(chalk.red(`Failed to generate diagram: ${outputPath}`));
      return false;
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(chalk.red('Error generating Mermaid diagram:', error.message));
    }
    return false;
  }
}
