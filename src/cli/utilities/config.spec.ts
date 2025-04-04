import { jest } from '@jest/globals';

const mockGet = jest.fn();
const mockSet = jest.fn();
const mockDelete = jest.fn();
const mockClear = jest.fn();

const loggerErrorMock = jest.fn();
const loggerWarnMock = jest.fn();
const loggerInfoMock = jest.fn();

let throwConfigstore = false;
let throwNonError = false;

// 👇 mock configstore
jest.unstable_mockModule('configstore', () => ({
  default: class MockConfigstore {
    constructor() {
      if (throwConfigstore) {
        if (throwNonError) {
          throw new Error('💥');
        } else {
          throw new Error('Mock config error');
        }
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

// 👇 mock logger
jest.unstable_mockModule('../utilities/logger.js', () => ({
  createLogger: () => ({
    error: loggerErrorMock,
    warn: loggerWarnMock,
    info: loggerInfoMock,
    log: jest.fn(),
    debug: jest.fn(),
  }),
}));

let getStrConfig: typeof import('../utilities/config.js').getStrConfig;
let getBoolConfig: typeof import('../utilities/config.js').getBoolConfig;
let setConfig: typeof import('../utilities/config.js').setConfig;
let deleteConfig: typeof import('../utilities/config.js').deleteConfig;
let clearConfig: typeof import('../utilities/config.js').clearConfig;

beforeEach(async () => {
  // 🧼 Reset everything before each test
  mockGet.mockReset();
  mockSet.mockReset();
  mockDelete.mockReset();
  mockClear.mockReset();
  loggerErrorMock.mockReset();
  loggerWarnMock.mockReset();
  loggerInfoMock.mockReset();
  throwConfigstore = false;
  throwNonError = false;

  await jest.isolateModulesAsync(async () => {
    const config = await import('../utilities/config.js');
    getStrConfig = config.getStrConfig;
    getBoolConfig = config.getBoolConfig;
    setConfig = config.setConfig;
    deleteConfig = config.deleteConfig;
    clearConfig = config.clearConfig;
  });
});

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
        Error('Mock config error'),
      );
      expect(loggerInfoMock).toHaveBeenCalledWith('Expected string for foo, but got undefined');
    });

    it('logs and handles Configstore instantiation error (non-Error)', () => {
      throwConfigstore = true;
      throwNonError = true;
      getStrConfig('bar');
      expect(loggerErrorMock).toHaveBeenCalledWith(
        expect.stringContaining('Error accessing config store.'),
        Error('💥'),
      );
      expect(loggerInfoMock).toHaveBeenCalledWith('Expected string for bar, but got undefined');
    });
  });

  describe('fallbacks when config fails to open', () => {
    beforeEach(() => {
      throwConfigstore = true;
    });

    it('getStrConfig returns "" and logs', () => {
      const result = getStrConfig('missing');
      expect(result).toBe('');
      expect(loggerErrorMock).toHaveBeenCalledWith(
        expect.stringContaining('Failed to open config store.'),
      );
    });

    it('getBoolConfig returns false and logs', () => {
      const result = getBoolConfig('missingBool');
      expect(result).toBe(false);
      expect(loggerErrorMock).toHaveBeenCalledWith(
        expect.stringContaining('Failed to open config store.'),
      );
    });

    it('setConfig logs and does not crash', () => {
      setConfig('key', true);
      expect(loggerErrorMock).toHaveBeenCalledWith(
        expect.stringContaining('Failed to open config store.'),
      );
      expect(mockSet).not.toHaveBeenCalled();
    });

    it('deleteConfig logs and does not crash', () => {
      deleteConfig('key');
      expect(loggerErrorMock).toHaveBeenCalledWith(
        expect.stringContaining('Failed to open config store.'),
      );
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it('clearConfig logs and does not crash', () => {
      clearConfig();
      expect(loggerErrorMock).toHaveBeenCalledWith(
        expect.stringContaining('Failed to open config store.'),
      );
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
      expect(loggerInfoMock).toHaveBeenCalledWith(expect.stringContaining('Expected string for'));
      expect(result).toBe('');
    });

    it('logs and returns empty string if key not found', () => {
      mockGet.mockReturnValue(undefined);
      const result = getStrConfig('missingKey');
      expect(loggerWarnMock).toHaveBeenCalledWith(expect.stringContaining('not found'));
      expect(loggerInfoMock).toHaveBeenCalledWith(expect.stringContaining('Expected string for'));
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
      expect(loggerInfoMock).toHaveBeenCalledWith(expect.stringContaining('Expected boolean'));
      expect(result).toBe(false);
    });

    it('logs and returns false if value is undefined', () => {
      mockGet.mockReturnValue(undefined);
      const result = getBoolConfig('missing');
      expect(loggerWarnMock).toHaveBeenCalledWith(expect.stringContaining('not found'));
      expect(loggerInfoMock).toHaveBeenCalledWith(expect.stringContaining('Expected boolean'));
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
