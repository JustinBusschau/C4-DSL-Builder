import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import { Paths } from './paths.js';

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

describe('Paths (CLI Logger Validated)', () => {
  let paths: Paths;

  beforeEach(() => {
    vi.clearAllMocks();
    paths = new Paths();
  });

  describe('getPathFromMeta', () => {
    it('returns the directory of a valid file URL', () => {
      const filePath = path.resolve('/some/project/src/module.ts');
      const fileUrl = `file://${filePath}`;
      const expectedDir = path.dirname(filePath);

      const result = paths.getPathFromMeta(fileUrl);
      expect(result).toBe(expectedDir);
    });

    it('throws if the metaUrl is not a file:// URL', () => {
      const invalidUrl = 'http://example.com/script.js';

      expect(() => paths.getPathFromMeta(invalidUrl)).toThrow('Must be a file URL');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('An invalid path given for getPathFromMeta'),
      );
    });

    it('logs the invalid path when an error occurs', () => {
      const invalidUrl = 'data:text/plain,Hello%2C%20World!';

      try {
        paths.getPathFromMeta(invalidUrl);
      } catch {
        // noop: error is expected
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        `An invalid path given for getPathFromMeta: ${invalidUrl}`,
      );
    });
  });
});
