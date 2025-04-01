import { clearConfig } from '../utilities/config.js';
import { logger } from '../utilities/logger.js';
import chalk from 'chalk';

export const cmdResetConfig = (): void => {
  clearConfig();

  logger.log(chalk.yellow('✅ Configuration has been reset.'));
};
