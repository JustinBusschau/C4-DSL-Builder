import Configstore from 'configstore';
import inquirer from 'inquirer';
import chalk from 'chalk';
import path from 'path';
import { CliLogger } from './cli-logger.js';
import { BuildConfig } from '../types/build-config.js';
import * as Constants from '../types/constants.js';

export class ConfigManager {
  constructor(private readonly logger: CliLogger = new CliLogger(ConfigManager.name)) {}

  private openConfigStore(): Configstore | null {
    let config: Configstore;
    try {
      config = new Configstore(
        process.cwd().split(path.sep).splice(1).join('_'),
        {},
        {
          configPath: path.join(process.cwd(), Constants.CONFIG_FILENAME),
        },
      );
    } catch (error) {
      this.logger.error('Error accessing config store.', error);
      return null;
    }
    return config;
  }

  private getStoredValue(key: string): string | boolean | undefined {
    const config = this.openConfigStore();
    if (!config) {
      this.logger.error('Failed to open config store.');
      return undefined;
    }

    try {
      const configValue = config.get(key) as string | boolean;
      if (configValue === undefined) {
        this.logger.warn(`Configuration key ${key} not found.`);
        return undefined;
      }

      return configValue;
    } catch (error) {
      this.logger.error(`Error retrieving config value for ${key}.`, error);
      return undefined;
    }
  }

  private printConfigValue(title: string, value: string) {
    this.logger.log(`${title.padEnd(40)} : ${value}`);
  }

  private boolValueToString(value: boolean): string {
    if (value) {
      return 'Yes';
    }
    return 'No';
  }

  private numValueToString(value: number | string): string {
    return value.toString();
  }

  private getPrintValue(value: string): string {
    return value?.trim?.() && value !== 'undefined' ? chalk.green(value) : chalk.red('Not set');
  }

  private isValidProjectName(input: string): string | boolean {
    return (
      /^[\w\s-]{2,}$/.test(input.trim()) ||
      'Project name must be at least 2 characters and only contain letters, numbers, spaces, hyphens, or underscores.'
    );
  }

  private isValidUrl(input: string): string | boolean {
    if (!input?.trim()) return true;
    try {
      new URL(input);
      return true;
    } catch {
      return 'Please enter a valid URL.';
    }
  }

  getStrConfigValue(key: string): string {
    const configValue = this.getStoredValue(key);
    if (typeof configValue === 'string') {
      return configValue;
    }
    this.logger.info(`Expected string for ${key}, but got ${typeof configValue}`);
    return '';
  }

  getBoolConfigValue(key: string): boolean {
    const configValue = this.getStoredValue(key);
    if (typeof configValue === 'boolean') {
      return configValue;
    }

    // cater for string representations of booleans
    if (typeof configValue === 'string') {
      if (configValue.toLowerCase() === 'true' || configValue.toLowerCase() === 'yes') {
        return true;
      }
      if (configValue.toLowerCase() === 'false' || configValue.toLowerCase() === 'no') {
        return false;
      }
    }

    this.logger.info(`Expected boolean for ${key}, but got ${typeof configValue}`);
    return false;
  }

  getNumConfigValue(key: string): number {
    const configValue = this.getStoredValue(key);
    const num = typeof configValue === 'number' ? configValue : Number(configValue);
    if (Number.isNaN(num)) {
      this.logger.info(`Expected number for ${key}, but got ${typeof configValue}`);
      return 0;
    }
    return num;
  }

  setConfigValue(key: string, value: string | boolean): void {
    const config = this.openConfigStore();
    if (!config) {
      this.logger.error('Failed to open config store.');
      return;
    }

    config.set(key, value);
  }

  deleteConfig(key: string): void {
    const config = this.openConfigStore();
    if (!config) {
      this.logger.error('Failed to open config store.');
      return;
    }

    config.delete(key);
  }

  resetConfig(): void {
    const config = this.openConfigStore();
    if (!config) {
      this.logger.error('Failed to open config store.');
      return;
    }

    const projectName = this.getStrConfigValue('projectName');
    config.clear();
    config.set('projectName', projectName);

    this.logger.log(chalk.yellow(`✅ Configuration has been reset for project ${projectName}.`));
  }

  listConfig(): void {
    this.logger.log(chalk.cyan('Current Configuration\n'));
    this.printConfigValue(
      'Project name',
      this.getPrintValue(this.getStrConfigValue('projectName')),
    );
    this.printConfigValue(
      'Homepage Name',
      this.getPrintValue(this.getStrConfigValue('homepageName')),
    );
    this.printConfigValue('Root Folder', this.getPrintValue(this.getStrConfigValue('rootFolder')));
    this.printConfigValue(
      'Destination Folder',
      this.getPrintValue(this.getStrConfigValue('distFolder')),
    );
    this.printConfigValue(
      'Generate website',
      this.getPrintValue(this.boolValueToString(this.getBoolConfigValue('generateWebsite'))),
    );
    this.printConfigValue(
      'Structurizr DSL CLI to use',
      this.getPrintValue(this.getStrConfigValue('dslCli')),
    );
    this.printConfigValue(
      'Where Structurizr starts looking for diagrams to extract',
      this.getPrintValue(this.getStrConfigValue('workspaceDsl')),
    );
    this.printConfigValue(
      'Embed Mermaid diagrams?',
      this.getPrintValue(this.boolValueToString(this.getBoolConfigValue('embedMermaidDiagrams'))),
    );
    this.printConfigValue('PDF CSS', this.getPrintValue(this.getStrConfigValue('pdfCss')));
    this.printConfigValue(
      'Serve Docsify Website?',
      this.getPrintValue(this.boolValueToString(this.getBoolConfigValue('serve'))),
    );
    this.printConfigValue(
      'Port Number',
      this.getPrintValue(this.numValueToString(this.getNumConfigValue('servePort'))),
    );
  }

  async setConfig(): Promise<void> {
    this.logger.log(chalk.cyan('Configure your project settings:\n'));

    const answers = await inquirer.prompt<BuildConfig>([
      {
        type: 'input',
        name: 'projectName',
        message: 'Project name:',
        default: this.getStrConfigValue('projectName'),
        validate: this.isValidProjectName.bind(this),
      },
      {
        type: 'input',
        name: 'homepageName',
        message: 'Homepage name:',
        default: this.getStrConfigValue('homepageName') || 'Overview',
      },
      {
        type: 'input',
        name: 'rootFolder',
        message: 'Root folder:',
        default: this.getStrConfigValue('rootFolder') || Constants.DEFAULT_ROOT,
      },
      {
        type: 'input',
        name: 'distFolder',
        message: 'Destination folder:',
        default: this.getStrConfigValue('distFolder') || Constants.DEFAULT_DIST,
      },
      {
        type: 'confirm',
        name: 'generateWebsite',
        message: 'Generate website?',
        default: this.getBoolConfigValue('generateWebsite') || false,
      },
      {
        type: 'input',
        name: 'webTheme',
        message: 'Website Docsify theme (URL):',
        default:
          this.getStrConfigValue('webTheme') || 'https://unpkg.com/docsify/lib/themes/vue.css',
        validate: this.isValidUrl.bind(this),
      },
      {
        type: 'input',
        name: 'docsifyTemplate',
        message: 'Path to a specific Docsify template:',
        default: this.getStrConfigValue('docsifyTemplate') || '',
      },
      {
        type: 'input',
        name: 'repoName',
        message: 'Repository URL:',
        default: this.getStrConfigValue('repoName') || '',
        validate: this.isValidUrl.bind(this),
      },
      {
        type: 'confirm',
        name: 'embedMermaidDiagrams',
        message:
          'Embed Mermaid diagrams? (Set this to NO / false to replace mermaid diagrams with a link to an image)',
        default: this.getBoolConfigValue('embedMermaidDiagrams') || true,
      },
      {
        type: 'list',
        name: 'dslCli',
        message: 'Which Structurizr CLI would you prefer to use:',
        choices: ['structurizr-cli', 'docker'],
        default: this.getStrConfigValue('dslCli') || 'structurizr-cli',
      },
      {
        type: 'input',
        name: 'workspaceDsl',
        message: 'Where should the Structurizr CLI start looking when exporting diagrams:',
        default: this.getStrConfigValue('workspaceDsl') || 'workspace.dsl',
      },
      {
        type: 'input',
        name: 'pdfCss',
        message: 'PDF CSS file path:',
        default: this.getStrConfigValue('pdfCss') || '_resources/pdf.css',
      },
      {
        type: 'confirm',
        name: 'serve',
        message: 'Serve Docsify Website:',
        default: this.getBoolConfigValue('serve') || false,
      },
      {
        type: 'number',
        name: 'servePort',
        message: 'Port number:',
        default: this.getNumConfigValue('servePort') || 3000,
      },
    ]);

    Object.entries(answers).forEach(([key, value]) => {
      this.setConfigValue(key, String(value));
    });

    this.logger.log(chalk.green('\n✅ Configuration updated successfully.'));
  }

  async getAllStoredConfig(): Promise<BuildConfig> {
    return {
      projectName: this.getStrConfigValue('projectName'),
      homepageName: this.getStrConfigValue('homepageName'),
      rootFolder: this.getStrConfigValue('rootFolder'),
      distFolder: this.getStrConfigValue('distFolder'),
      dslCli: this.getStrConfigValue('dslCli') === 'docker' ? 'docker' : 'structurizr-cli',
      workspaceDsl: this.getStrConfigValue('workspaceDsl'),
      embedMermaidDiagrams: this.getBoolConfigValue('embedMermaidDiagrams'),
      pdfCss: this.getStrConfigValue('pdfCss'),
      serve: this.getBoolConfigValue('serve'),
      servePort: this.getNumConfigValue('servePort'),
    };
  }
}
