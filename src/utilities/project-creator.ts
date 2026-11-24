import inquirer from 'inquirer';
import path from 'node:path';
import Configstore from 'configstore';
import chalk from 'chalk';
import { CliLogger } from './cli-logger.js';
import { Paths } from './paths.js';
import { SafeFiles } from './safe-files.js';
import * as Constants from '../types/constants.js';

export type ProjectTemplate = 'sample' | 'clean' | 'empty';

const SAMPLE_DOCUMENT_PATHS = [
  'src/c4dslbuilder.figlet.png',
  'src/context.md',
  'src/context.mmd',
  'src/inline.md',
  'src/kanban.mmd',
  'src/linked.md',
  'src/Other Files',
];

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

  async promptForProjectTemplate(): Promise<ProjectTemplate> {
    const { projectTemplate } = await inquirer.prompt<{ projectTemplate: ProjectTemplate }>([
      {
        name: 'projectTemplate',
        type: 'list',
        message: 'Choose project template:',
        choices: [
          { name: 'Sample project (with example documents)', value: 'sample' },
          { name: 'Clean start (scaffold folders only)', value: 'clean' },
          {
            name: "Leave the folder empty, I'll create the folder structure myself",
            value: 'empty',
          },
        ],
        default: 'clean',
      },
    ]);
    return projectTemplate;
  }

  private sampleExclusionFilter(templatePath: string): (source: string) => boolean {
    const samplePaths = new Set(
      SAMPLE_DOCUMENT_PATHS.map((item) => path.resolve(templatePath, item)),
    );
    return (source: string) => !samplePaths.has(path.resolve(source));
  }

  async createNewProject(): Promise<string | null> {
    try {
      const projectName = await this.promptForProjectName();
      const projectTemplate = await this.promptForProjectTemplate();

      const targetPath = path.resolve(process.cwd(), projectName);
      if (path.dirname(targetPath) !== process.cwd()) {
        throw new Error(`Refusing to create project outside the current folder: ${targetPath}`);
      }
      if (await this.safeFiles.pathExists(targetPath)) {
        throw new Error(`A folder with this name already exists: ${targetPath}`);
      }

      const templatePath = path.resolve(
        this.paths.getPathFromMeta(import.meta.url),
        '../../template',
      );

      await this.safeFiles.createDir(targetPath);

      if (projectTemplate === 'sample') {
        await this.safeFiles.copyFile(templatePath, targetPath);
      } else if (projectTemplate === 'clean') {
        await this.safeFiles.copyFile(
          templatePath,
          targetPath,
          this.sampleExclusionFilter(templatePath),
        );
      }

      new this.configstoreFactory(
        process.cwd().split(path.sep).splice(1).join('_'),
        {
          projectName: projectName,
          rootFolder: Constants.DEFAULT_ROOT,
          distFolder: Constants.DEFAULT_DIST,
        },
        {
          configPath: path.join(targetPath, Constants.CONFIG_FILENAME),
        },
      );

      this.logger.log(chalk.green(`\n✅ Project '${projectName}' created successfully.`));

      return targetPath;
    } catch (error) {
      this.logger.error('Error creating project.', error);
      return null;
    }
  }
}
