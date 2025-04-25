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
    it('logs some info', async () => {
      await processor.preparePdf(buildConfig);
      expect(logSpy.log).toHaveBeenCalledWith(expect.stringContaining('We have a PDF processor'));
    });
  });
});
