import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import WinningVoteHistory from '../src/components/WinningVoteHistory';

afterEach(() => {
  cleanup();
});

describe('WinningVoteHistory', () => {
  it('renders without crashing', () => {
    const { container } = render(<WinningVoteHistory />);
    expect(container).toBeDefined();
  });
});
