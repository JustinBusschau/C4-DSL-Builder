import { clearConfig } from '../utilities/config.js';
import { createLogger } from '../utilities/logger.js';
import chalk from 'chalk';

export const cmdResetConfig = (): void => {
  clearConfig();

  const logger = createLogger();
  logger.log(chalk.yellow('✅ Configuration has been reset.'));
};
