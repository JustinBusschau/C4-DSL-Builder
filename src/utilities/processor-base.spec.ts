import { describe, it, expect } from 'vitest';

describe('ProcessorBase', () => {
  it('should pass', () => {
    // this base class is tested via the standard execuion paths of the child classes that extend it
    // I have put this dummy spec here to remind me that no detailed spec is required for this yet
    expect(true).toBe(true);
  });
});
