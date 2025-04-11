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
}

const socket: Socket = io('http://localhost:3001', {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

socket.on('connect', () => {
  console.log('Socket connected with ID:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Socket disconnected');
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
      resolve(data);
    });
  });
};

export const joinRoom = (roomId: string, name: string): Promise<RoomState> => {
  return new Promise((resolve, reject) => {
    const sessionId = getSessionId();
    socket.emit('joinRoom', { roomId, name, sessionId });
    socket.once('userJoined', (state: RoomState) => {
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

export { socket }; 