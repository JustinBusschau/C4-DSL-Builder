import { vi } from 'vitest';

vi.mock('./cli/cli');

import { run } from './cli/cli.js';

describe('index entrypoint', () => {
  it('calls run() from cli', async () => {
    // Dynamically import index.js AFTER mocking
    await import('./index.js');

    expect(run).toHaveBeenCalledTimes(1);
  });
});
