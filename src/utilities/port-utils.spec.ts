import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import net from 'net';
import { findAvailablePort } from './port-utils.js';

vi.mock('net');

describe('port-utils', () => {
  let serverInstance: {
    once: ReturnType<typeof vi.fn>;
    listen: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    serverInstance = {
      once: vi.fn().mockReturnThis(),
      listen: vi.fn().mockReturnThis(),
      close: vi.fn(),
    };

    (net.createServer as unknown as Mock) = vi.fn(() => serverInstance);
  });

  it('resolves immediately if preferred port is available', async () => {
    let listeningCallback: (() => void) | undefined;

    serverInstance.once.mockImplementation((event, cb) => {
      if (event === 'listening') {
        listeningCallback = cb;
      }
      return serverInstance;
    });

    serverInstance.listen.mockImplementation(() => {
      setImmediate(() => {
        listeningCallback?.();
      });
      return serverInstance;
    });

    const port = await findAvailablePort(3000);

    expect(port).toBe(3000);
    expect(serverInstance.listen).toHaveBeenCalledWith(3000);
    expect(serverInstance.close).toHaveBeenCalled();
  });

  it('tries next port if preferred port is busy', async () => {
    const serverInstances = [
      {
        once: vi.fn().mockReturnThis(),
        listen: vi.fn().mockReturnThis(),
        close: vi.fn(),
      },
      {
        once: vi.fn().mockReturnThis(),
        listen: vi.fn().mockReturnThis(),
        close: vi.fn(),
      },
    ];

    let errorCallback: (() => void) | undefined;
    let listeningCallback: (() => void) | undefined;

    (net.createServer as unknown as Mock)
      .mockReturnValueOnce(serverInstances[0])
      .mockReturnValueOnce(serverInstances[1]);

    serverInstances[0].once.mockImplementation((event, cb) => {
      if (event === 'error') {
        errorCallback = cb;
      }
      return serverInstances[0];
    });
    serverInstances[1].once.mockImplementation((event, cb) => {
      if (event === 'listening') {
        listeningCallback = cb;
      }
      return serverInstances[1];
    });

    serverInstances[0].listen.mockImplementation(() => {
      setImmediate(() => {
        errorCallback?.();
      });
      return serverInstances[0];
    });

    serverInstances[1].listen.mockImplementation(() => {
      setImmediate(() => {
        listeningCallback?.();
      });
      return serverInstances[1];
    });

    const port = await findAvailablePort(3000);

    expect(port).toBe(3001);
    expect(serverInstances[0].listen).toHaveBeenCalledWith(3000);
    expect(serverInstances[1].listen).toHaveBeenCalledWith(3001);
    expect(serverInstances[1].close).toHaveBeenCalled();
  });

  it('continues checking until it finds an available port', async () => {
    const serverInstances = [
      {
        once: vi.fn().mockReturnThis(),
        listen: vi.fn().mockReturnThis(),
        close: vi.fn(),
      },
      {
        once: vi.fn().mockReturnThis(),
        listen: vi.fn().mockReturnThis(),
        close: vi.fn(),
      },
      {
        once: vi.fn().mockReturnThis(),
        listen: vi.fn().mockReturnThis(),
        close: vi.fn(),
      },
    ];

    const errorCallbacks: Array<() => void> = [];
    let listeningCallback: (() => void) | undefined;

    (net.createServer as unknown as Mock)
      .mockReturnValueOnce(serverInstances[0])
      .mockReturnValueOnce(serverInstances[1])
      .mockReturnValueOnce(serverInstances[2]);

    serverInstances[0].once.mockImplementation((event, cb) => {
      if (event === 'error') {
        errorCallbacks[0] = cb;
      }
      return serverInstances[0];
    });
    serverInstances[1].once.mockImplementation((event, cb) => {
      if (event === 'error') {
        errorCallbacks[1] = cb;
      }
      return serverInstances[1];
    });
    serverInstances[2].once.mockImplementation((event, cb) => {
      if (event === 'listening') {
        listeningCallback = cb;
      }
      return serverInstances[2];
    });

    serverInstances[0].listen.mockImplementation(() => {
      setImmediate(() => {
        errorCallbacks[0]?.();
      });
      return serverInstances[0];
    });
    serverInstances[1].listen.mockImplementation(() => {
      setImmediate(() => {
        errorCallbacks[1]?.();
      });
      return serverInstances[1];
    });
    serverInstances[2].listen.mockImplementation(() => {
      setImmediate(() => {
        listeningCallback?.();
      });
      return serverInstances[2];
    });

    const port = await findAvailablePort(4000);

    expect(port).toBe(4002);
    expect(serverInstances[0].listen).toHaveBeenCalledWith(4000);
    expect(serverInstances[1].listen).toHaveBeenCalledWith(4001);
    expect(serverInstances[2].listen).toHaveBeenCalledWith(4002);
    expect(serverInstances[2].close).toHaveBeenCalled();
  });
});
