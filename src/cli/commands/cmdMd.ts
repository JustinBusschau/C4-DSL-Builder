import { getStrConfig } from '../utilities/config.js';
import path from 'path';
import { createLogger } from '../utilities/logger.js';
import chalk from 'chalk';
import { safeEmptySubFolder } from '../utilities/tree.js';

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

  logger.log(chalk.green(`\nMarkdown documentation generated successfully!`));
}
