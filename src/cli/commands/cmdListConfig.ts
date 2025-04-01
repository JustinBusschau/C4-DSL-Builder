import { getStrConfig, getBoolConfig } from '../utilities/config.js';
import { logger } from '../utilities/logger.js';
import chalk from 'chalk';

const boolValueToString = (value: boolean): string => {
  if (value) {
    return 'Yes';
  }
  return 'No';
};

const getPrintValue = (value: string): string => {
  return value === 'undefined' ? chalk.red('Not set') : chalk.green(value);
};

const printConfigValue = (title: string, value: string) => {
  logger.log(`${title.padEnd(40)} : ${value}`);
};

export function cmdListConfig(): void {
  logger.log(chalk.cyan('Current Configuration\n'));

  printConfigValue('Project name', getPrintValue(getStrConfig('projectName')));
  printConfigValue('Homepage Name', getPrintValue(getStrConfig('homepageName')));
  printConfigValue('Root Folder', getPrintValue(getStrConfig('rootFolder')));
  printConfigValue('Destination Folder', getPrintValue(getStrConfig('distFolder')));
  printConfigValue(
    'Generate website',
    getPrintValue(boolValueToString(getBoolConfig('generateWebsite'))),
  );
  printConfigValue('Website docsify theme', getPrintValue(getStrConfig('webTheme')));
  printConfigValue(
    'Path to a specific Docsify template',
    getPrintValue(getStrConfig('docsifyTemplate')),
  );
  printConfigValue('Repository Url', getPrintValue(getStrConfig('repoName')));
  printConfigValue(
    'Embed diagrams',
    getPrintValue(boolValueToString(getBoolConfig('embedDiagram'))),
  );
  printConfigValue(
    'Replace diagrams with a link',
    getPrintValue(boolValueToString(getBoolConfig('includeLinkToDiagram'))),
  );
  printConfigValue(
    'Place diagrams before text',
    getPrintValue(boolValueToString(getBoolConfig('diagramsOnTop'))),
  );
  printConfigValue('Structurizr DSL CLI to use', getPrintValue(getStrConfig('dslCli')));
  printConfigValue(
    'Where Structurizr starts looking for diagrams to extract',
    getPrintValue(getStrConfig('workspaceDsl')),
  );
  printConfigValue('Charset', getPrintValue(getStrConfig('charset')));
  printConfigValue(
    'Exclude other files',
    getPrintValue(boolValueToString(getBoolConfig('excludeOtherFiles'))),
  );
  printConfigValue('PDF CSS', getPrintValue(getStrConfig('pdfCss')));
}
