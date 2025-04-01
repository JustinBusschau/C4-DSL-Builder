import { cmdDsl } from './cmdDsl.js';
import * as childProcess from 'child_process';
import * as fsModule from 'fs';
import { logger } from '../utilities/logger.js';
import type Configstore from 'configstore';

jest.mock('child_process');
jest.mock('fs');
jest.mock('../utilities/logger.js');

const mockConfig = (dslCliValue?: string, rootFolder?: string, workspaceDsl?: string) =>
  ({
    get: (key: string) => {
      if (key === 'dslCli') return dslCliValue;
      if (key === 'rootFolder') return rootFolder;
      if (key === 'workspaceDsl') return workspaceDsl;
      return undefined;
    },
  }) as unknown as Configstore;

describe('cmdDsl', () => {
  const mockedChildProcess = childProcess as jest.Mocked<typeof childProcess>;
  const mockedFs = fsModule as jest.Mocked<typeof fsModule>;

  const execSyncMock = mockedChildProcess.execSync;
  const fsExistsMock = mockedFs.existsSync;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log error and return if workspace.dsl does not exist', () => {
    fsExistsMock.mockReturnValue(false);

    cmdDsl();

    expect(logger.error).toHaveBeenCalledWith('Workspace file not found: src/_dsl/workspace.dsl');
    expect(logger.log).toHaveBeenCalledWith(
      'Please make sure the DSL file exists before running this command.',
    );
    expect(execSyncMock).not.toHaveBeenCalled();
  });

  it('should run structurizr-cli locally if dslCli is "structurizr-cli"', () => {
    fsExistsMock.mockReturnValue(true);

    cmdDsl();

    expect(logger.log).toHaveBeenCalledWith('Using local structurizr-cli...');
    expect(execSyncMock).toHaveBeenCalledWith(
      'structurizr-cli export -workspace src/_dsl/workspace.dsl --format mermaid --output src/diagrams',
      { stdio: 'inherit' },
    );
  });

  it('should pull and run docker command if dslCli is "docker"', () => {
    fsExistsMock.mockReturnValue(true);

    cmdDsl();

    expect(logger.log).toHaveBeenCalledWith('Using Dockerized structurizr-cli...');
    expect(execSyncMock).toHaveBeenCalledWith('docker pull structurizr/cli:latest', {
      stdio: 'inherit',
    });
    expect(execSyncMock).toHaveBeenCalledWith(
      `docker run --rm -v ${process.cwd()}:/root/data -w /root/data structurizr/cli export -workspace src/_dsl/workspace.dsl --format mermaid --output src/diagrams`,
      { stdio: 'inherit' },
    );
  });

  it('should handle unknown dslCli value', () => {
    fsExistsMock.mockReturnValue(true);

    cmdDsl();

    expect(logger.error).toHaveBeenCalledWith(
      "Unknown dslCli config setting: something-weird. Please set it to 'structurizr-cli' or 'docker'.",
    );
    expect(execSyncMock).not.toHaveBeenCalled();
  });

  it('should handle missing dslCli config gracefully', () => {
    fsExistsMock.mockReturnValue(true);

    cmdDsl();

    expect(logger.error).toHaveBeenCalledWith(
      "Unknown dslCli config setting: undefined. Please set it to 'structurizr-cli' or 'docker'.",
    );
    expect(execSyncMock).not.toHaveBeenCalled();
  });

  it('should log error if execSync throws an Error', () => {
    fsExistsMock.mockReturnValue(true);
    execSyncMock.mockImplementation(() => {
      throw new Error('mock exec failure');
    });

    cmdDsl();

    expect(logger.error).toHaveBeenCalledWith('Failed to execute DSL command.');
    expect(logger.error).toHaveBeenCalledWith('mock exec failure');
  });

  it('should log error if execSync throws non-Error', () => {
    fsExistsMock.mockReturnValue(true);
    execSyncMock.mockImplementation(() => {
      throw new Error(String('non-error exception'));
    });

    cmdDsl();

    expect(logger.error).toHaveBeenCalledWith('Failed to execute DSL command.');
  });

  it('should log error if rootFolder is missing', () => {
    cmdDsl();

    expect(logger.error).toHaveBeenCalledWith('Failed to execute DSL command.');
    expect(execSyncMock).toHaveBeenCalled();
  });

  it('should log error if workspaceDsl is missing', () => {
    cmdDsl();

    expect(logger.error).toHaveBeenCalledWith('Failed to execute DSL command.');
    expect(execSyncMock).toHaveBeenCalled();
  });

  it('should treat whitespace-only dslCli as unknown', () => {
    fsExistsMock.mockReturnValue(true);

    cmdDsl();

    expect(logger.error).toHaveBeenCalledWith(
      "Unknown dslCli config setting: . Please set it to 'structurizr-cli' or 'docker'.",
    );
    expect(execSyncMock).not.toHaveBeenCalled();
  });
});
