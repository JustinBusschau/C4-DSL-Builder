import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { ProjectCreator } from '../utilities/project-creator.js';
import { ConfigManager } from '../utilities/config-manager.js';
import { Structurizr } from '../utilities/structurizr.js';
import { MarkdownProcessor } from '../utilities/markdown-processor.js';
import { CliLogger } from '../utilities/cli-logger.js';
import { PdfProcessor } from '../utilities/pdf-processor.js';
import { BuildConfig } from '../types/build-config.js';
import { SiteProcessor } from '../utilities/site-processor.js';
import { EventEmitter } from 'events';

const createServerMock = vi.fn(() => ({
  listen: vi.fn((_port: number, callback: () => void) => {
    callback();
  }),
}));

vi.mock('http', async () => {
  const actual = await vi.importActual<typeof import('http')>('http');
  return {
    ...actual,
    createServer: createServerMock,
  };
});

vi.mock('chokidar', () => {
  const watchMock = new EventEmitter();
  return {
    default: {
      watch: vi.fn(() => watchMock),
    },
    FSWatcher: class extends EventEmitter {
      close = vi.fn();
    },
  };
});

vi.mock('chalk', () => ({
  default: {
    green: (txt: string) => txt,
    grey: (txt: string) => txt,
    blue: (txt: string) => txt,
    yellow: (txt: string) => txt,
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

vi.mock('../utilities/port-utils.js', async () => {
  const actual = await vi.importActual<typeof import('../utilities/port-utils.js')>(
    '../utilities/port-utils.js',
  );
  return {
    ...actual,
    findAvailablePort: vi.fn(actual.findAvailablePort),
  };
});

vi.stubGlobal('import', async (specifier: string) => {
  if (specifier === 'http') {
    return {
      default: {
        createServer: createServerMock,
      },
    };
  }
  return (await import(specifier)) as unknown;
});

describe('CLI integration tests', () => {
  const logSpy = new CliLogger('CLI.test', 'debug');
  let buildConfig: BuildConfig;

  beforeEach(async () => {
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
      servePort: 3030,
      repoName: 'https://github.com/user/repo',
      webTheme: 'https://theme.css',
      generateWebsite: false,
    };
    const getAllMock = vi.fn().mockResolvedValue(buildConfig);
    ConfigManager.prototype.getAllStoredConfig = getAllMock;

    process.argv = ['node', 'cli'];
  });

  afterEach(() => {
    vi.resetAllMocks();
    createServerMock.mockReset();
  });

  it('runs "new" and triggers project creation', async () => {
    const createMock = vi.fn();
    ProjectCreator.prototype.createNewProject = createMock;

    process.argv = ['node', 'cli', 'new'];
    const { run } = await import('./cli.js');
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
    const { run } = await import('./cli.js');
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
    const { run } = await import('./cli.js');
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
    const { run } = await import('./cli.js');
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
    const { run } = await import('./cli.js');
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
    const { run } = await import('./cli.js');
    await run(logSpy);

    expect(prepareMock).toHaveBeenCalled();
    expect(prepareMock).toHaveBeenCalledWith(buildConfig);
    expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Generating Markdown'));
  });

  it('runs "pdf" and generates PDF documentation', async () => {
    const prepareMock = vi.fn();
    PdfProcessor.prototype.preparePdf = prepareMock;

    process.argv = ['node', 'cli', 'pdf'];
    const { run } = await import('./cli.js');
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
    const { run } = await import('./cli.js');
    await run(logSpy);

    process.stderr.write = originalStderrWrite;
    process.exit = originalExit;

    expect(errorOutput).toMatch(/Usage|help|unknown command/i);
    expect(exitMock).toHaveBeenCalledWith(1);
  });

  it('runs "site" and generates docsify site files', async () => {
    const prepareMock = vi.fn();
    SiteProcessor.prototype.prepareSite = prepareMock;

    process.argv = ['node', 'cli', 'site'];
    const { run } = await import('./cli.js');
    await run(logSpy);

    expect(prepareMock).toHaveBeenCalledWith(buildConfig);
    expect(mockLogger.log).toHaveBeenCalledTimes(3);
    expect(mockLogger.log).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('Generating docsify site'),
    );
    expect(mockLogger.log).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('Serving docsify site'),
    );
    expect(mockLogger.log).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('Serving mock-distFolder at http://localhost:3030'),
    );
  });

  it('runs "site" and watches for changes', async () => {
    process.argv = ['node', 'cli', 'site', '--watch'];
    const { run } = await import('./cli.js');
    await run(logSpy);

    expect(mockLogger.log).toHaveBeenCalledTimes(4);
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
    expect(mockLogger.log).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('Serving mock-distFolder at http://localhost:3030'),
    );
  });

  it('runs "site" and generates docsify site files', async () => {
    process.argv = ['node', 'cli', 'site', '--no-serve'];
    const { run } = await import('./cli.js');
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
    const { run } = await import('./cli.js');
    await run(logSpy);

    expect(mockLogger.log).toHaveBeenCalledTimes(4);
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
    expect(mockLogger.log).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining(`Serving mock-distFolder at http://localhost:8383`),
    );
  });

  it('runs "site --watch" and rebuilds on file changes', async () => {
    const prepareMock = vi.fn();
    SiteProcessor.prototype.prepareSite = prepareMock;

    const { default: chokidar } = await import('chokidar');
    const watchMock = chokidar.watch as unknown as Mock;

    process.argv = ['node', 'cli', 'site', '--watch'];
    const { run } = await import('./cli.js');
    await run(logSpy);

    const watcher = watchMock.mock.results[0].value as EventEmitter;

    watcher.emit('all', 'somefile.md');

    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(prepareMock).toHaveBeenCalledTimes(3);
  });

  it('rebuilds diagrams when _dsl/ws.d changes', async () => {
    const extractMock = vi.fn();
    Structurizr.prototype.extractMermaidDiagramsFromDsl = extractMock;

    const { default: chokidar } = await import('chokidar');
    const watchMock = chokidar.watch as unknown as Mock;

    process.argv = ['node', 'cli', 'site', '--watch'];
    const { run } = await import('./cli.js');
    await run(logSpy);

    const dslWatcher = watchMock.mock.results[1].value as EventEmitter;

    dslWatcher.emit('change', '_dsl/ws.d');

    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('changed. Extracting Mermaid diagrams from DSL'),
    );
    expect(extractMock).toHaveBeenCalledTimes(3);
    expect(extractMock).toHaveBeenCalledWith(
      buildConfig.dslCli,
      buildConfig.rootFolder,
      buildConfig.workspaceDsl,
    );
  });

  it('sourceWatcher ignores dotfiles and underscore folders', async () => {
    const prepareMock = vi.fn();
    SiteProcessor.prototype.prepareSite = prepareMock;

    const { default: chokidar } = await import('chokidar');
    const watchMock = chokidar.watch as unknown as Mock;

    process.argv = ['node', 'cli', 'site', '--watch'];
    const { run } = await import('./cli.js');
    await run(logSpy);

    const watchCallArgs = watchMock.mock.calls[0][1];
    const ignoredFn = watchCallArgs.ignored as (path: string) => boolean;

    expect(ignoredFn('/some/path/.git')).toBe(true);
    expect(ignoredFn('/some/path/_build')).toBe(true);
    expect(ignoredFn('/some/path/normal-folder')).toBe(false);
    expect(ignoredFn('/some/path/normal-folder/file.md')).toBe(false);
    expect(ignoredFn('/some/path/_private/notes.md')).toBe(true);
  });

  it('starts a static server to serve generated files', async () => {
    process.argv = ['node', 'cli', 'site'];
    const { run } = await import('./cli.js');
    await run(logSpy);

    expect(createServerMock).toHaveBeenCalledTimes(1);

    const server = createServerMock.mock.results[0].value;

    expect(server.listen).toHaveBeenCalledTimes(1);
    expect(server.listen).toHaveBeenCalledWith(buildConfig.servePort, expect.any(Function));

    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining(
        `Serving ${buildConfig.distFolder} at http://localhost:${buildConfig.servePort}`,
      ),
    );
  });

  it('falls back to another port if the requested one is busy', async () => {
    const { findAvailablePort } = await import('../utilities/port-utils.js');

    (findAvailablePort as unknown as Mock).mockResolvedValueOnce(4040);

    process.argv = ['node', 'cli', 'site', '--port', '3030'];
    const { run } = await import('./cli.js');
    await run(logSpy);

    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('Port 3030 is busy. Using available port 4040 instead.'),
    );
  });
});
