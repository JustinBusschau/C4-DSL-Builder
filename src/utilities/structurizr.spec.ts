import { describe, it, beforeEach, expect, vi, type Mock } from 'vitest';

const mockLogger = {
  log: vi.fn(),
  error: vi.fn(),
};

vi.mock('./cli-logger.js', () => ({
  CliLogger: vi.fn(() => mockLogger),
}));

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('./safe-files.js', () => ({
  SafeFiles: vi.fn(() => ({
    pathExists: vi.fn(),
  })),
}));

import path from 'path';
import { execSync } from 'child_process';
import { Structurizr } from './structurizr.js';
import { SafeFiles } from './safe-files.js';
import { CliLogger } from './cli-logger.js';

describe('Structurizr (CLI Logger Validated)', () => {
  let structurizr: Structurizr;
  let safeFiles: SafeFiles;
  let logger: CliLogger;

  const rootFolder = '/project';
  const workspaceDsl = 'workspace.dsl';
  const workspacePath = path.join(rootFolder, '_dsl', workspaceDsl);

  beforeEach(() => {
    vi.clearAllMocks();
    logger = new CliLogger('Structurizr.test');
    safeFiles = new SafeFiles();
    structurizr = new Structurizr(logger, safeFiles);
  });

  it('logs and exits early if dslCli is invalid', async () => {
    await structurizr.extractMermaidDiagramsFromDsl('invalid-cli', rootFolder, workspaceDsl);
    expect(mockLogger.error).toHaveBeenCalledWith('Invalid value for dslCli: invalid-cli');
    expect(mockLogger.log).toHaveBeenCalledWith(
      'Invalid dslCli config value. Please check your config and re-try.',
    );
  });

  it('logs and exits if workspace DSL file is missing', async () => {
    (safeFiles.pathExists as Mock).mockResolvedValue(false);
    await structurizr.extractMermaidDiagramsFromDsl('structurizr-cli', rootFolder, workspaceDsl);
    expect(mockLogger.error).toHaveBeenCalledWith(`Workspace file not found: ${workspacePath}`);
    expect(mockLogger.log).toHaveBeenCalledWith(
      'Please make sure the DSL file exists before running this command.',
    );
  });

  it('runs structurizr-cli when configured and DSL file exists', async () => {
    (safeFiles.pathExists as Mock).mockResolvedValue(true);
    await structurizr.extractMermaidDiagramsFromDsl('structurizr-cli', rootFolder, workspaceDsl);
    expect(mockLogger.log).toHaveBeenCalledWith('Using local structurizr-cli...');
    expect(execSync).toHaveBeenCalledWith(
      expect.stringContaining(`structurizr-cli export -workspace ${workspacePath}`),
      { stdio: 'inherit' },
    );
  });

  it('runs docker-based structurizr when configured and DSL file exists', async () => {
    (safeFiles.pathExists as Mock).mockResolvedValue(true);
    await structurizr.extractMermaidDiagramsFromDsl('docker', rootFolder, workspaceDsl);
    expect(mockLogger.log).toHaveBeenCalledWith('Using Dockerized structurizr-cli...');
    expect(execSync).toHaveBeenCalledWith('docker pull structurizr/cli:latest', {
      stdio: 'inherit',
    });
    expect(execSync).toHaveBeenCalledWith(
      expect.stringContaining(`docker run --rm -v ${process.cwd()}`),
      { stdio: 'inherit' },
    );
  });

  it('logs execution errors', async () => {
    (safeFiles.pathExists as Mock).mockResolvedValue(true);
    (execSync as Mock).mockImplementation(() => {
      throw new Error('exec failed');
    });

    await structurizr.extractMermaidDiagramsFromDsl('docker', rootFolder, workspaceDsl);

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to execute DSL command.',
      expect.any(Error),
    );
  });
});
