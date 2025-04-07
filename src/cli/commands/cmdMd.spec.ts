import { jest } from '@jest/globals';

const getStrConfigMock = jest.fn();
const safeEmptySubFolderMock = jest.fn();
const logMock = jest.fn();
const errorMock = jest.fn();

jest.unstable_mockModule('../utilities/config.js', () => ({
  getStrConfig: getStrConfigMock,
}));

jest.unstable_mockModule('../utilities/tree.js', () => ({
  safeEmptySubFolder: safeEmptySubFolderMock,
}));

jest.unstable_mockModule('../utilities/logger.js', () => ({
  createLogger: () => ({
    log: logMock,
    error: errorMock,
  }),
}));

const { cmdMd } = await import('./cmdMd.js');

describe('cmdMd', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs error and exits if distFolder config is missing', async () => {
    getStrConfigMock.mockReturnValue(undefined);

    await cmdMd();

    expect(errorMock).toHaveBeenCalledWith('Please run `config` before attempting to run `md`.');
    expect(safeEmptySubFolderMock).not.toHaveBeenCalled();
  });

  it('logs error and exits if distFolder config is invalid (string "undefined")', async () => {
    getStrConfigMock.mockReturnValue('undefined');

    await cmdMd();

    expect(errorMock).toHaveBeenCalledWith('Please run `config` before attempting to run `md`.');
    expect(safeEmptySubFolderMock).not.toHaveBeenCalled();
  });

  it('logs error if safeEmptySubFolder fails', async () => {
    getStrConfigMock.mockReturnValue('docs');
    safeEmptySubFolderMock.mockResolvedValue(false);

    await cmdMd();

    expect(safeEmptySubFolderMock).toHaveBeenCalledWith(expect.stringContaining('docs'));
    expect(errorMock).toHaveBeenCalledWith(
      expect.stringContaining('Failed to empty the target folder'),
    );
  });

  it('logs success message when everything works', async () => {
    getStrConfigMock.mockReturnValue('docs');
    safeEmptySubFolderMock.mockResolvedValue(true);

    await cmdMd();

    expect(safeEmptySubFolderMock).toHaveBeenCalledWith(expect.stringContaining('docs'));
    expect(logMock).toHaveBeenCalledWith(expect.stringContaining('Building Markdown'));
    expect(logMock).toHaveBeenCalledWith(
      expect.stringContaining('Markdown documentation generated'),
    );
  });
});
