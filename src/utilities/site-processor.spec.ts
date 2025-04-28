import { vi, describe, it, expect, beforeEach } from 'vitest';

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

import { SafeFiles } from './safe-files.js';
import { BuildConfig } from '../types/build-config.js';
import { CliLogger } from './cli-logger.js';
import { SiteProcessor } from './site-processor.js';

describe('PdfProcessor', () => {
  const logSpy = new CliLogger('PdfProcessor.test', 'debug');
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
    processor = new SiteProcessor(safeFiles, logSpy);
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
  });
});
