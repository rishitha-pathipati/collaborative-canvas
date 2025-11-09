// server/server.js (CommonJS)
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      'https://collaborative-canvas-eta.vercel.app', // frontend URL (Vercel)
      'http://localhost:5173', // local dev (optional)
      'http://localhost:3000'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// In-memory room state
// rooms[roomId] = { users: Map(userId -> {id,name,socketId}), ops: [op], undoStack: [op] }
const rooms = {};

io.on('connection', (socket) => {
  console.log('✅ New connection:', socket.id);

  socket.on('join', ({ roomId, userId, name }) => {
    if (!roomId || !userId) return;
    socket.join(roomId);

    if (!rooms[roomId]) rooms[roomId] = { users: new Map(), ops: [], undoStack: [] };
    rooms[roomId].users.set(userId, { id: userId, name, socketId: socket.id });

    console.log(`${name} (${userId}) joined room ${roomId}`);

    // Broadcast updated user list
    const usersArr = Array.from(rooms[roomId].users.values()).map(u => ({ id: u.id, name: u.name }));
    io.to(roomId).emit('users', usersArr);

    // Send current canvas state to new user
    socket.emit('initial-state', { ops: rooms[roomId].ops });
  });

  socket.on('draw', ({ roomId, op }) => {
    if (!roomId || !op || !rooms[roomId]) return;
    rooms[roomId].ops.push(op);
    rooms[roomId].undoStack = []; // clear redo stack
    // send to others in room
    socket.to(roomId).emit('draw', op);
  });

  socket.on('undo', ({ roomId }) => {
    const r = rooms[roomId];
    if (!r || r.ops.length === 0) return;
    const last = r.ops.pop();
    r.undoStack.push(last);
    // broadcast full updated state to everyone in room
    io.to(roomId).emit('initial-state', { ops: r.ops });
  });

  socket.on('redo', ({ roomId }) => {
    const r = rooms[roomId];
    if (!r || r.undoStack.length === 0) return;
    const op = r.undoStack.pop();
    r.ops.push(op);
    io.to(roomId).emit('initial-state', { ops: r.ops });
  });

  socket.on('request-state', ({ roomId }) => {
    const r = rooms[roomId];
    socket.emit('initial-state', { ops: r ? r.ops : [] });
  });

  socket.on('disconnect', () => {
    // Remove disconnected user from any room they were in
    for (const [roomId, r] of Object.entries(rooms)) {
      let changed = false;
      for (const [uid, u] of r.users) {
        if (u.socketId === socket.id) {
          r.users.delete(uid);
          changed = true;
          console.log(`User ${u.name} (${uid}) left room ${roomId}`);
          break;
        }
      }
      if (changed) {
        io.to(roomId).emit('users', Array.from(r.users.values()).map(u => ({ id: u.id, name: u.name })));
      }
    }
  });
});

app.get('/', (req, res) => res.send('Server is live 🚀'));

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));
