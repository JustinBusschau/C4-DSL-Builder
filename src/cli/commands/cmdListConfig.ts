import { LogLevel } from '../types/logLevel.js';
import { getStrConfig, getBoolConfig } from '../utilities/config.js';
import { createLogger } from '../utilities/logger.js';
import chalk from 'chalk';

const boolValueToString = (value: boolean): string => {
  if (value) {
    return 'Yes';
  }
  return 'No';
};

const getPrintValue = (value: string): string => {
  return value?.trim?.() && value !== 'undefined' ? chalk.green(value) : chalk.red('Not set');
};

const printConfigValue = (
  logger: { log: (message: string) => void },
  title: string,
  value: string,
) => {
  logger.log(`${title.padEnd(40)} : ${value}`);
};

export function cmdListConfig(): void {
  const logger = createLogger((process.env.LOG_LEVEL as LogLevel) ?? 'log');
  logger.log(chalk.cyan('Current Configuration\n'));

  printConfigValue(logger, 'Project name', getPrintValue(getStrConfig('projectName')));
  printConfigValue(logger, 'Homepage Name', getPrintValue(getStrConfig('homepageName')));
  printConfigValue(logger, 'Root Folder', getPrintValue(getStrConfig('rootFolder')));
  printConfigValue(logger, 'Destination Folder', getPrintValue(getStrConfig('distFolder')));
  printConfigValue(
    logger,
    'Generate website',
    getPrintValue(boolValueToString(getBoolConfig('generateWebsite'))),
  );
  printConfigValue(logger, 'Website docsify theme', getPrintValue(getStrConfig('webTheme')));
  printConfigValue(
    logger,
    'Path to a specific Docsify template',
    getPrintValue(getStrConfig('docsifyTemplate')),
  );
  printConfigValue(logger, 'Repository Url', getPrintValue(getStrConfig('repoName')));
  printConfigValue(
    logger,
    'Embed diagrams',
    getPrintValue(boolValueToString(getBoolConfig('embedDiagram'))),
  );
  printConfigValue(
    logger,
    'Replace diagrams with a link',
    getPrintValue(boolValueToString(getBoolConfig('includeLinkToDiagram'))),
  );
  printConfigValue(
    logger,
    'Place diagrams before text',
    getPrintValue(boolValueToString(getBoolConfig('diagramsOnTop'))),
  );
  printConfigValue(logger, 'Structurizr DSL CLI to use', getPrintValue(getStrConfig('dslCli')));
  printConfigValue(
    logger,
    'Where Structurizr starts looking for diagrams to extract',
    getPrintValue(getStrConfig('workspaceDsl')),
  );
  printConfigValue(logger, 'Charset', getPrintValue(getStrConfig('charset')));
  printConfigValue(
    logger,
    'Exclude other files',
    getPrintValue(boolValueToString(getBoolConfig('excludeOtherFiles'))),
  );
  printConfigValue(logger, 'PDF CSS', getPrintValue(getStrConfig('pdfCss')));
}
