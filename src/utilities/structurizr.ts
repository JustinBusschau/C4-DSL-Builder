import path from 'path';
import { execSync } from 'child_process';
import { CliLogger } from './cli-logger.js';
import { SafeFiles } from './safe-files.js';

export class Structurizr {
  constructor(
    private readonly logger: CliLogger = new CliLogger(Structurizr.name),
    private readonly safeFiles: SafeFiles = new SafeFiles(),
  ) {}

  async extractMermaidDiagramsFromDsl(
    dslCli: string,
    rootFolder: string,
    workspaceDsl: string,
  ): Promise<void> {
    if (dslCli !== 'structurizr-cli' && dslCli !== 'docker') {
      this.logger.error(`Invalid value for dslCli: ${dslCli}`);
      this.logger.log('Invalid dslCli config value. Please check your config and re-try.');
    }

    const workspacePath = path.join(rootFolder, '_dsl', workspaceDsl);
    const outputPath = path.join(rootFolder, '_diagrams');

    if (!(await this.safeFiles.pathExists(workspacePath))) {
      this.logger.error(`Workspace file not found: ${workspacePath}`);
      this.logger.log('Please make sure the DSL file exists before running this command.');
      return;
    }

    try {
      if (dslCli === 'structurizr-cli') {
        this.logger.log('Using local structurizr-cli...');
        execSync(
          `structurizr-cli export -workspace ${workspacePath} --format mermaid --output ${outputPath}`,
          { stdio: 'inherit' },
        );
      } else {
        // already validated this is eiter `structurizr-cli` or `docker` - so this path can only be `docker`
        this.logger.log('Using Dockerized structurizr-cli...');
        execSync('docker pull structurizr/cli:latest', { stdio: 'inherit' });

        execSync(
          `docker run --rm -v ${process.cwd()}:/root/data -w /root/data structurizr/cli export -workspace ${workspacePath} --format mermaid --output ${outputPath}`,
          { stdio: 'inherit' },
        );
      }
    } catch (error) {
      this.logger.error('Failed to execute DSL command.', error);
    }
  }
}
