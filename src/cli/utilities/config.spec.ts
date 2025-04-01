import Configstore from 'configstore';
import { logger } from './logger.js';
import path from 'path';
import { getStrConfig, getBoolConfig, setConfig, deleteConfig } from './config.js';

jest.mock('configstore');
jest.mock('./logger');

describe('config.ts', () => {
  const mockConfigstore = Configstore as jest.MockedClass<typeof Configstore>;
  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getStrConfig', () => {
    it('should return a string value when the key exists', () => {
      const mockGet = jest.fn().mockReturnValue('testValue');
      mockConfigstore.prototype.get = mockGet;

      const result = getStrConfig('testKey');
      expect(result).toBe('testValue');
      expect(mockGet).toHaveBeenCalledWith('testKey');
    });

    it('should log an error and return an empty string when the key does not exist', () => {
      mockConfigstore.prototype.get.mockReturnValue(undefined);

      const result = getStrConfig('missingKey');
      expect(result).toBe('');
      expect(mockLogger.error).toHaveBeenCalledWith('Configuration key missingKey not found.');
    });

    it('should log an error and return an empty string when the value is not a string', () => {
      mockConfigstore.prototype.get.mockReturnValue(true);

      const result = getStrConfig('invalidKey');
      expect(result).toBe('');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Expected string for invalidKey, but got boolean',
      );
    });
  });

  describe('getBoolConfig', () => {
    it('should return a boolean value when the key exists', () => {
      const mockGet = jest.fn().mockReturnValue(true);
      mockConfigstore.prototype.get = mockGet;

      const result = getBoolConfig('testKey');
      expect(result).toBe(true);
      expect(mockGet).toHaveBeenCalledWith('testKey');
    });

    it('should log an error and return false when the key does not exist', () => {
      mockConfigstore.prototype.get.mockReturnValue(undefined);

      const result = getBoolConfig('missingKey');
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Configuration key missingKey not found.');
    });

    it('should return true for string representations of true', () => {
      mockConfigstore.prototype.get.mockReturnValue('true');

      const result = getBoolConfig('testKey');
      expect(result).toBe(true);
    });

    it('should return false for string representations of false', () => {
      mockConfigstore.prototype.get.mockReturnValue('false');

      const result = getBoolConfig('testKey');
      expect(result).toBe(false);
    });

    it('should return true for "yes" (case insensitive)', () => {
      mockConfigstore.prototype.get.mockReturnValue('YES');

      const result = getBoolConfig('testKey');
      expect(result).toBe(true);
    });

    it('should return false for "no" (case insensitive)', () => {
      mockConfigstore.prototype.get.mockReturnValue('no');

      const result = getBoolConfig('testKey');
      expect(result).toBe(false);
    });

    it('should log an error and return false when the value is not a boolean or valid string representation', () => {
      mockConfigstore.prototype.get.mockReturnValue('invalidValue');

      const result = getBoolConfig('invalidKey');
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Expected boolean for invalidKey, but got string',
      );
    });
  });

  describe('Error Handling', () => {
    it('should log an error and return false if Configstore initialization fails', () => {
      mockConfigstore.mockImplementation(() => {
        throw new Error('Initialization error');
      });

      const result = getStrConfig('testKey');
      expect(result).toBe('');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error accessing config store: Initialization error',
      );
    });
  });
});

describe('setConfig', () => {
  const mockConfigstore = Configstore as jest.MockedClass<typeof Configstore>;
  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should set a configuration value successfully', () => {
    const mockSet = jest.fn();
    mockConfigstore.prototype.set = mockSet;

    setConfig('testKey', 'testValue');

    expect(mockConfigstore).toHaveBeenCalledWith(
      process.cwd().split(path.sep).splice(1).join('_'),
      {},
      { configPath: path.join(process.cwd(), '.c4dslbuilder') },
    );
    expect(mockSet).toHaveBeenCalledWith('testKey', 'testValue');
  });

  it('should log an error if Configstore initialization fails', () => {
    mockConfigstore.mockImplementation(() => {
      throw new Error('Initialization error');
    });

    setConfig('testKey', 'testValue');

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error accessing config store: Initialization error',
    );
  });
});

describe('deleteConfig', () => {
  const mockConfigstore = Configstore as jest.MockedClass<typeof Configstore>;
  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete a configuration key successfully', () => {
    const mockDelete = jest.fn();
    mockConfigstore.prototype.delete = mockDelete;

    deleteConfig('testKey');

    expect(mockConfigstore).toHaveBeenCalledWith(
      process.cwd().split(path.sep).splice(1).join('_'),
      {},
      { configPath: path.join(process.cwd(), '.c4dslbuilder') },
    );
    expect(mockDelete).toHaveBeenCalledWith('testKey');
  });

  it('should log an error if Configstore initialization fails', () => {
    mockConfigstore.mockImplementation(() => {
      throw new Error('Initialization error');
    });

    deleteConfig('testKey');

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error accessing config store: Initialization error',
    );
  });
});
