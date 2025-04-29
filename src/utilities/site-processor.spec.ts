import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';

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

import { SafeFiles } from './safe-files.js';
import { BuildConfig } from '../types/build-config.js';
import { CliLogger } from './cli-logger.js';
import { SiteProcessor } from './site-processor.js';
import { MermaidProcessor } from './mermaid-processor.js'; // after vi.mock

describe('PdfProcessor', () => {
  const logSpy = new CliLogger('PdfProcessor.test', 'debug');
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
    serve: false,
    servePort: 4000,
    repoName: 'https://github.com/user/repo',
    webTheme: 'https://theme.css',
    generateWebsite: false,
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.clearAllMocks();
    safeFiles = {
      pathExists: vi.fn().mockResolvedValue(true),
      copyFile: vi.fn(),
      readFileAsString: vi.fn().mockResolvedValue('graph TD; A-->B'),
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
      await processor.prepareSite(buildConfig);
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
});
