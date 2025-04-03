import inquirer from 'inquirer';
import path from 'path';
import * as fs from 'fs-extra';
import Configstore from 'configstore';
import chalk from 'chalk';
import { logger } from '../utilities/logger.js';
import { getCurrentDir } from '../utilities/paths.js';

const __dirname = getCurrentDir(import.meta.url);

export const isValidProjectName = async (name: string): Promise<boolean | string> => {
  if (!/^[a-zA-Z0-9_-]{2,}$/.test(name)) {
    return 'Name must be at least 2 characters and contain only letters, numbers, hyphens, or underscores';
  }

  const targetPath = path.resolve(process.cwd(), name);
  const folderExists = await fs.pathExists(targetPath);
  if (folderExists) {
    return 'A folder with this name already exists';
  }

  return true;
};

export const cmdNewProject = async () => {
  const response: { projectName: string } = await inquirer.prompt([
    {
      name: 'projectName',
      type: 'input',
      message: 'Enter your project name:',
      validate: isValidProjectName,
    },
  ]);

  const targetPath = path.resolve(process.cwd(), response.projectName);
  const templatePath = path.resolve(__dirname, '../../../template');

  try {
    await fs.mkdirp(targetPath);
    await fs.copy(templatePath, targetPath);

    new Configstore(
      process.cwd().split(path.sep).splice(1).join('_'),
      {
        projectName: response.projectName,
        rootFolder: 'src',
        distFolder: 'docs',
      },
      {
        configPath: path.join(process.cwd(), response.projectName, `.c4dslbuilder`),
      },
    );

    logger.log(chalk.green(`\n✅ Project '${response.projectName}' created successfully.`));
    logger.log(chalk.blue(`\nNext steps:`));
    logger.log(chalk.white(`  cd ${response.projectName}`));
    logger.log(chalk.white(`  c4dslbuilder config\n`));
  } catch (error) {
    logger.error('Error creating project.', error);
  }
};
