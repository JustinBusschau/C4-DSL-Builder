import { getStrConfig, getBoolConfig } from '../utilities/config.js';
import path from 'path';
import { logger } from '../utilities/logger.js';
import chalk from 'chalk';
import { safeEmptyDir, generateTree } from '../utilities/tree.js';
import { generateMermaidDiagram } from '../utilities/mermaid.js';
import { generateMD, generateSingleMD } from '../utilities/markdown.js';

export async function cmdMd() {
  const targetFolder = path.join(getStrConfig('distFolder'));

  if (targetFolder === 'undefined') {
    logger.error('Please run `config` before attempting to run `md`.');
    return;
  }

  if (!(await safeEmptyDir(targetFolder))) {
    logger.error(`Failed to empty the target folder: ${targetFolder}`);
    return;
  }

  logger.log(chalk.green(`\nBuilding Markdown documentation in ./${targetFolder}`));

  // TODO: Refactor from here down...
  const tree = await generateTree(getStrConfig('rootFolder'));

  logger.log(chalk.blue(`Parsed ${tree.length} folders.\nGenerating inline Mermaid diagrams`));
  for (const item of tree) {
    for (const mdFile of item.mdFiles) {
      const content = mdFile.toString();
      const mermaidBlocks = /```mermaid\n([\s\S]*?)```/g.exec(content);

      if (mermaidBlocks) {
        console.log(chalk.blue(`Found ${mermaidBlocks.length} Mermaid diagrams in ${item.dir}`));

        for (let i = 0; i < mermaidBlocks.length; i++) {
          const block = mermaidBlocks[i];
          const diagramContent = block.replace(/```mermaid\n/, '').replace(/```$/, '');
          const outputPath = path.join(
            getStrConfig('distFolder'),
            item.dir.replace(getStrConfig('rootFolder'), ''),
            `${path.basename(item.dir)}_${i}.svg`,
          );

          await generateMermaidDiagram(diagramContent, outputPath);
        }
      }
    }
  }

  if (getBoolConfig('generateCompleteMdFile')) {
    await generateSingleMD(tree);
  } else {
    await generateMD(tree);
  }
  logger.log(chalk.green(`\nMarkdown documentation generated successfully!`));
}
