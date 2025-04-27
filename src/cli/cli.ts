import chalk from 'chalk';
import figlet from 'figlet';
import pkg from '../../package.json' with { type: 'json' };
import { Command } from 'commander';
import { ProjectCreator } from '../utilities/project-creator.js';
import { Structurizr } from '../utilities/structurizr.js';
import { MarkdownProcessor } from '../utilities/markdown-processor.js';
import { ConfigManager } from '../utilities/config-manager.js';
import { CliLogger } from '../utilities/cli-logger.js';
import { PdfProcessor } from '../utilities/pdf-processor.js';

interface ConfigOptions {
  list?: boolean;
  reset?: boolean;
}

interface SiteOptions {
  watch?: boolean;
  port?: number;
  serve?: boolean;
}

function getIntroText(version: string): string {
  return (
    chalk.green(figlet.textSync('C4-DSL-Builder')) +
    '\n' +
    chalk.grey(`Version ${version}`) +
    '\n\n' +
    chalk.blue('Enhance your C4 Modelling') +
    '\n\n'
  );
}

export function registerCommands(logger: CliLogger = new CliLogger('CLI.registerCommands')) {
  const program = new Command();

  program.name(pkg.name).version(pkg.version);

  program
    .command('new')
    .description('create a new project from the template')
    .action(async () => {
      logger.log(getIntroText(pkg.version));
      const creator = new ProjectCreator();
      await creator.createNewProject();
    });

  program
    .command('config')
    .description('change configuration for the current directory')
    .option('-l, --list', 'display the current configuration')
    .option('-r, --reset', 'clear all configuration')
    .action(async function () {
      const options = this.opts<ConfigOptions>();
      const config = new ConfigManager();
      if (options.list) {
        logger.log(chalk.green('Listing current configuration ...'));
        return config.listConfig();
      }
      if (options.reset) {
        logger.log(chalk.green('Resetting current configuration ...'));
        return config.resetConfig();
      }
      logger.log(chalk.green('Generating new configuration ...'));
      await config.setConfig();
    });

  program
    .command('dsl')
    .description('extract mermaid diagrams from the dsl')
    .action(async () => {
      logger.log(chalk.green('Extracting Mermaid diagrams from DSL ...'));
      const structurizr = new Structurizr();
      const config = new ConfigManager();
      await structurizr.extractMermaidDiagramsFromDsl(
        config.getStrConfigValue('dslCli'),
        config.getStrConfigValue('rootFolder'),
        config.getStrConfigValue('workspaceDsl'),
      );
    });

  program
    .command('md')
    .description('generate markdown documentation')
    .action(async function () {
      logger.log(chalk.green('Generating Markdown ...'));
      const config = new ConfigManager();
      const md = new MarkdownProcessor();
      const buildConfig = await config.getAllStoredConfig();
      await md.prepareMarkdown(buildConfig);
    });

  program
    .command('pdf')
    .description('generate pdf documentation')
    .action(async function () {
      logger.log(chalk.green('Generating PDF ...'));
      const config = new ConfigManager();
      const pdf = new PdfProcessor();
      const buildConfig = await config.getAllStoredConfig();
      await pdf.preparePdf(buildConfig);
    });

  program
    .command('site')
    .description('generate a docsify site')
    .option('-w, --watch', 'watch for changes and regenerate')
    .option('-n, --no-serve', 'do not serve the site - only generate files')
    .option('-p, --port <n>', 'port to serve the generated site on')
    .action(async function () {
      logger.log(chalk.green('Generating docsify site ...'));

      const options = this.opts<SiteOptions>();
      const config = new ConfigManager();
      const buildConfig = await config.getAllStoredConfig();
      if (options.port) {
        logger.log(chalk.bgGreen(`Serving on port ${options.port}`));
        buildConfig.servePort = options.port;
      }
      if (options.serve) {
        logger.log(chalk.grey('Serving docsify site'));
      } else {
        logger.log(chalk.grey('Building docsify site [no serve]'));
        buildConfig.serve = false;
      }
      if (options.watch) {
        logger.log('Watching for changes');
      }
    });

  return program;
}

export async function run(logger: CliLogger = new CliLogger('CLI.run')): Promise<void> {
  registerCommands(logger).parseAsync(process.argv);
}
