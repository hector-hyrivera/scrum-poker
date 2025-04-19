import { describe, it, expect } from 'vitest';
import { getSocketUrl } from '../src/env';

describe('env', () => {
  it('should return a default socket URL', () => {
    expect(getSocketUrl()).toBe('http://localhost:3001');
  });
});
