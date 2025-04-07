import { execSync } from 'child_process';
import path from 'path';
import * as fsExtra from 'fs-extra';
import { getStrConfig } from '../utilities/config.js';
import { createLogger } from '../utilities/logger.js';

export async function cmdDsl(): Promise<void> {
  const dslCli = getStrConfig('dslCli').trim();
  const rootFolder = getStrConfig('rootFolder') ?? 'src';
  const workspaceDsl = getStrConfig('workspaceDsl') ?? 'workspace.dsl';
  const logger = createLogger();

  const workspacePath = path.join(rootFolder, '_dsl', workspaceDsl);
  const outputPath = path.join(rootFolder, 'diagrams');

  if (!(await fsExtra.pathExists(workspacePath))) {
    logger.error(`Workspace file not found: ${workspacePath}`);
    logger.log('Please make sure the DSL file exists before running this command.');
    return;
  }

  try {
    if (dslCli === 'structurizr-cli') {
      logger.log('Using local structurizr-cli...');
      execSync(
        `structurizr-cli export -workspace ${workspacePath} --format mermaid --output ${outputPath}`,
        { stdio: 'inherit' },
      );
    } else if (dslCli === 'docker') {
      logger.log('Using Dockerized structurizr-cli...');
      execSync('docker pull structurizr/cli:latest', { stdio: 'inherit' });

      execSync(
        `docker run --rm -v ${process.cwd()}:/root/data -w /root/data structurizr/cli export -workspace ${workspacePath} --format mermaid --output ${outputPath}`,
        { stdio: 'inherit' },
      );
    } else {
      logger.error(
        `Unknown dslCli config setting: ${dslCli}. Please set it to 'structurizr-cli' or 'docker'.`,
      );
    }
  } catch (err) {
    logger.error('Failed to execute DSL command.');
    if (err instanceof Error) {
      logger.error(err.message);
    }
  }
}
