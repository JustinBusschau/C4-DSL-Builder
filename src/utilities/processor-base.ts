import path from 'path';
import chalk from 'chalk';
import { BuildConfig } from '../types/build-config.js';
import { CliLogger } from './cli-logger.js';
import { SafeFiles } from './safe-files.js';
import { TreeItem } from '../types/tree-item.js';

export enum OutputType {
  md = 'md',
  pdf = 'pdf',
}

export class ProcessorBase {
  constructor(
    protected readonly safeFiles: SafeFiles,
    protected readonly logger: CliLogger,
  ) {}

  async prepareOutputFolder(type: OutputType, buildConfig: BuildConfig): Promise<boolean> {
    const targetFolderBase = buildConfig.distFolder;
    if (!targetFolderBase?.trim?.() || targetFolderBase === 'undefined') {
      this.logger.error(`Please run \`config\` before attempting to run \`${type}\`.`);
      return false;
    }

    const targetFolder = path.join(targetFolderBase);
    if (!(await this.safeFiles.emptySubFolder(targetFolder))) {
      this.logger.error(`Failed to empty the target folder: ${targetFolder}`);
      return false;
    }

    this.logger.log(
      chalk.green(`\nBuilding ${type.toUpperCase()} documentation in ./${targetFolder}`),
    );
    return true;
  }

  async generateSourceTree(buildConfig: BuildConfig): Promise<TreeItem[]> {
    const tree = await this.safeFiles.generateTree(
      buildConfig.rootFolder,
      buildConfig.rootFolder,
      buildConfig.homepageName,
    );

    this.logger.log(chalk.magenta(`Parsed ${tree.length} folders.\n`));
    return tree;
  }
}
