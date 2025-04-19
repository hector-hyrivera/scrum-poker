import { io, Socket } from 'socket.io-client';
import { getSocketUrl } from './env';

/**
 * Represents a user in a room.
 */
export interface User {
  /**
   * Unique user ID.
   */
  id: string;
  /**
   * User's name.
   */
  name: string;
  /**
   * User's current vote, or null if not voted.
   */
  vote: string | null;
  /**
   * User's session ID.
   */
  sessionId: string;
}

/**
 * Represents the state of a room.
 */
export interface RoomState {
  /**
   * List of users in the room.
   */
  users: User[];
  /**
   * Whether votes are currently revealed.
   */
  revealed: boolean;
  /**
   * History of winning votes.
   */
  winningVoteHistory: string[];
}

const socketUrl = getSocketUrl();

/**
 * Socket instance for real-time communication.
 */
const socket: Socket = io(socketUrl, {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  path: '/socket.io/',
});

// Modify the reconnect logic to handle the case where the room no longer exists
socket.on('connect', () => {
  console.log('Socket connected with ID:', socket.id);

  const roomId = localStorage.getItem('roomId');
  const sessionId = getSessionId(); // Ensure sessionId is always retrieved or generated
  const name = localStorage.getItem('name');

  console.log('Reconnecting with sessionId:', sessionId, 'roomId:', roomId, 'name:', name);

  if (roomId && sessionId && name) {
    socket.emit('joinRoom', { roomId, name, sessionId });

    socket.once('roomNotFound', () => {
      console.log('Room not found. Clearing roomId from localStorage.');
      localStorage.removeItem('roomId');
      // Optionally, redirect the user to the home page or show a message
    });
  }
});

socket.on('disconnect', () => {
  console.log('Socket disconnected');
  // Optionally handle cleanup or reconnection logic here
});

socket.on('connect_error', (error: unknown) => {
  console.error('Socket connection error:', error);
});

/**
 * Returns the session ID from localStorage, generating a new one if necessary.
 * @returns {string}
 */
const getSessionId = (): string => {
  let sessionId = localStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 15);
    localStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
};

/**
 * Creates a new room and returns the room ID and session ID.
 * @param name - The user's name
 * @returns Promise resolving to roomId and sessionId
 */
export const createRoom = (name: string): Promise<{ roomId: string; sessionId: string }> => {
  return new Promise((resolve) => {
    const sessionId = getSessionId();
    socket.emit('createRoom', { name, sessionId });
    socket.once('roomCreated', (data: { roomId: string; sessionId: string }) => {
      localStorage.setItem('roomId', data.roomId); // Store roomId in localStorage
      localStorage.setItem('name', name); // Store name in localStorage
      resolve(data);
    });
  });
};

/**
 * Joins a room and returns the room state.
 * @param roomId - The room to join
 * @param name - The user's name
 * @returns Promise resolving to RoomState
 */
export const joinRoom = (roomId: string, name: string): Promise<RoomState> => {
  return new Promise((resolve, reject) => {
    const sessionId = getSessionId();
    socket.emit('joinRoom', { roomId, name, sessionId });
    socket.once('userJoined', (state: RoomState) => {
      localStorage.setItem('roomId', roomId); // Store roomId in localStorage
      localStorage.setItem('name', name); // Store name in localStorage
      resolve(state);
    });
    socket.once('roomNotFound', () => {
      reject(new Error('Room not found'));
    });
    socket.once('nameTaken', () => {
      reject(new Error('Name is already taken in this room'));
    });
  });
};

/**
 * Casts a vote in the specified room.
 * @param roomId - The room ID
 * @param vote - The vote value
 */
export const vote = (roomId: string, vote: string): void => {
  socket.emit('vote', { roomId, vote });
};

/**
 * Reveals votes in the specified room.
 * @param roomId - The room ID
 */
export const revealVotes = (roomId: string): void => {
  socket.emit('reveal', roomId);
};

/**
 * Resets votes in the specified room.
 * @param roomId - The room ID
 */
export const resetVotes = (roomId: string): void => {
  socket.emit('reset', roomId);
};

/**
 * Registers a callback for the 'userJoined' event.
 * @param callback - Callback with RoomState
 */
export const onUserJoined = (callback: (state: RoomState) => void): void => {
  socket.on('userJoined', callback);
};

/**
 * Registers a callback for the 'userVoted' event.
 * @param callback - Callback with RoomState
 */
export const onUserVoted = (callback: (state: RoomState) => void): void => {
  socket.on('userVoted', callback);
};

/**
 * Registers a callback for the 'votesRevealed' event.
 * @param callback - Callback function
 */
export const onVotesRevealed = (callback: () => void): void => {
  socket.on('votesRevealed', callback);
};

/**
 * Registers a callback for the 'votesReset' event.
 * @param callback - Callback function
 */
export const onVotesReset = (callback: () => void): void => {
  socket.on('votesReset', callback);
};

/**
 * Registers a callback for the 'roomNotFound' event.
 * @param callback - Callback function
 */
export const onRoomNotFound = (callback: () => void): void => {
  socket.on('roomNotFound', callback);
};

/**
 * Cleans up all socket event listeners.
 */
export const cleanup = (): void => {
  socket.off('userJoined');
  socket.off('userVoted');
  socket.off('votesRevealed');
  socket.off('votesReset');
  socket.off('roomNotFound');
  socket.off('roomCreated');
  socket.off('connect');
  socket.off('disconnect');
  socket.off('connect_error');
};

/**
 * Calculates and updates the winning vote(s) for the current room state.
 */
const calculateWinningVotes = (): void => {
  socket.emit('getRoomState', (state: RoomState) => {
    const voteCounts: Record<string, number> = {};

    state.users.forEach((user) => {
      if (user.vote) {
        voteCounts[user.vote] = (voteCounts[user.vote] || 0) + 1;
      }
    });

    const maxVotes = Math.max(...Object.values(voteCounts));
    const winningVotes = Object.keys(voteCounts).filter(
      (vote) => voteCounts[vote] === maxVotes
    );

    socket.emit('updateWinningVoteHistory', winningVotes);
  });
};

// Update the onVotesRevealed event to include logic for tracking the winning vote
socket.on('votesRevealed', () => {
  calculateWinningVotes();
});

export { socket };