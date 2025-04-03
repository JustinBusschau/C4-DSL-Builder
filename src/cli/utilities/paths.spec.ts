import { fileURLToPath } from 'url';
import path from 'path';

const { getCurrentDir } = await import('./paths.ts');

describe('getCurrentDir', () => {
  it('should return the directory of the provided file URL', () => {
    const filePath = fileURLToPath(import.meta.url);
    const dirPath = path.dirname(filePath);
    const computedDir = getCurrentDir(import.meta.url);

    expect(computedDir).toBe(dirPath);
  });

  it('should throw an error if the URL is not a valid file URL', () => {
    const badUrl = 'http://example.com/script.js';

    expect(() => getCurrentDir(badUrl)).toThrowError('Must be a file URL');
  });

  it('should work for a synthetic file URL', () => {
    const fakePath = path.resolve('/some/fake/path/test.js');
    const fakeUrl = `file://${fakePath}`;
    const result = getCurrentDir(fakeUrl);

    expect(result).toBe(path.dirname(fakePath));
  });
});
