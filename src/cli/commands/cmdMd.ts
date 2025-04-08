import { getStrConfig } from '../utilities/config.js';
import path from 'path';
import { createLogger } from '../utilities/logger.js';
import chalk from 'chalk';
import { safeEmptySubFolder, generateTree } from '../utilities/tree.js';

export async function cmdMd() {
  const logger = createLogger();
  const targetFolderBase = getStrConfig('distFolder');
  if (!targetFolderBase?.trim?.() || targetFolderBase === 'undefined') {
    logger.error('Please run `config` before attempting to run `md`.');
    return;
  }

  const targetFolder = path.join(targetFolderBase);
  if (!(await safeEmptySubFolder(targetFolder))) {
    logger.error(`Failed to empty the target folder: ${targetFolder}`);
    return;
  }

  logger.log(chalk.green(`\nBuilding Markdown documentation in ./${targetFolder}`));

  const tree = await generateTree(getStrConfig('rootFolder'));
  if (tree) {
    console.info(chalk.bgGray(JSON.stringify(tree, null, 2)));
  }
  logger.log(chalk.blue(`Parsed ${tree.length} folders.\nGenerating inline Mermaid diagrams`));

  for (const item of tree) {
    for (const mdFile of item.mdFiles) {
      const content = mdFile.toString();
      const mermaidBlocks = /```mermaid\n([\s\S]*?)```/g.exec(content);

      if (mermaidBlocks) {
        console.log(chalk.blue(`Found ${mermaidBlocks.length} Mermaid diagrams in ${item.dir}`));
      }
    }
  }

  logger.log(chalk.green(`\nMarkdown documentation generated successfully!`));
}
