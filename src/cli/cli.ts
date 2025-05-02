import chalk from 'chalk';
import figlet from 'figlet';
import pkg from '../../package.json' with { type: 'json' };
import chokidar, { FSWatcher } from 'chokidar';
import path from 'path';
import serveStatic from 'serve-static';
import finalhandler from 'finalhandler';
import debounce from 'debounce';
import { createServer } from 'http';
import { findAvailablePort } from '../utilities/port-utils.js';
import { Command } from 'commander';
import { ProjectCreator } from '../utilities/project-creator.js';
import { Structurizr } from '../utilities/structurizr.js';
import { MarkdownProcessor } from '../utilities/markdown-processor.js';
import { ConfigManager } from '../utilities/config-manager.js';
import { CliLogger } from '../utilities/cli-logger.js';
import { PdfProcessor } from '../utilities/pdf-processor.js';
import { SiteProcessor } from '../utilities/site-processor.js';

interface ConfigOptions {
  list?: boolean;
  reset?: boolean;
}

interface SiteOptions {
  watch?: boolean;
  port?: number;
  serve?: boolean;
  clean?: boolean;
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

export async function serveStaticSite(
  directory: string,
  port: number,
  logger: CliLogger,
): Promise<void> {
  const serve = serveStatic(path.resolve(directory));

  /* c8 ignore next 3 -- @preserve -- not explicitly testing the createServerInternals */
  const server = createServer((request, response) => {
    serve(request, response, finalhandler(request, response));
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      logger.log(`Serving ${directory} at http://localhost:${port}`);
      resolve();
    });
  });
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
    .option('-c, --clean', 'clean output folder before building')
    .action(async function () {
      logger.log(chalk.green('Generating docsify site ...'));
      const site = new SiteProcessor();

      const dslWatchOptions = {
        persistent: true,
        ignoreInitial: false,
        awaitWriteFinish: {
          stabilityThreshold: 200,
          pollInterval: 100,
        },
      };
      const sourceWatchOptions = {
        ignored: (path: string) => {
          return /(^|[/\\])\.[^/\\]/.test(path) || /[/\\]_[^/\\]*/.test(path);
        },
        ...dslWatchOptions,
      };

      const config = new ConfigManager();
      const buildConfig = await config.getAllStoredConfig();
      buildConfig.generateWebsite = true;
      let cleanBeforeBuild = false;

      const options = this.opts<SiteOptions>();
      console.log(options);
      if (options.port) {
        logger.log(chalk.bgGreen(`Serving on port ${options.port}`));
        buildConfig.servePort = options.port;
      }
      if (options.serve === false) {
        logger.log(chalk.grey('Building docsify site [no serve]'));
        buildConfig.serve = false;
      } else {
        logger.log(chalk.grey('Serving docsify site'));
        buildConfig.serve = true;
      }
      if (options.clean === true) {
        cleanBeforeBuild = true;
      }
      if (options.watch) {
        logger.log(`Watching for changes in ${buildConfig.rootFolder} ...`);
        const sourceWatcher: FSWatcher = chokidar.watch(buildConfig.rootFolder, sourceWatchOptions);
        const debouncedSiteBuild = debounce(async () => {
          logger.log('Rebuilding (debounced) ...');
          await site.prepareSite(buildConfig, false);
        }, 300);
        sourceWatcher
          .on('ready', () => logger.log('... ready'))
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .on('all', async (_event: any, path: string) => {
            logger.log(`\n${path} touched (added, changed or removed). Rebuilding ...`);
            debouncedSiteBuild();
          });

        const dslWatcher: FSWatcher = chokidar.watch(
          path.join(buildConfig.rootFolder, '_dsl', buildConfig.workspaceDsl),
          dslWatchOptions,
        );
        const debouncedDslBuild = debounce(async () => {
          logger.log('Regenerating Structurizr diagrams (debounced) ...');
          const structurizr = new Structurizr();
          await structurizr.extractMermaidDiagramsFromDsl(
            buildConfig.dslCli,
            buildConfig.rootFolder,
            buildConfig.workspaceDsl,
          );
        }, 300);
        dslWatcher.on('change', async (path: string) => {
          logger.log(`\n${path} changed. Extracting Mermaid diagrams from DSL ...`);
          debouncedDslBuild();
        });
      }

      await site.prepareSite(buildConfig, cleanBeforeBuild);

      if (buildConfig.serve) {
        const availablePort = await findAvailablePort(buildConfig.servePort);
        if (availablePort !== buildConfig.servePort) {
          logger.log(
            chalk.yellow(
              `Port ${buildConfig.servePort} is busy. Using available port ${availablePort} instead.`,
            ),
          );
          buildConfig.servePort = availablePort;
        }

        await serveStaticSite(buildConfig.distFolder, buildConfig.servePort, logger);
      }
    });

  return program;
}

export async function run(logger: CliLogger = new CliLogger('CLI.run')): Promise<void> {
  await registerCommands(logger).parseAsync(process.argv);
}
