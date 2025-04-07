import { jest } from '@jest/globals';

const execSyncMock = jest.fn();
const getStrConfigMock = jest.fn<(key: string) => string | undefined>();
const pathExistsMock = jest.fn<(path: string) => Promise<boolean>>();
const logMock = jest.fn();
const errorMock = jest.fn();

jest.unstable_mockModule('child_process', () => ({
  execSync: execSyncMock,
}));

jest.unstable_mockModule('../utilities/config.js', () => ({
  getStrConfig: getStrConfigMock,
}));

jest.unstable_mockModule('fs-extra', () => ({
  pathExists: pathExistsMock,
}));

jest.unstable_mockModule('../utilities/logger.js', () => ({
  createLogger: () => ({
    log: logMock,
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: errorMock,
  }),
}));

const childProcess = await import('child_process');

describe('cmdDsl', () => {
  let cmdDsl: typeof import('./cmdDsl.js').cmdDsl;

  beforeEach(async () => {
    logMock.mockReset();
    errorMock.mockReset();

    const imported = await import('./cmdDsl.js');
    cmdDsl = imported.cmdDsl;
  });

  const mockedChildProcess = childProcess as jest.Mocked<typeof childProcess>;

  const execSyncMock = mockedChildProcess.execSync;

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('should log error and return if workspace.dsl does not exist', async () => {
    pathExistsMock.mockResolvedValue(false);
    getStrConfigMock.mockImplementation((key: string) => {
      switch (key) {
        case 'dslCli':
          return 'structurizr-cli';
        case 'rootFolder':
          return 'src';
        case 'workspaceDsl':
          return 'workspace.dsl';
        default:
          return undefined;
      }
    });

    await cmdDsl();

    expect(pathExistsMock).toHaveBeenCalled();
    expect(errorMock).toHaveBeenCalledWith('Workspace file not found: src/_dsl/workspace.dsl');
    expect(logMock).toHaveBeenCalledWith(
      'Please make sure the DSL file exists before running this command.',
    );
    expect(execSyncMock).not.toHaveBeenCalled();
  });

  it('should run structurizr-cli locally if dslCli is "structurizr-cli"', async () => {
    pathExistsMock.mockResolvedValue(true);
    getStrConfigMock.mockImplementation((key: string) => {
      switch (key) {
        case 'dslCli':
          return 'structurizr-cli';
        case 'rootFolder':
          return 'src';
        case 'workspaceDsl':
          return 'workspace.dsl';
        default:
          return undefined;
      }
    });

    await cmdDsl();

    expect(logMock).toHaveBeenCalledWith('Using local structurizr-cli...');
    expect(execSyncMock).toHaveBeenCalledWith(
      'structurizr-cli export -workspace src/_dsl/workspace.dsl --format mermaid --output src/diagrams',
      { stdio: 'inherit' },
    );
  });

  it('should pull and run docker command if dslCli is "docker"', async () => {
    pathExistsMock.mockResolvedValue(true);
    getStrConfigMock.mockImplementation((key: string) => {
      switch (key) {
        case 'dslCli':
          return 'docker';
        case 'rootFolder':
          return 'src';
        case 'workspaceDsl':
          return 'workspace.dsl';
        default:
          return undefined;
      }
    });

    await cmdDsl();

    expect(logMock).toHaveBeenCalledWith('Using Dockerized structurizr-cli...');
    expect(execSyncMock).toHaveBeenCalledWith('docker pull structurizr/cli:latest', {
      stdio: 'inherit',
    });
    expect(execSyncMock).toHaveBeenCalledWith(
      `docker run --rm -v ${process.cwd()}:/root/data -w /root/data structurizr/cli export -workspace src/_dsl/workspace.dsl --format mermaid --output src/diagrams`,
      { stdio: 'inherit' },
    );
  });

  it('should handle unknown dslCli value', async () => {
    pathExistsMock.mockResolvedValue(true);
    getStrConfigMock.mockImplementation((key: string) => {
      switch (key) {
        case 'dslCli':
          return 'something-weird';
        case 'rootFolder':
          return 'src';
        case 'workspaceDsl':
          return 'workspace.dsl';
        default:
          return undefined;
      }
    });

    await cmdDsl();

    expect(errorMock).toHaveBeenCalledWith(
      "Unknown dslCli config setting: something-weird. Please set it to 'structurizr-cli' or 'docker'.",
    );
    expect(execSyncMock).not.toHaveBeenCalled();
  });

  it('should handle missing dslCli config gracefully', async () => {
    pathExistsMock.mockResolvedValue(true);
    getStrConfigMock.mockImplementation((key: string) => {
      switch (key) {
        case 'dslCli':
          return '';
        case 'rootFolder':
          return 'src';
        case 'workspaceDsl':
          return 'workspace.dsl';
        default:
          return undefined;
      }
    });

    await cmdDsl();

    expect(errorMock).toHaveBeenCalledWith(
      "Unknown dslCli config setting: . Please set it to 'structurizr-cli' or 'docker'.",
    );
    expect(execSyncMock).not.toHaveBeenCalled();
  });

  it('should log error if execSync throws an Error', async () => {
    pathExistsMock.mockResolvedValue(true);
    getStrConfigMock.mockImplementation((key: string) => {
      switch (key) {
        case 'dslCli':
          return 'structurizr-cli';
        case 'rootFolder':
          return 'src';
        case 'workspaceDsl':
          return 'workspace.dsl';
        default:
          return undefined;
      }
    });
    execSyncMock.mockImplementation(() => {
      throw new Error('mock exec failure');
    });

    await cmdDsl();

    expect(errorMock).toHaveBeenCalledWith('Failed to execute DSL command.');
    expect(errorMock).toHaveBeenCalledWith('mock exec failure');
  });

  it('should log error if execSync throws non-Error', async () => {
    pathExistsMock.mockResolvedValue(true);
    getStrConfigMock.mockImplementation((key: string) => {
      switch (key) {
        case 'dslCli':
          return 'structurizr-cli';
        case 'rootFolder':
          return 'src';
        case 'workspaceDsl':
          return 'workspace.dsl';
        default:
          return undefined;
      }
    });
    execSyncMock.mockImplementation(() => {
      throw new Error(String('non-error exception'));
    });

    await cmdDsl();

    expect(errorMock).toHaveBeenCalledWith('Failed to execute DSL command.');
  });

  it('should log error if rootFolder is missing', async () => {
    await cmdDsl();

    expect(errorMock).toHaveBeenCalledWith('Failed to execute DSL command.');
    expect(execSyncMock).toHaveBeenCalled();
  });

  it('should log error if workspaceDsl is missing', async () => {
    await cmdDsl();

    expect(errorMock).toHaveBeenCalledWith('Failed to execute DSL command.');
    expect(execSyncMock).toHaveBeenCalled();
  });

  it('should treat whitespace-only dslCli as unknown', async () => {
    pathExistsMock.mockResolvedValue(true);
    getStrConfigMock.mockImplementation((key: string) => {
      switch (key) {
        case 'dslCli':
          return '';
        case 'rootFolder':
          return 'src';
        case 'workspaceDsl':
          return 'workspace.dsl';
        default:
          return undefined;
      }
    });

    await cmdDsl();

    expect(errorMock).toHaveBeenCalledWith(
      "Unknown dslCli config setting: . Please set it to 'structurizr-cli' or 'docker'.",
    );
    expect(execSyncMock).not.toHaveBeenCalled();
  });
});
