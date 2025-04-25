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
import { PdfProcessor } from './pdf-processor.js';

describe('PdfProcessor', () => {
  const logSpy = new CliLogger('PdfProcessor.test', 'debug');
  let processor: PdfProcessor;
  let safeFiles: SafeFiles;
  const buildConfig: BuildConfig = {
    rootFolder: '/root',
    distFolder: '/dist',
    embedMermaidDiagrams: true,
    homepageName: 'Home',
    projectName: 'Project',
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.clearAllMocks();
    safeFiles = {
      pathExists: vi.fn().mockResolvedValue(true),
      copyFile: vi.fn(),
      readFileAsString: vi.fn().mockResolvedValue('graph TD; A-->B'),
      writeFile: vi.fn(),
      emptySubFolder: vi.fn().mockResolvedValue(true),
      generateTree: vi.fn().mockResolvedValue([]),
      getFolderName: vi.fn().mockReturnValue('Folder'),
    } as unknown as SafeFiles;
    processor = new PdfProcessor(safeFiles, logSpy);
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
      expect(logSpy.info).toHaveBeenCalledWith(expect.stringContaining('Wrote Project.pdf'));
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
  });
});
