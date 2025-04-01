import Configstore from 'configstore';
import inquirer from 'inquirer';
import { logger } from '../utilities/logger.js';
import chalk from 'chalk';

type ConfigAnswers = {
  projectName: string;
  homepageName: string;
  rootFolder: string;
  distFolder: string;
  generateWebsite: boolean; // not used yet
  webTheme: string; // not used yet
  docsifyTemplate: string; // not used yet
  repoName: string; // not used yet
  embedDiagram: boolean; // not used yet
  includeLinkToDiagram: boolean; // not used yet
  diagramsOnTop: boolean; // not used yet
  dslCli: 'structurizr-cli' | 'docker';
  workspaceDsl: string;
  charset: string; // not used yet
  excludeOtherFiles: boolean;
  pdfCss: string; // not used yet
};

export function isValidProjectName(input: string): string | boolean {
  return (
    /^[\w\s-]{2,}$/.test(input) ||
    'Project name must be at least 2 characters and only contain letters, numbers, spaces, hyphens, or underscores.'
  );
}

export function isValidUrl(input: string): string | boolean {
  if (!input?.trim()) return true;
  try {
    new URL(input);
    return true;
  } catch {
    return 'Please enter a valid URL.';
  }
}

export async function cmdConfig(config: Configstore): Promise<void> {
  logger.log(chalk.cyan('Configure your project settings:\n'));

  const answers = await inquirer.prompt<ConfigAnswers>([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: String(config.get('projectName')),
      validate: isValidProjectName,
    },
    {
      type: 'input',
      name: 'homepageName',
      message: 'Homepage name:',
      default: String(config.get('homepageName') ?? 'Overview'),
    },
    {
      type: 'input',
      name: 'rootFolder',
      message: 'Root folder:',
      default: String(config.get('rootFolder') ?? 'src'),
    },
    {
      type: 'input',
      name: 'distFolder',
      message: 'Destination folder:',
      default: String(config.get('distFolder') ?? 'docs'),
    },
    {
      type: 'confirm',
      name: 'generateWebsite',
      message: 'Generate website?',
      default: Boolean(config.get('generateWebsite') ?? false),
    },
    {
      type: 'input',
      name: 'webTheme',
      message: 'Website Docsify theme (URL):',
      default: String(config.get('webTheme') ?? 'https://unpkg.com/docsify/lib/themes/vue.css'),
      validate: isValidUrl,
    },
    {
      type: 'input',
      name: 'docsifyTemplate',
      message: 'Path to a specific Docsify template:',
      default: String(config.get('docsifyTemplate') ?? ''),
    },
    {
      type: 'input',
      name: 'repoName',
      message: 'Repository URL:',
      default: String(config.get('repoName') ?? ''),
      validate: isValidUrl,
    },
    {
      type: 'confirm',
      name: 'embedDiagram',
      message: 'Embed diagrams?',
      default: Boolean(config.get('embedDiagram') ?? false),
    },
    {
      type: 'confirm',
      name: 'includeLinkToDiagram',
      message: 'Replace diagrams with a link?',
      default: Boolean(config.get('includeLinkToDiagram') ?? false),
    },
    {
      type: 'confirm',
      name: 'diagramsOnTop',
      message: 'Place diagrams before text?',
      default: Boolean(config.get('diagramsOnTop') ?? false),
    },
    {
      type: 'list',
      name: 'dslCli',
      message: 'Which Structurizr CLI would you prefer to use:',
      choices: ['structurizr-cli', 'docker'],
      default: config.get('dslCli') ?? 'structurizr-cli',
    },
    {
      type: 'input',
      name: 'workspaceDsl',
      message: 'Where should the Structurizr CLI start looking when exporting diagrams:',
      default: String(config.get('workspaceDsl') ?? 'workspace.dsl'),
    },
    {
      type: 'input',
      name: 'charset',
      message: 'Character set (e.g., utf-8):',
      default: String(config.get('charset') ?? 'utf-8'),
    },
    {
      type: 'confirm',
      name: 'excludeOtherFiles',
      message: 'Exclude other files?',
      default: Boolean(config.get('excludeOtherFiles') ?? false),
    },
    {
      type: 'input',
      name: 'pdfCss',
      message: 'PDF CSS file path:',
      default: String(config.get('pdfCss') ?? ''),
    },
  ]);

  Object.entries(answers).forEach(([key, value]) => {
    config.set(key, value);
  });

  logger.log(chalk.green('\n✅ Configuration updated successfully.'));
}
