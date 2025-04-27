import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectCreator } from '../utilities/project-creator.js';
import { ConfigManager } from '../utilities/config-manager.js';
import { Structurizr } from '../utilities/structurizr.js';
import { MarkdownProcessor } from '../utilities/markdown-processor.js';
import { CliLogger } from '../utilities/cli-logger.js';
import { PdfProcessor } from '../utilities/pdf-processor.js';
import { BuildConfig } from '../types/build-config.js';

vi.mock('chalk', () => ({
  default: {
    green: (txt: string) => txt,
    grey: (txt: string) => txt,
    blue: (txt: string) => txt,
    bgGreen: (txt: string) => txt,
  },
}));

vi.mock('figlet', () => ({
  default: {
    textSync: (text: string) => text,
  },
}));

const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn(),
};

vi.mock('../utilities/cli-logger.js', () => ({
  CliLogger: vi.fn(() => mockLogger),
}));

const { run } = await import('./cli.js');

describe('CLI integration tests', () => {
  const logSpy = new CliLogger('CLI.test', 'debug');
  let buildConfig: BuildConfig;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.clearAllMocks();

    buildConfig = {
      projectName: 'mock-projectName',
      homepageName: 'mock-homepageName',
      rootFolder: 'mock-rootFolder',
      distFolder: 'mock-distFolder',
      dslCli: 'structurizr-cli',
      embedMermaidDiagrams: false,
      pdfCss: 'mock-pdfCss',
      workspaceDsl: 'mock-workspaceDsl',
      serve: true,
      servePort: 3000,
    };
    const getAllMock = vi.fn().mockResolvedValue(buildConfig);
    ConfigManager.prototype.getAllStoredConfig = getAllMock;

    process.argv = ['node', 'cli'];
  });

  it('runs "new" and triggers project creation', async () => {
    const createMock = vi.fn();
    ProjectCreator.prototype.createNewProject = createMock;

    process.argv = ['node', 'cli', 'new'];
    await run(logSpy);

    expect(createMock).toHaveBeenCalled();
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('Enhance your C4 Modelling'),
    );
  });

  it('runs "config --list" and lists config', async () => {
    const listMock = vi.fn();
    ConfigManager.prototype.listConfig = listMock;

    process.argv = ['node', 'cli', 'config', '--list'];
    await run(logSpy);

    expect(listMock).toHaveBeenCalled();
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('Listing current configuration ...'),
    );
  });

  it('runs "config --reset" and resets config', async () => {
    const resetMock = vi.fn();
    ConfigManager.prototype.resetConfig = resetMock;

    process.argv = ['node', 'cli', 'config', '--reset'];
    await run(logSpy);

    expect(resetMock).toHaveBeenCalled();
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('Resetting current configuration ...'),
    );
  });

  it('runs "config" with no options and sets config', async () => {
    const setMock = vi.fn();
    ConfigManager.prototype.setConfig = setMock;

    process.argv = ['node', 'cli', 'config'];
    await run(logSpy);

    expect(setMock).toHaveBeenCalled();
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('Generating new configuration ...'),
    );
  });

  it('runs "dsl" and extracts Mermaid diagrams', async () => {
    const extractMock = vi.fn();
    Structurizr.prototype.extractMermaidDiagramsFromDsl = extractMock;

    ConfigManager.prototype.getStrConfigValue = (key: string): string => `mock-${key}`;

    process.argv = ['node', 'cli', 'dsl'];
    await run(logSpy);

    expect(extractMock).toHaveBeenCalledWith('mock-dslCli', 'mock-rootFolder', 'mock-workspaceDsl');
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('Extracting Mermaid diagrams from DSL'),
    );
  });

  it('runs "md" and generates markdown documentation', async () => {
    const prepareMock = vi.fn();
    MarkdownProcessor.prototype.prepareMarkdown = prepareMock;

    process.argv = ['node', 'cli', 'md'];
    await run(logSpy);

    expect(prepareMock).toHaveBeenCalled();
    expect(prepareMock).toHaveBeenCalledWith(buildConfig);
    expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Generating Markdown'));
  });

  it('runs "pdf" and generates PDF documentation', async () => {
    const prepareMock = vi.fn();
    PdfProcessor.prototype.preparePdf = prepareMock;

    process.argv = ['node', 'cli', 'pdf'];
    await run(logSpy);

    expect(prepareMock).toHaveBeenCalledWith(buildConfig);
    expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Generating PDF'));
  });

  it('handles unknown command gracefully (help text shown)', async () => {
    let errorOutput = '';
    const originalStderrWrite = process.stderr.write;
    const originalExit = process.exit;

    process.stderr.write = ((chunk: string | Uint8Array): boolean => {
      errorOutput += chunk.toString();
      return true;
    }) as typeof process.stderr.write;

    const exitMock = vi.fn();
    // @ts-expect-error: we're mocking process.exit for testing
    process.exit = exitMock;

    process.argv = ['node', 'cli', 'unknown'];
    await run(logSpy);

    process.stderr.write = originalStderrWrite;
    process.exit = originalExit;

    expect(errorOutput).toMatch(/Usage|help|unknown command/i);
    expect(exitMock).toHaveBeenCalledWith(1);
  });

  it('runs "site" and generates docsify site files', async () => {
    process.argv = ['node', 'cli', 'site'];
    await run(logSpy);

    expect(mockLogger.log).toHaveBeenCalledTimes(2);
    expect(mockLogger.log).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('Generating docsify'),
    );
    expect(mockLogger.log).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('Generating docsify site'),
    );
  });

  it('runs "site" and watches for changes', async () => {
    process.argv = ['node', 'cli', 'site', '--watch'];
    await run(logSpy);

    expect(mockLogger.log).toHaveBeenCalledTimes(3);
    expect(mockLogger.log).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('Generating docsify'),
    );
    expect(mockLogger.log).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('Serving docsify site'),
    );
    expect(mockLogger.log).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('Watching for changes'),
    );
  });

  it('runs "site" and generates docsify site files', async () => {
    process.argv = ['node', 'cli', 'site', '--no-serve'];
    await run(logSpy);

    expect(mockLogger.log).toHaveBeenCalledTimes(2);
    expect(mockLogger.log).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('Generating docsify'),
    );
    expect(mockLogger.log).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('Building docsify site [no serve]'),
    );
  });

  it('runs "site" and serves docsify site on requested port', async () => {
    const port = '8383';
    process.argv = ['node', 'cli', 'site', '--port', port];
    await run(logSpy);

    expect(mockLogger.log).toHaveBeenCalledTimes(3);
    expect(mockLogger.log).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('Generating docsify'),
    );
    expect(mockLogger.log).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining(`Serving on port ${port}`),
    );
    expect(mockLogger.log).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining(`Serving docsify site`),
    );
  });
});
