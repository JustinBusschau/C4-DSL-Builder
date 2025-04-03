import { jest } from '@jest/globals';

const mockGet = jest.fn();
const mockSet = jest.fn();
const mockDelete = jest.fn();
const mockClear = jest.fn();
const loggerErrorMock = jest.fn();

const configstoreConstructorMock = jest.fn(() => ({
  get: mockGet,
  set: mockSet,
  delete: mockDelete,
  clear: mockClear,
}));

let throwConfigstore: boolean = false;
let throwNonError: boolean = false;

jest.unstable_mockModule('configstore', () => ({
  default: class MockConfigstore {
    constructor(...args: ConstructorParameters<typeof import('configstore').default>) {
      if (throwConfigstore) {
        if (throwNonError) throw '💥';
        else throw new Error('Mock config error');
      }

      return {
        get: mockGet,
        set: mockSet,
        delete: mockDelete,
        clear: mockClear,
      };
    }
  },
}));

jest.unstable_mockModule('./logger.js', () => ({
  logger: {
    error: loggerErrorMock,
  },
}));

const {
  getStrConfig,
  getBoolConfig,
  setConfig,
  deleteConfig,
  clearConfig,
} = await import('./config.ts');

describe('Config Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    throwConfigstore = false;
    throwNonError = false;
  });

  describe('openConfigStore error handling', () => {
    it('logs and handles Configstore instantiation error (Error instance)', () => {
      throwConfigstore = true;
      getStrConfig('foo');
      expect(loggerErrorMock).toHaveBeenCalledWith(
        expect.stringContaining('Error accessing config store.'),
        Error('Mock config error')
      );
    });

    it('logs and handles Configstore instantiation error (non-Error)', () => {
      throwConfigstore = true;
      throwNonError = true;
      getStrConfig('foo');
      expect(loggerErrorMock).toHaveBeenCalledWith(
        expect.stringContaining('Error accessing config store.'),
        "💥"
      );
    });
  });

  describe('fallbacks when config fails to open', () => {
    beforeEach(() => {
      throwConfigstore = true;
    });

    it('getStrConfig returns "" and logs', () => {
      const result = getStrConfig('missing');
      expect(result).toBe('');
      expect(loggerErrorMock).toHaveBeenCalledWith(expect.stringContaining('Failed to open config store.'));
    });

    it('getBoolConfig returns false and logs', () => {
      const result = getBoolConfig('missingBool');
      expect(result).toBe(false);
      expect(loggerErrorMock).toHaveBeenCalledWith(expect.stringContaining('Failed to open config store.'));
    });

    it('setConfig logs and does not crash', () => {
      setConfig('key', true);
      expect(loggerErrorMock).toHaveBeenCalledWith(expect.stringContaining('Failed to open config store.'));
      expect(mockSet).not.toHaveBeenCalled();
    });

    it('deleteConfig logs and does not crash', () => {
      deleteConfig('key');
      expect(loggerErrorMock).toHaveBeenCalledWith(expect.stringContaining('Failed to open config store.'));
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it('clearConfig logs and does not crash', () => {
      clearConfig();
      expect(loggerErrorMock).toHaveBeenCalledWith(expect.stringContaining('Failed to open config store.'));
      expect(mockClear).not.toHaveBeenCalled();
    });
  });

  describe('getStrConfig', () => {
    it('returns string value if key is found', () => {
      mockGet.mockReturnValue('my-value');
      const result = getStrConfig('myKey');
      expect(result).toBe('my-value');
    });

    it('logs and returns empty string if value is not a string', () => {
      mockGet.mockReturnValue(true);
      const result = getStrConfig('myKey');
      expect(loggerErrorMock).toHaveBeenCalledWith(expect.stringContaining('Expected string for'));
      expect(result).toBe('');
    });

    it('logs and returns empty string if key not found', () => {
      mockGet.mockReturnValue(undefined);
      const result = getStrConfig('missingKey');
      expect(loggerErrorMock).toHaveBeenCalledWith(expect.stringContaining('not found'));
      expect(result).toBe('');
    });
  });

  describe('getBoolConfig', () => {
    it('returns boolean value directly', () => {
      mockGet.mockReturnValue(true);
      const result = getBoolConfig('someBool');
      expect(result).toBe(true);
    });

    it('parses string values like "yes" and "no"', () => {
      mockGet.mockReturnValue('yes');
      expect(getBoolConfig('flag')).toBe(true);
      mockGet.mockReturnValue('no');
      expect(getBoolConfig('flag')).toBe(false);
    });

    it('logs and returns false for invalid string', () => {
      mockGet.mockReturnValue('maybe');
      const result = getBoolConfig('flag');
      expect(loggerErrorMock).toHaveBeenCalledWith(expect.stringContaining('Expected boolean'));
      expect(result).toBe(false);
    });

    it('logs and returns false if value is undefined', () => {
      mockGet.mockReturnValue(undefined);
      const result = getBoolConfig('missing');
      expect(loggerErrorMock).toHaveBeenCalledWith(expect.stringContaining('not found'));
      expect(result).toBe(false);
    });
  });

  describe('setConfig', () => {
    it('calls set with key and value', () => {
      setConfig('someKey', true);
      expect(mockSet).toHaveBeenCalledWith('someKey', true);
    });
  });

  describe('deleteConfig', () => {
    it('calls delete with key', () => {
      deleteConfig('someKey');
      expect(mockDelete).toHaveBeenCalledWith('someKey');
    });
  });

  describe('clearConfig', () => {
    it('clears all keys and restores projectName', () => {
      mockGet.mockReturnValue('TestProject');
      clearConfig();
      expect(mockClear).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith('projectName', 'TestProject');
    });

    it('handles missing projectName gracefully', () => {
      mockGet.mockReturnValue(undefined);
      clearConfig();
      expect(mockClear).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith('projectName', '');
    });
  });
});
