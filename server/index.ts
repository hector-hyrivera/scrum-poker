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
}

const rooms = new Map<string, Room>();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('createRoom', (data: { name: string; sessionId: string }) => {
    const { name, sessionId } = data;
    const roomId = Math.random().toString(36).substring(2, 8);
    const user: User = { id: socket.id, name, vote: null, sessionId };
    const room: Room = { users: [user], revealed: false };
    rooms.set(roomId, room);
    socket.join(roomId);
    socket.emit('roomCreated', { roomId, sessionId });
    io.to(roomId).emit('userJoined', { users: room.users, revealed: room.revealed });
  });

  socket.on('joinRoom', (data: { roomId: string; name: string; sessionId: string }) => {
    const { roomId, name, sessionId } = data;
    const room = rooms.get(roomId);

    if (!room) {
      socket.emit('roomNotFound');
      return;
    }

    // Check if user with same session ID already exists
    const existingUser = room.users.find(user => user.sessionId === sessionId);
    if (existingUser) {
      // Update socket ID for reconnecting user
      existingUser.id = socket.id;
      socket.join(roomId);
      socket.emit('userJoined', { users: room.users, revealed: room.revealed });
      return;
    }

    // Check if name is already taken
    const nameTaken = room.users.some(user => user.name === name);
    if (nameTaken) {
      socket.emit('nameTaken');
      return;
    }

    const user: User = { id: socket.id, name, vote: null, sessionId };
    room.users.push(user);
    socket.join(roomId);
    io.to(roomId).emit('userJoined', { users: room.users, revealed: room.revealed });
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

  socket.on('reveal', (roomId: string) => {
    const room = rooms.get(roomId);

    if (!room) {
      socket.emit('roomNotFound');
      return;
    }

    room.revealed = true;
    io.to(roomId).emit('votesRevealed');
  });

  socket.on('reset', (roomId: string) => {
    const room = rooms.get(roomId);

    if (!room) {
      socket.emit('roomNotFound');
      return;
    }

    // Reset all votes to null and set revealed to false
    room.revealed = false;
    room.users = room.users.map(user => ({ ...user, vote: null }));
    
    // Emit the updated state to all clients in the room
    io.to(roomId).emit('userJoined', { users: room.users, revealed: room.revealed });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Remove user from all rooms they were in
    rooms.forEach((room, roomId) => {
      const userIndex = room.users.findIndex(user => user.id === socket.id);
      if (userIndex !== -1) {
        room.users.splice(userIndex, 1);
        io.to(roomId).emit('userJoined', { users: room.users, revealed: room.revealed });
      }
    });
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 