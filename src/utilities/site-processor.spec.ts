import { vi, describe, it, expect, beforeEach, afterAll, type Mock } from 'vitest';

const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn(),
};

vi.mock('./cli-logger.js', () => ({
  CliLogger: vi.fn(() => mockLogger),
}));

vi.mock('./mermaid-processor.js', () => ({
  MermaidProcessor: vi.fn(() => ({
    diagramFromMermaidString: vi.fn().mockResolvedValue(undefined),
    generateUniqueMmdFilename: vi.fn().mockResolvedValue('test.svg'),
  })),
}));

import fs from 'node:fs/promises';
import path from 'node:path';
import { SafeFiles } from './safe-files.js';
import { BuildConfig } from '../types/build-config.js';
import { CliLogger } from './cli-logger.js';
import { SiteProcessor } from './site-processor.js';
import { MermaidProcessor } from './mermaid-processor.js';

describe('SiteProcessor', () => {
  const logSpy = new CliLogger('SiteProcessor.test', 'debug');
  let mermaid: MermaidProcessor;
  let processor: SiteProcessor;
  let safeFiles: SafeFiles;
  const buildConfig: BuildConfig = {
    rootFolder: 'root',
    distFolder: 'dist',
    embedMermaidDiagrams: true,
    homepageName: 'Home',
    projectName: 'Project',
    dslCli: 'docker',
    workspaceDsl: '',
    pdfCss: '',
    servePort: 4000,
    repoName: 'https://github.com/user/repo',
    webTheme: 'https://theme.css',
    webSearch: true,
    docsifyTemplate: '',
    serve: false,
    generateWebsite: false,
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.clearAllMocks();
    safeFiles = {
      pathExists: vi.fn().mockResolvedValue(true),
      copyFile: vi.fn(),
      readFileAsString: vi
        .fn()
        .mockResolvedValueOnce(JSON.stringify({ version: 1, files: {} }, null, 2))
        .mockResolvedValue('graph TD; A-->B'),
      writeFile: vi.fn(),
      removeFile: vi.fn(),
      ensureDir: vi.fn(),
      emptySubFolder: vi.fn().mockResolvedValue(true),
      generateTree: vi.fn().mockResolvedValue([]),
      getFolderName: vi.fn().mockReturnValue('Folder'),
    } as unknown as SafeFiles;
    mermaid = new MermaidProcessor();
    processor = new SiteProcessor(safeFiles, logSpy, mermaid);
  });

  afterAll(async () => {
    try {
      await fs.rm('./__temp__', { recursive: true, force: true });
    } catch {
      // Ignore errors - directory might not exist
    }
  });

  describe('prepareSite', () => {
    it('validates target folder and initializes site generation', async () => {
      await processor.prepareSite(buildConfig);
      expect(safeFiles.generateTree).toHaveBeenCalled();
      expect(logSpy.log).toHaveBeenCalledTimes(3);
      expect(logSpy.log).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('Building SITE documentation'),
      );
      expect(logSpy.log).toHaveBeenNthCalledWith(2, expect.stringContaining('Parsed 0 folders.'));
      expect(logSpy.log).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('SITE documentation generated successfully'),
      );
    });

    it('logs error if dist folder is missing or invalid', async () => {
      buildConfig.distFolder = '';
      await processor.prepareSite(buildConfig);
      expect(logSpy.error).toHaveBeenCalledWith(expect.stringContaining('Please run `config`'));
    });

    it('logs error if dist folder cannot be prepared', async () => {
      vi.spyOn(safeFiles, 'emptySubFolder').mockResolvedValueOnce(false);
      buildConfig.distFolder = 'dest';
      await processor.prepareSite(buildConfig, true);
      expect(logSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to empty the target folder'),
      );
    });

    it('correctly adjusts image URLs when generating a website', async () => {
      (safeFiles.generateTree as unknown as Mock).mockResolvedValue([
        {
          dir: 'root/folder',
          name: 'TestPage',
          level: 0,
          mdFiles: [
            {
              name: 'test.md',
              content: '[a link](test.mmd)',
            },
          ],
        },
      ]);

      (safeFiles.pathExists as unknown as Mock).mockResolvedValue(true);
      (safeFiles.readFileAsString as unknown as Mock).mockResolvedValue('graph TD; A-->B');
      (safeFiles.copyFile as unknown as Mock).mockResolvedValue(undefined);
      (safeFiles.ensureDir as unknown as Mock).mockResolvedValue(undefined);
      (safeFiles.writeFile as unknown as Mock).mockResolvedValue(undefined);

      buildConfig.generateWebsite = true;

      await processor.prepareSite(buildConfig);

      // Confirm that the flow handled image generation path special logic
      expect(logSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('SITE documentation generated successfully'),
      );
    });

    it('properly processes markdown links with custom link handler', async () => {
      (safeFiles.generateTree as unknown as Mock).mockResolvedValue([
        {
          dir: 'root/folder',
          name: 'TestPage',
          level: 0,
          mdFiles: [
            {
              name: 'linked.md',
              content: '[Click here](file.txt)',
            },
          ],
        },
      ]);

      (safeFiles.pathExists as unknown as Mock).mockResolvedValue(true);
      (safeFiles.readFileAsString as unknown as Mock).mockResolvedValue('dummy content');
      (safeFiles.copyFile as unknown as Mock).mockResolvedValue(undefined);
      (safeFiles.ensureDir as unknown as Mock).mockResolvedValue(undefined);
      (safeFiles.writeFile as unknown as Mock).mockResolvedValue(undefined);

      await processor.prepareSite(buildConfig);

      // Check that it copied a linked file (triggering copyLinkedFiles), showing link processed
      expect(logSpy.info).toHaveBeenCalledWith(expect.stringContaining('Copied file to'));
    });
  });

  it('properly processes mermaid files when not embedding mermaid blocks', async () => {
    (safeFiles.generateTree as unknown as Mock).mockResolvedValue([
      {
        dir: 'root/folder',
        name: 'TestPage',
        level: 0,
        mdFiles: [
          {
            name: 'linked.md',
            content: '# Mermaid\n\n```mermaid\nflowchart LR\n    id\n```\n',
          },
        ],
      },
    ]);

    (safeFiles.pathExists as unknown as Mock).mockResolvedValue(true);
    (safeFiles.readFileAsString as unknown as Mock).mockResolvedValue('dummy content');
    (safeFiles.copyFile as unknown as Mock).mockResolvedValue(undefined);
    (safeFiles.ensureDir as unknown as Mock).mockResolvedValue(undefined);
    (safeFiles.writeFile as unknown as Mock).mockResolvedValue(undefined);

    await processor.prepareSite({ ...buildConfig, embedMermaidDiagrams: false });

    expect(logSpy.info).toHaveBeenCalledWith(
      expect.stringContaining('Converting Mermaid documents in linked.md to linked SVG images ...'),
    );
  });

  it('uses a custom docsify template if provided and valid', async () => {
    // Create a temporary custom template module
    const customTemplatePath = path.resolve('./__temp__/custom-template.js');
    await fs.mkdir(path.dirname(customTemplatePath), { recursive: true });
    const customHtml = '<html><body><h1>Custom Template</h1></body></html>';
    const templateSource = `
      export function docsifyTemplate(options) {
        return \`${customHtml}\`;
      }
    `;
    await fs.writeFile(customTemplatePath, templateSource, 'utf-8');

    // Update config to use the dynamic template
    buildConfig.docsifyTemplate = customTemplatePath;
    (safeFiles.generateTree as unknown as Mock).mockResolvedValue([]);

    const writeFileSpy = vi.spyOn(safeFiles, 'writeFile').mockResolvedValue();

    await processor.prepareSite(buildConfig);

    const indexWrite = writeFileSpy.mock.calls.find((call) => call[0].endsWith('index.html'));

    expect(indexWrite?.[1]).toContain('Custom Template');
    expect(logSpy.error).not.toHaveBeenCalled();
  });

  it('falls back to default template and logs error if custom template import fails', async () => {
    buildConfig.docsifyTemplate = './nonexistent-template.js';
    (safeFiles.generateTree as unknown as Mock).mockResolvedValue([]);

    const writeFileSpy = vi.spyOn(safeFiles, 'writeFile').mockResolvedValue();

    await processor.prepareSite(buildConfig);

    const indexWrite = writeFileSpy.mock.calls.find((call) => call[0].endsWith('index.html'));

    expect(indexWrite?.[1]).toContain('<!DOCTYPE html>');
    expect(logSpy.error).toHaveBeenCalledWith(
      expect.stringContaining('Error loading custom docsify template'),
      expect.anything(),
    );
  });

  it('falls back to default template and logs warning if custom template is missing export', async () => {
    // Create invalid module without expected export
    const invalidTemplatePath = path.resolve('./__temp__/invalid-template.js');
    await fs.mkdir(path.dirname(invalidTemplatePath), { recursive: true });
    await fs.writeFile(invalidTemplatePath, 'export const notTemplate = 123;', 'utf-8');

    buildConfig.docsifyTemplate = invalidTemplatePath;
    (safeFiles.generateTree as unknown as Mock).mockResolvedValue([]);

    const writeFileSpy = vi.spyOn(safeFiles, 'writeFile').mockResolvedValue();

    await processor.prepareSite(buildConfig);

    const indexWrite = writeFileSpy.mock.calls.find((call) => call[0].endsWith('index.html'));

    expect(indexWrite?.[1]).toContain('<!DOCTYPE html>');
    expect(logSpy.warn).toHaveBeenCalledWith(expect.stringContaining('does not export a valid'));
  });

  it('skips processing if only .mmd files are present and unchanged', async () => {
    const mmdFile = {
      name: 'diagram.mmd',
      content: 'graph TD; A-->B',
    };

    const treeItem = {
      dir: 'root/diagrams',
      name: 'Diagrams',
      level: 0,
      mdFiles: [],
      mmdFiles: [mmdFile],
    };

    (safeFiles.generateTree as unknown as Mock).mockResolvedValue([treeItem]);

    const hasChangedSpy = vi.spyOn(processor['cache'], 'hasChanged').mockResolvedValue(false);

    await processor.prepareSite(buildConfig);

    expect(hasChangedSpy).toHaveBeenCalledWith(path.join(treeItem.dir, mmdFile.name));
    expect(logSpy.info).toHaveBeenCalledWith(
      expect.stringContaining('Skipping unchanged item: Diagrams'),
    );
  });

  it('marks .mmd files as processed if changed', async () => {
    const mmdFile = {
      name: 'diagram.mmd',
      content: 'graph TD; A-->B',
    };

    const treeItem = {
      dir: 'root/diagrams',
      name: 'Diagrams',
      level: 0,
      mdFiles: [],
      mmdFiles: [mmdFile],
    };

    (safeFiles.generateTree as unknown as Mock).mockResolvedValue([treeItem]);

    const hasChangedSpy = vi.spyOn(processor['cache'], 'hasChanged').mockResolvedValue(true);

    const markProcessedSpy = vi.spyOn(processor['cache'], 'markProcessed').mockResolvedValue();

    await processor.prepareSite(buildConfig);

    expect(hasChangedSpy).toHaveBeenCalledWith(path.join(treeItem.dir, mmdFile.name));
    expect(markProcessedSpy).toHaveBeenCalledWith(path.join(treeItem.dir, mmdFile.name));
  });

  it('copies the webTheme, if a local file, to the dist folder', async () => {
    await processor.prepareSite({ ...buildConfig, webTheme: 'theme.css' });
    expect(safeFiles.copyFile).toHaveBeenCalled();
  });

  it('logs an error if the webTheme, as a local file, does not exist', async () => {
    (safeFiles.pathExists as unknown as Mock).mockResolvedValue(false);
    await processor.prepareSite({ ...buildConfig, webTheme: 'theme.css' });

    expect(logSpy.error).toHaveBeenCalledWith(
      expect.stringContaining('Could not find docsufy theme (CSS) file at'),
    );
  });
});
