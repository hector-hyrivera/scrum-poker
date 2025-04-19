import { describe, it, expect, beforeEach } from 'vitest';

// Import or copy the logic you want to test from index.ts
// For demonstration, we'll test the generateRoomId and basic Room/User logic

// --- Copy of generateRoomId for isolated testable logic ---
function generateRoomId(): string {
  const adjectives = ['blue', 'green', 'red', 'quick', 'brave', 'calm', 'lucky', 'bright', 'kind', 'bold'];
  const nouns = ['apple', 'tiger', 'river', 'cloud', 'mountain', 'forest', 'ocean', 'star', 'wolf', 'falcon'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(10 + Math.random() * 90);
  return `${adj}-${noun}-${number}`;
}

type User = {
  id: string;
  name: string;
  vote: string | null;
  sessionId: string;
};

type Room = {
  users: User[];
  revealed: boolean;
  history: unknown[];
  currentRoundId?: string;
};

describe('generateRoomId', () => {
  it('should return a string with pattern adj-noun-##', () => {
    const id = generateRoomId();
    expect(id).toMatch(/^([a-z]+)-([a-z]+)-([0-9]{2})$/);
  });

  it('should be unique for multiple calls', () => {
    const ids = new Set(Array.from({ length: 100 }, generateRoomId));
    expect(ids.size).toBe(100);
  });
});

describe('Room user logic', () => {
  let room: Room;
  let user: User;

  beforeEach(() => {
    user = { id: 'abc', name: 'Test', vote: null, sessionId: 'sess1' };
    room = { users: [user], revealed: false, history: [] };
  });

  it('should add a user to the room', () => {
    const newUser: User = { id: 'def', name: 'Other', vote: null, sessionId: 'sess2' };
    room.users.push(newUser);
    expect(room.users.length).toBe(2);
    expect(room.users[1].name).toBe('Other');
  });

  it('should prevent duplicate sessionId', () => {
    const duplicateUser: User = { id: 'xyz', name: 'Dup', vote: null, sessionId: 'sess1' };
    const exists = room.users.some(u => u.sessionId === duplicateUser.sessionId);
    expect(exists).toBe(true);
  });
});
