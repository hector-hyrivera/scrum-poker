import { io, Socket } from 'socket.io-client';

export interface User {
  id: string;
  name: string;
  vote: string | null;
  sessionId: string;
}

export interface RoomState {
  users: User[];
  revealed: boolean;
  winningVoteHistory: string[]; // New property to track winning vote history
}

const socket: Socket = io(window.location.origin, {
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

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error);
});

const getSessionId = () => {
  let sessionId = localStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
};

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

export const vote = (roomId: string, vote: string): void => {
  socket.emit('vote', { roomId, vote });
};

export const revealVotes = (roomId: string): void => {
  socket.emit('reveal', roomId);
};

export const resetVotes = (roomId: string): void => {
  socket.emit('reset', roomId);
};

export const onUserJoined = (callback: (state: RoomState) => void): void => {
  socket.on('userJoined', callback);
};

export const onUserVoted = (callback: (state: RoomState) => void): void => {
  socket.on('userVoted', callback);
};

export const onVotesRevealed = (callback: () => void): void => {
  socket.on('votesRevealed', callback);
};

export const onVotesReset = (callback: () => void): void => {
  socket.on('votesReset', callback);
};

export const onRoomNotFound = (callback: () => void): void => {
  socket.on('roomNotFound', callback);
};

export const cleanup = (): void => {
  socket.off('userJoined');
  socket.off('userVoted');
  socket.off('votesRevealed');
  socket.off('votesReset');
  socket.off('roomNotFound');
};

// Update the onVotesRevealed event to include logic for tracking the winning vote
socket.on('votesRevealed', () => {
  calculateWinningVotes();
});

// Function to calculate winning votes based on current room state
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

export { socket };