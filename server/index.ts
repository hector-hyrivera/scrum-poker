import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

interface User {
  id: string;
  name: string;
  vote: string | null;
  sessionId: string;
}

interface Room {
  users: User[];
  revealed: boolean;
  history: VoteHistoryEntry[];
  currentRoundId?: string; // For custom or sequential round IDs
}

interface VoteHistoryEntry {
  id: string; // sequential or custom
  votes: { name: string; vote: string | null; sessionId: string }[];
  participants: number;
  winningCard: string;
  winnerName?: string;
  timestamp: number;
}

const rooms = new Map<string, Room>();

// --- Human-readable room ID generator ---
function generateRoomId() {
  const adjectives = ['blue', 'green', 'red', 'quick', 'brave', 'calm', 'lucky', 'bright', 'kind', 'bold'];
  const nouns = ['apple', 'tiger', 'river', 'cloud', 'mountain', 'forest', 'ocean', 'star', 'wolf', 'falcon'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(10 + Math.random() * 90); // 2-digit number
  return `${adj}-${noun}-${number}`;
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Track the room the socket is in
  socket.data.roomId = null;

  socket.on('getRoomState', (roomId: string) => {
    const room = rooms.get(roomId);
    if (room) {
      socket.emit('roomState', { users: room.users, revealed: room.revealed });
    } else {
      socket.emit('roomNotFound');
    }
  });

  socket.on('createRoom', (data: { name: string; sessionId: string }) => {
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

  // Add debugging logs to verify sessionId on the server
  socket.on('joinRoom', (data: { roomId: string; name: string; sessionId: string }) => {
    const { roomId, name, sessionId } = data;
    console.log('joinRoom called with sessionId:', sessionId, 'roomId:', roomId, 'name:', name);

    const room = rooms.get(roomId);

    if (!room) {
      socket.emit('roomNotFound');
      return;
    }

    const existingUser = room.users.find(user => user.sessionId === sessionId);
    if (existingUser) {
      console.log('Existing user found with sessionId:', sessionId);
      existingUser.id = socket.id;
      socket.join(roomId);
      socket.data.roomId = roomId; // Track the room ID
      socket.emit('userJoined', { users: room.users, revealed: room.revealed });
      socket.emit('roomState', { users: room.users, revealed: room.revealed });
      socket.emit('updateWinningVoteHistory', room.history);
      return;
    }

    console.log('No existing user found with sessionId:', sessionId);

    const nameTaken = room.users.some(user => user.name === name);
    if (nameTaken) {
      socket.emit('nameTaken');
      return;
    }

    const user: User = { id: socket.id, name, vote: null, sessionId };
    room.users.push(user);
    socket.join(roomId);
    socket.data.roomId = roomId; // Track the room ID
    io.to(roomId).emit('userJoined', { users: room.users, revealed: room.revealed });
    socket.emit('roomState', { users: room.users, revealed: room.revealed });
    socket.emit('updateWinningVoteHistory', room.history);
  });

  socket.on('vote', (data: { roomId: string; vote: string }) => {
    const { roomId, vote } = data;
    const room = rooms.get(roomId);

    if (!room) {
      socket.emit('roomNotFound');
      return;
    }

    const userIndex = room.users.findIndex(user => user.id === socket.id);
    if (userIndex !== -1) {
      room.users[userIndex].vote = vote;
      io.to(roomId).emit('userVoted', { users: room.users, revealed: room.revealed });
    }
  });

  // Accept optional roundId for custom/sequential vote round naming
  socket.on('reveal', (data: { roomId: string; roundId?: string }) => {
    const { roomId, roundId } = typeof data === 'string' ? { roomId: data, roundId: undefined } : data;
    const room = rooms.get(roomId);

    if (!room) {
      socket.emit('roomNotFound');
      return;
    }

    room.revealed = true;
    const votes = room.users.map(user => user.vote).filter(vote => vote !== null);
    if (votes.length > 0) {
      const counts = votes.reduce((acc: Record<string, number>, vote) => {
        acc[vote!] = (acc[vote!] || 0) + 1;
        return acc;
      }, {});
      const winningCard = Object.keys(counts).reduce((a, b) => (counts[a] > counts[b] ? a : b));
      const winner = room.users.find(user => user.vote === winningCard);
      // Use custom or sequential round id
      const id = roundId || String(room.history.length + 1);
      const historyEntry: VoteHistoryEntry = {
        id,
        votes: room.users.map(u => ({ name: u.name, vote: u.vote, sessionId: u.sessionId })),
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

  // Reset round, but keep history
  socket.on('reset', (roomId: string) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('roomNotFound');
      return;
    }
    room.revealed = false;
    room.users = room.users.map(user => ({ ...user, vote: null }));
    // Do not clear history here
    io.to(roomId).emit('votesReset', { users: room.users, revealed: room.revealed });
  });

  // Modify the disconnect logic to prevent deleting the room if there is only one user refreshing
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const roomId = socket.data.roomId;

    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        const initialUserCount = room.users.length;
        room.users = room.users.filter(user => user.id !== socket.id);

        if (room.users.length < initialUserCount) {
          if (room.users.length === 0) {
            // Delay room deletion to allow for potential reconnection
            setTimeout(() => {
              const currentRoom = rooms.get(roomId);
              if (currentRoom && currentRoom.users.length === 0) {
                rooms.delete(roomId);
                console.log(`Room ${roomId} deleted as it's empty.`);
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
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});