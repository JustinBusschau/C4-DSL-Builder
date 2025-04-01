import clear from 'clear';
import { setConfig, deleteConfig } from './utilities/config.js';
import { logger } from './utilities/logger.js';
import { Command } from 'commander';
import { getIntroText } from './utilities/intro.js';
import { cmdNewProject } from './commands/cmdNewProject.js';
import { cmdListConfig } from './commands/cmdListConfig.js';
import { cmdResetConfig } from './commands/cmdResetConfig.js';
import { cmdDsl } from './commands/cmdDsl.js';
import { cmdMd } from './commands/cmdMd.js';
import { cmdConfig } from './commands/cmdConfig.js';
import pkg from '../../package.json' with { type: 'json' };
import chalk from 'chalk';

interface MdOptions {
  split?: boolean;
}

export const registerCommands = () => {
  const program = new Command();

  program.name('c4dslbuilder').version(pkg.version);

  program
    .command('new')
    .description('create a new project from template')
    .action(async () => {
      clear();
      logger.log(getIntroText(pkg.version));
      await cmdNewProject();
    });

  program
    .command('config')
    .description('change configuration for the current directory')
    .action(async () => {
      await cmdConfig();
    });

  program
    .command('list')
    .description('display the current configuration')
    .action(() => {
      cmdListConfig();
    });

  program
    .command('reset')
    .description('clear all configuration')
    .action(() => {
      cmdResetConfig();
    });

  program
    .command('dsl')
    .description('extract mermaid diagrams from the dsl')
    .action(() => {
      cmdDsl();
    });

  program
    .command('md')
    .description('generate markdown documentation')
    .option('-s, --split', 'generate separate markdown documents for each folder')
    .action(async function () {
      const options = this.opts<MdOptions>();
      if (options.split) {
        logger.log(chalk.green('Generating split Markdown ...'));
        setConfig('generateCompleteMdFile', false);
      } else {
        logger.log(chalk.green('Generating Markdown ...'));
        setConfig('generateCompleteMdFile', true);
      }
      await cmdMd();
      deleteConfig('generateCompleteMdFile');
    });

  program
    .command('pdf')
    .description('generate PDF documentation')
    .option('-s, --split', 'generate separate PDF files for each folder')
    .action(() => {
      logger.log('PDF command executed');
    });

  program
    .command('site')
    .description('serve the generated site')
    .option('-w, --watch', 'watch for changes and rebuild')
    .option('-p, --port <n>', 'port used for serving the generated site')
    .action(() => {
      logger.log('Site command executed');
    });

  return program;
};

export const run = () => {
  registerCommands().parse(process.argv);
};
