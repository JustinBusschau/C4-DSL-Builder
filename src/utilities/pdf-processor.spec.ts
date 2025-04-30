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

vi.mock('md-to-pdf', () => {
  return {
    mdToPdf: vi.fn(async () => ({
      filename: 'output.pdf',
      buffer: Buffer.from('PDF binary content'),
    })),
  };
});

import { SafeFiles } from './safe-files.js';
import { BuildConfig } from '../types/build-config.js';
import { TreeItem } from '../types/tree-item.js';
import { CliLogger } from './cli-logger.js';
import { PdfProcessor } from './pdf-processor.js';
import { mdToPdf } from 'md-to-pdf';

const mockedMdToPdf = mdToPdf as unknown as Mock;

describe('PdfProcessor', () => {
  const logSpy = new CliLogger('PdfProcessor.test', 'debug');
  let processor: PdfProcessor;
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
    generateWebsite: false,
    docsifyTemplate: '',
    serve: false,
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
      emptySubFolder: vi.fn().mockResolvedValue(true),
      generateTree: vi.fn().mockResolvedValue([]),
      getFolderName: vi.fn().mockReturnValue('Folder'),
    } as unknown as SafeFiles;
    processor = new PdfProcessor(safeFiles, logSpy);
  });

  describe('generateMarkdownFromTree', () => {
    it('generates README.md with headers and table of contents', async () => {
      const tree: TreeItem[] = [
        {
          dir: '/root',
          name: 'Home',
          level: 0,
          parent: null,
          mdFiles: [{ name: 'home.md', content: '# Welcome' }],
          mmdFiles: [],
          descendants: [],
        },
      ];
      await processor.generatePdfFromTree(tree, buildConfig);
      expect(safeFiles.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('Project_TEMP.md'),
        expect.stringContaining('[Home](#Home)'),
      );
      expect(safeFiles.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('Project_TEMP.md'),
        expect.stringContaining('# Welcome'),
      );
    });

    it('logs error if markdown write fails', async () => {
      const err = new Error('Write failed');
      vi.spyOn(safeFiles, 'writeFile').mockRejectedValue(err);
      await processor.generatePdfFromTree([], buildConfig);
      expect(logSpy.error).toHaveBeenCalledWith(
        'Failed to write temporary file Project_TEMP.md',
        err,
      );
    });
  });

  describe('preparePdf', () => {
    it('validates target folder and initializes PDF generation', async () => {
      await processor.preparePdf(buildConfig);
      expect(safeFiles.generateTree).toHaveBeenCalled();
      expect(logSpy.log).toHaveBeenCalledTimes(3);
      expect(logSpy.log).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('Building PDF documentation'),
      );
      expect(logSpy.log).toHaveBeenNthCalledWith(2, expect.stringContaining('Parsed 0 folders.'));
      expect(logSpy.log).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('PDF documentation generated successfully'),
      );
      expect(mockedMdToPdf).toHaveBeenCalledWith(
        expect.objectContaining({ path: expect.any(String) }),
        expect.objectContaining({ stylesheet: expect.arrayContaining([expect.any(String)]) }),
      );
      expect(logSpy.info).toHaveBeenCalledWith(expect.stringContaining('Wrote Project.pdf'));
    });

    it('logs an error if mdToPdf fails during PDF generation', async () => {
      const mdToPdfError = new Error('Failed to generate PDF');
      mockedMdToPdf.mockRejectedValueOnce(mdToPdfError);

      const tree: TreeItem[] = [
        {
          dir: '/root',
          name: 'Home',
          level: 0,
          parent: null,
          mdFiles: [{ name: 'home.md', content: '# Welcome' }],
          mmdFiles: [],
          descendants: [],
        },
      ];

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await processor.generatePdfFromTree(tree, buildConfig);

      expect(logSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('Error creating PDF output file'),
        mdToPdfError,
      );

      consoleErrorSpy.mockRestore();
    });

    it('logs error if dist folder is missing or invalid', async () => {
      buildConfig.distFolder = '';
      await processor.preparePdf(buildConfig);
      expect(logSpy.error).toHaveBeenCalledWith(expect.stringContaining('Please run `config`'));
    });

    it('logs error if dist folder cannot be prepared', async () => {
      vi.spyOn(safeFiles, 'emptySubFolder').mockResolvedValueOnce(false);
      buildConfig.distFolder = 'dest';
      await processor.preparePdf(buildConfig);
      expect(logSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to empty the target folder'),
      );
    });

    it('logs an error if removing the temporary markdown file fails', async () => {
      const removeFileError = new Error('Failed to delete temp file');

      const tree: TreeItem[] = [
        {
          dir: '/root',
          name: 'Home',
          level: 0,
          parent: null,
          mdFiles: [{ name: 'home.md', content: '# Welcome' }],
          mmdFiles: [],
          descendants: [],
        },
      ];

      vi.spyOn(safeFiles, 'writeFile').mockResolvedValueOnce(undefined);
      vi.spyOn(safeFiles, 'removeFile').mockRejectedValueOnce(removeFileError);
      mockedMdToPdf.mockResolvedValueOnce({ filename: 'output.pdf', buffer: Buffer.from('PDF') });

      await processor.generatePdfFromTree(tree, buildConfig);

      expect(logSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to remove temporary file'),
        removeFileError,
      );
    });
  });
});
