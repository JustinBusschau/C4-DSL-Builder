import inquirer from 'inquirer';
import path from 'path';
import Configstore from 'configstore';
import chalk from 'chalk';
import { CliLogger } from './cli-logger.js';
import { Paths } from './paths.js';
import { SafeFiles } from './safe-files.js';
import * as Constants from '../types/constants.js';

export class ProjectCreator {
  logger: CliLogger;

  constructor(
    private readonly safeFiles: SafeFiles = new SafeFiles(),
    private readonly paths: Paths = new Paths(),
    private readonly configstoreFactory: typeof Configstore = Configstore,
  ) {
    this.logger = new CliLogger(ProjectCreator.name);
  }

  async isValidProjectFolderName(name: string): Promise<boolean | string> {
    if (!/^[a-zA-Z0-9_-]{2,}$/.test(name)) {
      return 'Name must be at least 2 characters and contain only letters, numbers, hyphens, or underscores';
    }

    const targetPath = path.resolve(process.cwd(), name);
    const folderExists = await this.safeFiles.pathExists(targetPath);
    if (folderExists) {
      return 'A folder with this name already exists';
    }

    return true;
  }

  async promptForProjectName(): Promise<string> {
    const { projectName } = await inquirer.prompt([
      {
        name: 'projectName',
        type: 'input',
        message: 'Enter your project name:',
        validate: this.isValidProjectFolderName.bind(this),
      },
    ]);
    return projectName;
  }

  async createNewProject(): Promise<boolean> {
    try {
      const projectName = await this.promptForProjectName();

      const targetPath = path.resolve(process.cwd(), projectName);
      const templatePath = path.resolve(
        this.paths.getPathFromMeta(import.meta.url),
        '../../template',
      );

      await this.safeFiles.createDir(targetPath);
      await this.safeFiles.copyFile(templatePath, targetPath);

      new this.configstoreFactory(
        process.cwd().split(path.sep).splice(1).join('_'),
        {
          projectName: projectName,
          rootFolder: Constants.DEFAULT_ROOT,
          distFolder: Constants.DEFAULT_DIST,
        },
        {
          configPath: path.join(process.cwd(), projectName, Constants.CONFIG_FILENAME),
        },
      );

      this.logger.log(chalk.green(`\n✅ Project '${projectName}' created successfully.`));
      this.logger.log(chalk.blue(`\nNext steps:`));
      this.logger.log(chalk.white(`  cd ${projectName}`));
      this.logger.log(chalk.white(`  c4dslbuilder config\n`));

      return true;
    } catch (error) {
      this.logger.error('Error creating project.', error);
      return false;
    }
  }
}
