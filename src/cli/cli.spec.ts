import { jest } from '@jest/globals';

// Mocks
const logMock = jest.fn();
const errorMock = jest.fn();
const getIntroTextMock = jest.fn(() => 'Enhance your C4 Modelling');
const cmdNewProjectMock = jest.fn();
const cmdConfigMock = jest.fn();
const cmdListConfigMock = jest.fn();
const cmdResetConfigMock = jest.fn();
const cmdDslMock = jest.fn();

// 👇 Use new logger API
jest.unstable_mockModule('./utilities/logger.js', () => ({
  createLogger: () => ({
    log: logMock,
    error: errorMock,
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  }),
}));

jest.unstable_mockModule('./commands/cmdNewProject.js', () => ({
  cmdNewProject: cmdNewProjectMock,
}));

jest.unstable_mockModule('./utilities/intro.js', () => ({
  getIntroText: getIntroTextMock,
}));

jest.unstable_mockModule('./commands/cmdConfig.js', () => ({
  cmdConfig: cmdConfigMock,
}));

jest.unstable_mockModule('./commands/cmdListConfig.js', () => ({
  cmdListConfig: cmdListConfigMock,
}));

jest.unstable_mockModule('./commands/cmdResetConfig.js', () => ({
  cmdResetConfig: cmdResetConfigMock,
}));

jest.unstable_mockModule('./commands/cmdDsl.js', () => ({
  cmdDsl: cmdDslMock,
}));

// These will be assigned inside isolateModules
let run: typeof import('./cli.js').run;
let registerCommands: typeof import('./cli.js').registerCommands;

beforeEach(async () => {
  // Reset mocks
  logMock.mockReset();
  errorMock.mockReset();
  cmdNewProjectMock.mockReset();
  cmdConfigMock.mockReset();
  getIntroTextMock.mockReset();
  cmdListConfigMock.mockReset();
  cmdResetConfigMock.mockReset();
  cmdDslMock.mockReset();

  // Reset CLI args
  process.argv = ['node', 'cli'];

  await jest.isolateModulesAsync(async () => {
    const cli = await import('./cli.js');
    run = cli.run;
    registerCommands = cli.registerCommands;
  });
});

describe('Register commands', () => {
  const testCommand = (cmd: string[], expectedOutput = '', expectError = '') => {
    process.argv = ['node', 'cli', ...cmd];
    const program = registerCommands();
    program.parse(process.argv);

    if (expectedOutput !== '') {
      expect(logMock).toHaveBeenCalledWith(expect.stringContaining(expectedOutput));
    }

    if (expectError !== '') {
      expect(errorMock).toHaveBeenCalledWith(expectError);
    } else {
      expect(errorMock).not.toHaveBeenCalled();
    }
  };

  it("should call getIntroText and cmdNewProject when running 'new'", () => {
    testCommand(['new']);

    expect(getIntroTextMock).toHaveBeenCalled();
    expect(cmdNewProjectMock).toHaveBeenCalled();
  });

  it("should call cmdConfig when running 'config'", () => {
    testCommand(['config']);
    expect(cmdConfigMock).toHaveBeenCalled();
  });

  it("should call cmdListConfig when running 'list'", () => {
    testCommand(['list']);
    expect(cmdListConfigMock).toHaveBeenCalled();
  });

  it("should call cmdResetConfig when running 'reset'", () => {
    testCommand(['reset']);
    expect(cmdResetConfigMock).toHaveBeenCalled();
  });

  it("should call cmdDsl when running 'dsl'", () => {
    testCommand(['dsl']);
    expect(cmdDslMock).toHaveBeenCalled();
  });
});

describe('Run', () => {
  it('should run the CLI entry point and parse arguments', async () => {
    process.argv = ['node', 'cli', 'new'];
    await run();

    expect(getIntroTextMock).toHaveBeenCalled();
    expect(cmdNewProjectMock).toHaveBeenCalled();
  });
});
