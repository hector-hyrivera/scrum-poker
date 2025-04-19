import { describe, it, expect } from 'vitest';
import { useSocketEvent } from '../src/components/use-socket-event';

describe('useSocketEvent', () => {
  it('should be defined', () => {
    expect(useSocketEvent).toBeDefined();
  });
});
