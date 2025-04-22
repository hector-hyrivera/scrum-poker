import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import pino from 'pino';
import compression from 'compression';

const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' });

const app = express();
app.use(compression());
const httpServer = createServer(app);
httpServer.keepAliveTimeout = 60000; // 60 seconds, adjust as needed
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

/**
 * Represents a user in a room.
 */
interface User {
  /** Unique user ID (socket.id). */
  id: string;
  /** User's display name. */
  name: string;
  /** User's current vote, or null if not voted. */
  vote: string | null;
  /** User's session ID for reconnection. */
  sessionId: string;
}

/**
 * Represents a SCRUM Poker room.
 */
interface Room {
  /** List of users in the room. */
  users: User[];
  /** Whether votes are currently revealed. */
  revealed: boolean;
  /** History of winning votes for each round. */
  history: VoteHistoryEntry[];
  /** Optional custom or sequential round ID. */
  currentRoundId?: string;
}

/**
 * Represents a single entry in the vote history.
 */
interface VoteHistoryEntry {
  /** Round identifier (custom or sequential). */
  id: string;
  /** Array of votes for the round. */
  votes: { name: string; vote: string | null; sessionId: string }[];
  /** Number of participants in the round. */
  participants: number;
  /** The winning card value. */
  winningCard: string;
  /** Name of the winning participant (if any). */
  winnerName?: string;
  /** Timestamp of the round. */
  timestamp: number;
}

const rooms = new Map<string, Room>();

/**
 * Generates a human-readable room ID (e.g., blue-apple-42).
 * @returns {string} The generated room ID.
 */
function generateRoomId(): string {
  const adjectives = ['blue', 'green', 'red', 'quick', 'brave', 'calm', 'lucky', 'bright', 'kind', 'bold'];
  const nouns = ['apple', 'tiger', 'river', 'cloud', 'mountain', 'forest', 'ocean', 'star', 'wolf', 'falcon'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(10 + Math.random() * 90); // 2-digit number
  return `${adj}-${noun}-${number}`;
}

io.on('connection', (socket): void => {
  logger.info(`User connected: ${socket.id}`);
  socket.data.roomId = null;

  /**
   * Handles getting the current room state.
   */
  socket.on('getRoomState', async (roomId: string): Promise<void> => {
    const room = rooms.get(roomId);
    if (room) {
      socket.emit('roomState', { users: room.users, revealed: room.revealed });
    } else {
      socket.emit('roomNotFound');
    }
  });

  /**
   * Handles room creation.
   */
  socket.on('createRoom', async (data: { name: string; sessionId: string }): Promise<void> => {
    const { name, sessionId } = data;
    const roomId = generateRoomId();
    const user: User = { id: socket.id, name, vote: null, sessionId };
    const room: Room = { users: [user], revealed: false, history: [] };
    rooms.set(roomId, room);
    socket.join(roomId);
    socket.data.roomId = roomId; // Track the room ID
    socket.emit('roomCreated', { roomId, sessionId });
    io.to(roomId).emit('userJoined', { users: room.users, revealed: room.revealed });
  });

  /**
   * Handles joining a room.
   */
  socket.on('joinRoom', async (data: { roomId: string; name: string; sessionId: string }): Promise<void> => {
    const { roomId, name, sessionId } = data;
    logger.info({ sessionId, roomId, name }, 'joinRoom called');
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('roomNotFound');
      return;
    }
    const existingUser = room.users.find((user: User) => user.sessionId === sessionId);
    if (existingUser) {
      logger.info({ sessionId }, 'Existing user found');
      existingUser.id = socket.id;
      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.emit('userJoined', { users: room.users, revealed: room.revealed });
      socket.emit('roomState', { users: room.users, revealed: room.revealed });
      socket.emit('updateWinningVoteHistory', room.history);
      return;
    }
    const user: User = { id: socket.id, name, vote: null, sessionId };
    room.users.push(user);
    socket.join(roomId);
    socket.data.roomId = roomId;
    io.to(roomId).emit('userJoined', { users: room.users, revealed: room.revealed });
    socket.emit('roomState', { users: room.users, revealed: room.revealed });
    socket.emit('updateWinningVoteHistory', room.history);
  });

  /**
   * Handles voting in a room.
   */
  socket.on('vote', async (data: { roomId: string; vote: string }): Promise<void> => {
    const { roomId, vote } = data;
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('roomNotFound');
      return;
    }
    const userIndex = room.users.findIndex((user: User) => user.id === socket.id);
    if (userIndex !== -1) {
      room.users[userIndex].vote = vote;
      io.to(roomId).emit('userVoted', { users: room.users, revealed: room.revealed });
    }
  });

  /**
   * Handles revealing votes for a round.
   */
  socket.on('reveal', async (data: { roomId: string; roundId?: string } | string): Promise<void> => {
    const { roomId, roundId } = typeof data === 'string' ? { roomId: data, roundId: undefined } : data;
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('roomNotFound');
      return;
    }
    room.revealed = true;
    const votes = room.users.map((user: User) => user.vote).filter((vote: string | null): vote is string => vote !== null);
    if (votes.length > 0) {
      const counts = votes.reduce((acc: Record<string, number>, vote: string) => {
        acc[vote] = (acc[vote] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const winningCard = Object.keys(counts).reduce((a, b) => (counts[a] > counts[b] ? a : b));
      const winner = room.users.find((user: User) => user.vote === winningCard);
      // Use custom or sequential round id
      const id = roundId || String(room.history.length + 1);
      const historyEntry: VoteHistoryEntry = {
        id,
        votes: room.users.map((u: User) => ({ name: u.name, vote: u.vote, sessionId: u.sessionId })),
        participants: room.users.length,
        winningCard,
        winnerName: winner?.name,
        timestamp: Date.now(),
      };
      room.history.push(historyEntry);
      io.to(roomId).emit('updateWinningVoteHistory', room.history);
    }
    io.to(roomId).emit('userJoined', { users: room.users, revealed: room.revealed });
  });

  /**
   * Handles resetting votes for a round (does not clear history).
   */
  socket.on('reset', async (roomId: string): Promise<void> => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('roomNotFound');
      return;
    }
    room.revealed = false;
    room.users = room.users.map((user: User) => ({ ...user, vote: null }));
    // Do not clear history here
    io.to(roomId).emit('votesReset', { users: room.users, revealed: room.revealed });
  });

  /**
   * Handles user disconnection and room cleanup.
   */
  socket.on('disconnect', (): void => {
    logger.info(`User disconnected: ${socket.id}`);
    const roomId = socket.data.roomId;
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        const initialUserCount = room.users.length;
        room.users = room.users.filter((user: User) => user.id !== socket.id);
        if (room.users.length < initialUserCount) {
          if (room.users.length === 0) {
            setTimeout((): void => {
              const currentRoom = rooms.get(roomId);
              if (currentRoom && currentRoom.users.length === 0) {
                rooms.delete(roomId);
                logger.info(`Room ${roomId} deleted as it's empty.`);
              }
            }, 5000); // 5-second delay to allow for reconnection
          } else {
            io.to(roomId).emit('userJoined', { users: room.users, revealed: room.revealed });
          }
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, (): void => {
  logger.info(`Server running on port ${PORT}`);
});