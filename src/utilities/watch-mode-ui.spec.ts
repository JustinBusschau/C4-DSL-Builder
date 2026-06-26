import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { WatchModeUI } from './watch-mode-ui.js';
import { CliLogger } from './cli-logger.js';

describe('WatchModeUI', () => {
  let ui: WatchModeUI;
  let mockLogger: CliLogger;
  let consoleClearSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let processExitSpy: any;
  let stdinMock: {
    isTTY: boolean;
    setRawMode: ReturnType<typeof vi.fn>;
    resume: ReturnType<typeof vi.fn>;
    pause: ReturnType<typeof vi.fn>;
    setEncoding: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    emit: (event: string, data: string) => void;
  };
  beforeEach(() => {
    mockLogger = new CliLogger('Test', 'debug');
    ui = new WatchModeUI(3666, mockLogger);

    // Mock console methods
    consoleClearSpy = vi.spyOn(console, 'clear').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    // Mock stdin
    stdinMock = {
      isTTY: true,
      setRawMode: vi.fn(),
      resume: vi.fn(),
      pause: vi.fn(),
      setEncoding: vi.fn(),
      on: vi.fn(),
      emit: vi.fn(),
    };

    // Replace stdin on the UI instance
    Object.defineProperty(ui, 'stdin', {
      value: stdinMock,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    consoleClearSpy.mockRestore();
    consoleLogSpy.mockRestore();
    processExitSpy.mockRestore();
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct default state', () => {
      expect(ui.state.status).toBe('watching');
      expect(ui.state.rebuildCount).toBe(0);
      expect(ui.state.port).toBe(3666);
      expect(ui.state.lastActivity).toBeDefined();
      expect(ui.logHistory).toEqual([]);
    });

    it('should use provided port', () => {
      const ui2 = new WatchModeUI(8080, mockLogger);
      expect(ui2.state.port).toBe(8080);
    });

    it('should store logger reference', () => {
      expect(ui.logger).toBe(mockLogger);
    });
  });

  describe('start', () => {
    it('should call render when starting', () => {
      ui.start();
      expect(consoleClearSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should setup input handling when stdin is TTY', () => {
      stdinMock.isTTY = true;
      ui.start();
      expect(stdinMock.setRawMode).toHaveBeenCalledWith(true);
      expect(stdinMock.resume).toHaveBeenCalled();
      expect(stdinMock.setEncoding).toHaveBeenCalledWith('utf8');
      expect(stdinMock.on).toHaveBeenCalledWith('data', expect.any(Function));
    });

    it('should not setup input handling when stdin is not TTY', () => {
      stdinMock.isTTY = false;
      ui.start();
      expect(stdinMock.setRawMode).not.toHaveBeenCalled();
      expect(stdinMock.resume).not.toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('should clear console and stop input when TTY', () => {
      stdinMock.isTTY = true;
      ui.stop();
      expect(consoleClearSpy).toHaveBeenCalled();
      expect(stdinMock.setRawMode).toHaveBeenCalledWith(false);
      expect(stdinMock.pause).toHaveBeenCalled();
    });

    it('should only clear console when not TTY', () => {
      stdinMock.isTTY = false;
      ui.stop();
      expect(consoleClearSpy).toHaveBeenCalled();
      expect(stdinMock.setRawMode).not.toHaveBeenCalled();
      expect(stdinMock.pause).not.toHaveBeenCalled();
    });
  });

  describe('keyboard input handling', () => {
    it('should exit on q key press', () => {
      stdinMock.isTTY = true;
      ui.start();

      const dataHandler = stdinMock.on.mock.calls.find((call) => call[0] === 'data')?.[1];

      expect(dataHandler).toBeDefined();
      dataHandler('q');
      expect(processExitSpy).toHaveBeenCalledWith(0);
      expect(consoleClearSpy).toHaveBeenCalled();
    });

    it('should exit on Ctrl+C (\u0003)', () => {
      stdinMock.isTTY = true;
      ui.start();

      const dataHandler = stdinMock.on.mock.calls.find((call) => call[0] === 'data')?.[1];

      dataHandler('\u0003');
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should trigger rebuild on r key press', () => {
      stdinMock.isTTY = true;
      const rebuildMock = vi.fn();
      ui.onRebuildRequest = rebuildMock;

      ui.start();

      const dataHandler = stdinMock.on.mock.calls.find((call) => call[0] === 'data')?.[1];

      dataHandler('r');
      expect(rebuildMock).toHaveBeenCalled();
    });

    it('should handle async rebuild errors', async () => {
      stdinMock.isTTY = true;
      const errorMock = vi.fn();
      mockLogger.error = errorMock;
      const rebuildMock = vi.fn().mockRejectedValue(new Error('Rebuild failed'));
      ui.onRebuildRequest = rebuildMock;

      ui.start();

      const dataHandler = stdinMock.on.mock.calls.find((call) => call[0] === 'data')?.[1];

      // Don't await here since we want to test the fire-and-forget pattern
      dataHandler('r');

      // Wait for the promise to resolve (catch block)
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(rebuildMock).toHaveBeenCalled();
      expect(errorMock).toHaveBeenCalled();
    });
  });

  describe('log', () => {
    it('should add message to log history with timestamp', () => {
      ui.log('Test message');
      expect(ui.logHistory.length).toBe(1);
      expect(ui.logHistory[0]).toContain('Test message');
      expect(ui.logHistory[0]).toMatch(/\[\d{1,2}:\d{2}:\d{2}\]/);
    });

    it('should limit log history to max lines', () => {
      // Add more than 20 messages
      for (let i = 0; i < 25; i++) {
        ui.log(`Message ${i}`);
      }
      expect(ui.logHistory.length).toBe(20);
      // Should have dropped the oldest messages
      expect(ui.logHistory[0]).toContain('Message 5');
      expect(ui.logHistory.at(-1)).toContain('Message 24');
    });

    it('should render when active', () => {
      ui.start();
      consoleClearSpy.mockClear();
      consoleLogSpy.mockClear();

      ui.log('Active message');
      expect(consoleClearSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should use console.log when not active', () => {
      ui.log('Inactive message');
      const lastCall = consoleLogSpy.mock.calls.at(-1);
      expect(lastCall?.[0]).toBe('Inactive message');
    });
  });

  describe('updateStatus', () => {
    it('should update status and last activity time', async () => {
      const beforeTime = ui.state.lastActivity;
      // Wait long enough to ensure timestamp changes (seconds precision)
      await new Promise((resolve) => setTimeout(resolve, 1100));
      ui.updateStatus('building');

      expect(ui.state.status).toBe('building');
      expect(ui.state.lastActivity).not.toBe(beforeTime);
    });

    it('should increment rebuild count when building', () => {
      expect(ui.state.rebuildCount).toBe(0);
      ui.updateStatus('building');
      expect(ui.state.rebuildCount).toBe(1);
      ui.updateStatus('building');
      expect(ui.state.rebuildCount).toBe(2);
    });

    it('should not increment rebuild count for other statuses', () => {
      ui.updateStatus('building');
      expect(ui.state.rebuildCount).toBe(1);
      ui.updateStatus('watching');
      expect(ui.state.rebuildCount).toBe(1);
      ui.updateStatus('error');
      expect(ui.state.rebuildCount).toBe(1);
    });

    it('should render when active', () => {
      ui.start();
      consoleClearSpy.mockClear();

      ui.updateStatus('building');
      expect(consoleClearSpy).toHaveBeenCalled();
    });

    it('should not render when not active', () => {
      consoleClearSpy.mockClear();
      ui.updateStatus('building');
      // render not called since we never started
      expect(consoleClearSpy).not.toHaveBeenCalled();
    });
  });

  describe('render', () => {
    it('should clear console', () => {
      ui.start();
      expect(consoleClearSpy).toHaveBeenCalled();
    });

    it('should render header', () => {
      ui.start();
      const calls = consoleLogSpy.mock.calls.map((call) => call[0] as string | undefined);
      expect(calls.some((text) => text?.includes('C4 DSL Builder'))).toBe(true);
    });

    it('should show no activity message when history is empty', () => {
      ui.start();
      const calls = consoleLogSpy.mock.calls.map((call) => call[0] as string | undefined);
      expect(calls.some((text) => text?.includes('No activity yet'))).toBe(true);
    });

    it('should render log history', () => {
      ui.log('Test entry 1');
      ui.log('Test entry 2');
      ui.start();

      const calls = consoleLogSpy.mock.calls.map((call) => call[0] as string | undefined);
      expect(calls.some((text) => text?.includes('Test entry 1'))).toBe(true);
      expect(calls.some((text) => text?.includes('Test entry 2'))).toBe(true);
    });

    it('should render status section with watching status in green', () => {
      ui.updateStatus('watching');
      ui.start();

      const calls = consoleLogSpy.mock.calls.map((call) => call[0] as string | undefined);
      expect(calls.some((text) => text?.includes('WATCHING'))).toBe(true);
    });

    it('should render status section with building status in yellow', () => {
      ui.updateStatus('building');
      ui.start();

      const calls = consoleLogSpy.mock.calls.map((call) => call[0] as string | undefined);
      expect(calls.some((text) => text?.includes('BUILDING'))).toBe(true);
    });

    it('should render status section with error status in red', () => {
      ui.updateStatus('error');
      ui.start();

      const calls = consoleLogSpy.mock.calls.map((call) => call[0] as string | undefined);
      expect(calls.some((text) => text?.includes('ERROR'))).toBe(true);
    });

    it('should display rebuild count', () => {
      ui.updateStatus('building');
      ui.updateStatus('building');
      ui.start();

      const calls = consoleLogSpy.mock.calls.map((call) => call[0] as string | undefined);
      expect(calls.some((text) => text?.includes('2'))).toBe(true);
    });

    it('should display server URL', () => {
      ui.start();
      const calls = consoleLogSpy.mock.calls.map((call) => call[0] as string | undefined);
      expect(calls.some((text) => text?.includes('http://localhost:3666'))).toBe(true);
    });

    it('should render help section with keyboard shortcuts', () => {
      ui.start();
      const calls = consoleLogSpy.mock.calls.map((call) => call[0] as string | undefined);
      expect(calls.some((text) => text?.includes('r'))).toBe(true);
      expect(calls.some((text) => text?.includes('q'))).toBe(true);
      expect(calls.some((text) => text?.includes('force refresh'))).toBe(true);
    });
  });
});
