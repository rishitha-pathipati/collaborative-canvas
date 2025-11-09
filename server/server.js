// server/server.js — FINAL STABLE VERSION

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "https://collaborative-canvas-eta.vercel.app", // your Vercel frontend
      "http://localhost:5500", // for local dev (optional)
    ],
    methods: ["GET", "POST"],
  },
});

// In-memory storage for rooms and drawings
const rooms = {}; // { roomId: { users: Map(), ops: [], undoStack: [] } }

io.on("connection", (socket) => {
  console.log("✅ New connection:", socket.id);

  // When a user joins a room
  socket.on("join", ({ roomId, userId, name }) => {
    if (!roomId) return;
    socket.join(roomId);

    if (!rooms[roomId]) rooms[roomId] = { users: new Map(), ops: [], undoStack: [] };

    rooms[roomId].users.set(userId, { id: userId, name, socketId: socket.id });

    console.log(`${name} joined room ${roomId}`);

    // Send user list to everyone in room
    const usersArray = Array.from(rooms[roomId].users.values()).map((u) => ({
      id: u.id,
      name: u.name,
    }));
    io.to(roomId).emit("users", usersArray);

    // Send existing drawing ops to new user
    if (rooms[roomId].ops.length > 0) {
      socket.emit("initial-state", { ops: rooms[roomId].ops });
    }
  });

  // Handle drawing events
  socket.on("draw", ({ roomId, op }) => {
    if (!roomId || !op) return;
    if (!rooms[roomId]) return;

    rooms[roomId].ops.push(op);
    rooms[roomId].undoStack = []; // clear redo stack
    socket.to(roomId).emit("draw", { op });
  });

  // Handle undo (global)
  socket.on("undo", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || room.ops.length === 0) return;

    const lastOp = room.ops.pop();
    room.undoStack.push(lastOp);

    // Broadcast undo to everyone
    io.to(roomId).emit("undo", { op: lastOp });
  });

  // Handle redo (global)
  socket.on("redo", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || room.undoStack.length === 0) return;

    const redoOp = room.undoStack.pop();
    room.ops.push(redoOp);
    io.to(roomId).emit("redo", { op: redoOp });
  });

  // Send full state when requested
  socket.on("request-state", ({ roomId }) => {
    const room = rooms[roomId];
    socket.emit("initial-state", { ops: room ? room.ops : [] });
  });

  // Handle disconnects
  socket.on("disconnect", () => {
    for (const [roomId, room] of Object.entries(rooms)) {
      for (const [userId, user] of room.users) {
        if (user.socketId === socket.id) {
          room.users.delete(userId);
          io.to(roomId).emit(
            "users",
            Array.from(room.users.values()).map((u) => ({ id: u.id, name: u.name }))
          );
          console.log(`${user.name} left room ${roomId}`);
          break;
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
