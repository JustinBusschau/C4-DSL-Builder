import { jest } from '@jest/globals';
import path from 'path';

const mockWriteFile = jest.fn();
const mockUnlink = jest.fn();
const mockAccess = jest.fn();
const mockEnsureDir = jest.fn();
const mockExecFile = jest.fn();
const logMock = jest.fn();
const errorMock = jest.fn();

jest.unstable_mockModule('fs/promises', () => ({
  writeFile: mockWriteFile,
  unlink: mockUnlink,
  access: mockAccess,
}));

jest.unstable_mockModule('fs-extra', () => ({
  default: {
    ensureDir: mockEnsureDir,
  },
}));

jest.unstable_mockModule('child_process', () => ({
  execFile: (
    cmd: string,
    args: string[],
    callback: (err: Error | null, stdout: string, stderr: string) => void,
  ) => {
    mockExecFile(cmd, args);
    callback(null, '', '');
  },
}));

jest.unstable_mockModule('chalk', () => ({
  default: {
    blue: (msg: string) => msg,
    green: (msg: string) => msg,
    red: (msg: string) => msg,
  },
}));

jest.unstable_mockModule('../utilities/logger.js', () => ({
  createLogger: () => ({
    log: logMock,
    error: errorMock,
  }),
}));

const { generateMermaidDiagram } = await import('./mermaid.js');

describe('generateMermaidDiagram', () => {
  const content = 'graph TD; A-->B';
  const outputPath = '/fake/output/diagram.png';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates diagram successfully', async () => {
    mockAccess.mockResolvedValueOnce(undefined);

    const result = await generateMermaidDiagram(content, outputPath);

    expect(mockEnsureDir).toHaveBeenCalledWith(path.dirname(outputPath));
    expect(mockWriteFile).toHaveBeenCalledWith(expect.stringMatching(/temp_.*\.mmd$/), content);
    expect(mockExecFile).toHaveBeenCalled();
    expect(mockUnlink).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('handles unknown errors gracefully', async () => {
    mockWriteFile.mockImplementationOnce(() => {
      throw 'some string error';
    });

    const result = await generateMermaidDiagram(content, outputPath);

    expect(result).toBe(false);
  });

  it('returns false if ensureDir throws', async () => {
    mockEnsureDir.mockRejectedValueOnce(new Error('Permission denied'));

    const result = await generateMermaidDiagram(content, outputPath);

    expect(result).toBe(false);
  });

  it('returns false if diagram output does not exist', async () => {
    mockAccess.mockRejectedValueOnce(new Error('File not found'));

    const result = await generateMermaidDiagram(content, outputPath);

    expect(result).toBe(false);
  });

  it('returns false and logs error if execFile throws', async () => {
    const error = new Error('mmdc crash');
    mockExecFile.mockImplementationOnce((_cmd, _args, cb) => cb(error));

    const result = await generateMermaidDiagram(content, outputPath);

    expect(result).toBe(false);
  });

  it('returns false and logs error if fs.writeFile throws', async () => {
    mockWriteFile.mockRejectedValueOnce(new Error('Disk full'));

    const result = await generateMermaidDiagram(content, outputPath);

    expect(result).toBe(false);
  });

  it('supports mmdcPathOverride', async () => {
    const customPath = '/some/custom/mmdc';
    await generateMermaidDiagram(content, outputPath, { mmdcPathOverride: customPath });

    const execArgs = mockExecFile.mock.calls[0][1];
    expect(execArgs).toContain(customPath);
  });
});
