import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { CliLogger } from './cli-logger.js';

vi.mock('configstore', () => {
  return {
    default: vi.fn(() => {
      throw new Error('Configstore constructor failure');
    }),
  };
});

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}));

const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn(),
};

vi.mock('../utilities/cli-logger.js', () => ({
  CliLogger: vi.fn(() => mockLogger),
}));

import { ConfigManager } from './config-manager.js';

describe('ConfigManager', () => {
  const logSpy = new CliLogger('ConfigManager.Constructor.test', 'debug');
  let manager: ConfigManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new ConfigManager(logSpy);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('handles constructor failure in openConfigStore', async () => {
    const result = manager.getStrConfigValue('someKey');
    expect(result).toBe('');
    expect(logSpy.error).toHaveBeenCalledWith(
      'Error accessing config store.',
      Error('Configstore constructor failure'),
    );
  });

  it('handles constructor failure in openConfigStore: set', async () => {
    const result = manager.setConfigValue('someKey', 'someValue');
    expect(result).toBe(undefined);
    expect(logSpy.error).toHaveBeenCalledWith(
      'Error accessing config store.',
      Error('Configstore constructor failure'),
    );
  });

  it('handles constructor failure in openConfigStore: delete', async () => {
    const result = manager.deleteConfig('someKey');
    expect(result).toBe(undefined);
    expect(logSpy.error).toHaveBeenCalledWith(
      'Error accessing config store.',
      Error('Configstore constructor failure'),
    );
  });

  it('handles constructor failure in openConfigStore: reset', async () => {
    const result = manager.resetConfig();
    expect(result).toBe(undefined);
    expect(logSpy.error).toHaveBeenCalledWith(
      'Error accessing config store.',
      Error('Configstore constructor failure'),
    );
  });
});
