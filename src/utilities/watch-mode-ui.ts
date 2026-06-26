import chalk from 'chalk';
import { CliLogger } from './cli-logger.js';

interface WatchModeState {
  status: 'watching' | 'building' | 'error';
  rebuildCount: number;
  port: number;
  lastActivity: string;
}

export class WatchModeUI {
  private logger: CliLogger;
  private state: WatchModeState;
  private logHistory: string[] = [];
  private readonly maxLogLines = 20;
  private isActive = false;
  private stdin: typeof process.stdin;

  constructor(port: number, logger: CliLogger) {
    this.logger = logger;
    this.state = {
      status: 'watching',
      rebuildCount: 0,
      port,
      lastActivity: new Date().toLocaleTimeString(),
    };
    this.stdin = process.stdin;
  }

  start(): void {
    this.isActive = true;
    this.setupInputHandling();
    this.render();
  }

  stop(): void {
    this.isActive = false;
    if (this.stdin.isTTY) {
      this.stdin.setRawMode(false);
      this.stdin.pause();
    }
    console.clear();
  }

  private setupInputHandling(): void {
    if (!this.stdin.isTTY) {
      return;
    }
    this.stdin.setRawMode(true);
    this.stdin.resume();
    this.stdin.setEncoding('utf8');

    this.stdin.on('data', (key: string) => {
      if (key === 'q' || key === '\u0003') {
        // q or Ctrl+C
        this.log(chalk.yellow('\nStopping watch mode...'));
        this.stop();
        process.exit(0);
      } else if (key === 'r') {
        const result = this.onRebuildRequest?.();
        if (result instanceof Promise) {
          result.catch((err) => this.logger.error('Rebuild failed', err));
        }
      }
    });
  }

  onRebuildRequest?: () => void | Promise<void>;

  log(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    this.logHistory.push(`[${timestamp}] ${message}`);

    if (this.logHistory.length > this.maxLogLines) {
      this.logHistory.shift();
    }

    if (this.isActive) {
      this.render();
    } else {
      console.log(message);
    }
  }

  updateStatus(status: WatchModeState['status']): void {
    this.state.status = status;
    this.state.lastActivity = new Date().toLocaleTimeString();
    if (status === 'building') {
      this.state.rebuildCount++;
    }
    if (this.isActive) {
      this.render();
    }
  }

  private render(): void {
    // Clear screen and move to top
    console.clear();

    // Header
    console.log(chalk.bold.cyan('═'.repeat(60)));
    console.log(chalk.bold.cyan('  C4 DSL Builder - Watch Mode'));
    console.log(chalk.bold.cyan('═'.repeat(60)));
    console.log();

    // Log history section
    console.log(chalk.bold('Recent Activity:'));
    console.log(chalk.gray('─'.repeat(60)));

    if (this.logHistory.length === 0) {
      console.log(chalk.gray('  (No activity yet)'));
    } else {
      this.logHistory.forEach((line) => {
        console.log(`  ${line}`);
      });
    }

    // Fill remaining log space
    const emptyLines = this.maxLogLines - this.logHistory.length;
    for (let i = 0; i < emptyLines; i++) {
      console.log();
    }

    console.log(chalk.gray('─'.repeat(60)));
    console.log();

    // Status section
    console.log(chalk.bold('Status:'));
    const statusColor = this.state.status === 'watching'
      ? chalk.green
      : this.state.status === 'building'
        ? chalk.yellow
        : chalk.red;

    console.log(`  Status:      ${statusColor(this.state.status.toUpperCase())}`);
    console.log(`  Rebuilds:    ${chalk.cyan(this.state.rebuildCount.toString())}`);
    console.log(`  Last update: ${chalk.gray(this.state.lastActivity)}`);
    console.log(`  Server:      ${chalk.cyan(`http://localhost:${this.state.port}`)}`);
    console.log();

    // Help section
    console.log(chalk.bold.cyan('─'.repeat(60)));
    console.log(
      chalk.gray('Press ') +
      chalk.bold.white('r') +
      chalk.gray(' to force refresh, ') +
      chalk.bold.white('q') +
      chalk.gray(' to stop')
    );
    console.log(chalk.bold.cyan('─'.repeat(60)));
  }
}
