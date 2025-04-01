import { registerCommands, run } from './cli.js';
import { logger } from './utilities/logger.js';

jest.mock('unified', () => ({
  unified: jest.fn(),
}));
jest.mock('remark-parse', () => jest.fn());
jest.mock('remark-stringify', () => jest.fn());
jest.mock('unist-util-visit', () => jest.fn());

jest.mock('../../package.json', () => ({
  name: 'c4-dsl-builder',
  version: '1.0.0',
}));

jest.mock('clear', () => jest.fn());

describe('Register commands', () => {
  let originalArgv: string[];

  beforeEach(() => {
    originalArgv = process.argv;
    jest.resetModules();
  });

  afterEach(() => {
    process.argv = originalArgv;
    jest.clearAllMocks();
  });

  const testCommand = (cmd: string[], expectedOutput: string, expectError: boolean = false) => {
    const logSpy = jest.spyOn(logger, 'log').mockImplementation(() => {});
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});

    process.argv = ['node', 'cli', ...cmd];
    const program = registerCommands();
    program.parse(process.argv);

    const output = logSpy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(output).toContain(expectedOutput);

    if (expectError) {
      expect(errorSpy).toHaveBeenCalled();
    } else {
      expect(errorSpy).not.toHaveBeenCalled();
    }
  };

  it('should execute new command', () => {
    jest.mock('clear', () => jest.fn());
    testCommand(['new'], 'Enhance your C4 Modelling');
  });

  it('should execute config command', () => {
    testCommand(['config'], 'Configure your project settings');
  });

  it('should execute list command', () => {
    testCommand(['list'], 'Current Configuration');
  });

  it('should execute reset command', () => {
    testCommand(['reset'], 'Configuration has been reset');
  });

  it('should execute dsl command', () => {
    testCommand(['dsl'], 'Please make sure the DSL file exists before running this command.', true);
  });

  it('should execute md command without options', () => {
    testCommand(['md'], 'Generating Markdown ...', true);
  });

  it('should execute md command with --split', () => {
    testCommand(['md', '--split'], 'Generating split Markdown ...', true);
  });

  it('should execute pdf command with --split', () => {
    testCommand(['pdf', '--split'], 'PDF command executed');
  });

  it('should execute site command with --watch and --port', () => {
    testCommand(['site', '--watch', '--port', '8080'], 'Site command executed');
  });
});

describe('Run', () => {
  it('should run the CLI entry point and parse arguments', () => {
    const logSpy = jest.spyOn(logger, 'log').mockImplementation(() => {});

    const originalArgv = process.argv;
    process.argv = ['node', 'cli', 'config'];

    run();

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Configure your project settings'));

    process.argv = originalArgv;
  });
});
