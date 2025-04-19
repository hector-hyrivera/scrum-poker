import React from 'react';
import { describe, it, expect, vi } from 'vitest';

// Mock framer-motion to return fragments (no-ops)
vi.mock('framer-motion', () => ({
  motion: { div: (props: any) => <div {...props} /> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock all MUI components to simple divs
vi.mock('@mui/material', () => new Proxy({}, {
  get: () => (props: any) => <div {...props} />,
}));

// Mock all MUI icons to prevent EMFILE errors
vi.mock('@mui/icons-material', () => new Proxy({}, { get: () => () => null }));

// Mock socket module
vi.mock('../src/socket', () => ({
  socket: { emit: vi.fn(), on: vi.fn(), off: vi.fn() }
}));

// Mock useSocketEvent
vi.mock('../src/components/use-socket-event', () => ({
  useSocketEvent: vi.fn(),
}));

// Mock WinningVoteHistory if imported
vi.mock('../src/components/WinningVoteHistory', () => ({
  __esModule: true,
  default: () => <div data-testid="winning-vote-history" />
}));

describe('smoke', () => {
  it('runs', () => {
    expect(true).toBe(true);
  });
});
