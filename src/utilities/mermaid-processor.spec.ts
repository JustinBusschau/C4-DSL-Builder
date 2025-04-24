import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import chalk from 'chalk';
import { CliLogger } from './cli-logger.js';
import { SafeFiles } from './safe-files.js';

const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn(),
};

const mockPaths = {
  getPathFromMeta: vi.fn(),
};

vi.mock('./cli-logger.js', () => ({
  CliLogger: vi.fn(() => mockLogger),
}));

vi.mock('./paths.js', () => ({
  Paths: vi.fn(() => mockPaths),
}));

vi.mock('child_process', async () => {
  const mod = await vi.importActual<typeof import('child_process')>('child_process');
  return {
    ...mod,
    execFile: vi.fn(),
  };
});

import { execFile } from 'child_process';
import { Paths } from './paths.js';
import { MermaidProcessor } from './mermaid-processor.js';

describe('MermaidProcessor (CLI Logger Validated)', () => {
  let safeFiles: SafeFiles;
  let paths: Paths;
  let logger: CliLogger;
  let processor: MermaidProcessor;

  beforeEach(() => {
    vi.clearAllMocks();

    safeFiles = {
      pathExists: vi.fn().mockResolvedValue(false),
      ensureDir: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn().mockResolvedValue(undefined),
      removeFile: vi.fn().mockResolvedValue(undefined),
      accessFile: vi.fn().mockResolvedValue(undefined),
    } as unknown as SafeFiles;

    logger = new CliLogger('MermaidProcessor.test');
    mockPaths.getPathFromMeta.mockReturnValue('/some/base/path/src/utils/paths.js');
    paths = new Paths();
    processor = new MermaidProcessor(safeFiles, paths, logger);
  });

  describe('generateUniqueMmdFilename', () => {
    it('generates correct filename on first available attempt', async () => {
      const filename = await processor.generateUniqueMmdFilename('/output');
      expect(filename).toBe('mmd_1.svg');
    });

    it('skips existing files and returns next available name', async () => {
      vi.spyOn(safeFiles, 'pathExists')
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const filename = await processor.generateUniqueMmdFilename('/output');
      expect(filename).toBe('mmd_3.svg');
    });
  });

  describe('diagramFromMermaidString', () => {
    const diagramContent = 'graph TD; A-->B';
    const outputPath = '/out/diagram.svg';

    beforeEach(() => {
      (execFile as unknown as Mock).mockImplementation((_cmd, _args, cb) =>
        cb ? cb(null, { stdout: '', stderr: '' }) : Promise.resolve({ stdout: '', stderr: '' }),
      );
    });

    it('generates diagram and logs steps to stdout', async () => {
      const result = await processor.diagramFromMermaidString(diagramContent, outputPath);
      expect(result).toBe(true);

      expect(logger.log).toHaveBeenCalledWith(
        chalk.blue(`Generating Mermaid diagram: ${outputPath}`),
      );
      expect(logger.log).toHaveBeenCalledWith(
        chalk.green(`Successfully generated diagram: ${outputPath}`),
      );
    });

    it('logs error if output is not accessible after generation', async () => {
      vi.spyOn(safeFiles, 'accessFile').mockRejectedValueOnce(new Error('Access denied'));

      const result = await processor.diagramFromMermaidString(diagramContent, outputPath);
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to generate diagram: ${outputPath}`,
        expect.any(Error),
      );
    });

    it('logs top-level error if any setup step fails', async () => {
      vi.spyOn(safeFiles, 'writeFile').mockRejectedValueOnce(new Error('write error'));

      const result = await processor.diagramFromMermaidString(diagramContent, outputPath);
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        chalk.red('Error generating Mermaid diagram:'),
        expect.any(Error),
      );
    });

    it('logs access failure but still removes temp file', async () => {
      vi.spyOn(safeFiles, 'accessFile').mockRejectedValueOnce(new Error('missing'));
      await processor.diagramFromMermaidString(diagramContent, outputPath);
      expect(safeFiles.removeFile).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to generate diagram'),
        expect.any(Error),
      );
    });

    it('logs no error if temp file removal fails (non-critical)', async () => {
      const err = new Error('cleanup error');
      vi.spyOn(safeFiles, 'removeFile').mockRejectedValueOnce(err);

      const result = await processor.diagramFromMermaidString(diagramContent, outputPath);
      expect(result).toBe(true);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to delete temporary file'),
        err,
      );
    });
  });
});
